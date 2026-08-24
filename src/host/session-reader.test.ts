import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zstdCompressSync } from "node:zlib";
import { readAllUsageEvents, readLiveUsageEvents } from "./session-reader.js";

function makeEvent(type: string, seq: number, time: number, data: any = {}) {
  return { type, seq, time, data };
}

function writeSession(root: string, ws: string, sid: string, events: any[]) {
  const dir = join(root, ws, sid);
  mkdirSync(dir, { recursive: true });
  const lines = [JSON.stringify({ type: "session", version: 0, id: sid, createdAt: Date.now() })];
  for (const ev of events) lines.push(JSON.stringify(ev));
  writeFileSync(join(dir, "session.jsonl.zstd"), zstdCompressSync(Buffer.from(lines.join("\n") + "\n")));
}

describe("readAllUsageEvents", () => {
  let home: string;
  afterEach(() => {
    if (home) rmSync(home, { recursive: true, force: true });
    home = "";
  });

  it("reads usage from ALL sessions on disk (old + new), not only live ones", async () => {
    home = mkdtempSync(join(tmpdir(), "heatmap-sess-"));
    const root = join(home, ".dsh", "sessions");
    const t0 = Date.UTC(2026, 7, 1, 8, 0, 0);

    // Old session A: only on disk, NOT live in ctx.sessions
    writeSession(root, "--ws--", "old-session-a", [
      makeEvent("request/header", 0, t0, { header: { config: { provider: "pA", model: "mA" } } }),
      makeEvent("assistant/message", 1, t0 + 1000, {
        message: { source: { provider: "pA", model: "mA" } },
        usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 50 },
        turn: 1, step: 1,
      }),
    ]);
    // Old session B: only on disk, NOT live in ctx.sessions
    writeSession(root, "--ws--", "old-session-b", [
      makeEvent("assistant/message", 1, t0 + 2000, {
        message: { source: { provider: "pB", model: "mB" } },
        usage: { inputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 60 },
        turn: 1, step: 1,
      }),
    ]);
    // New session C: on disk (seq 1 flushed) AND live, with an extra in-memory tail (seq 2) not yet flushed
    writeSession(root, "--ws--", "new-session-c", [
      makeEvent("assistant/message", 1, t0 + 3000, {
        message: { source: { provider: "pC", model: "mC" } },
        usage: { inputTokens: 300, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 70 },
        turn: 1, step: 1,
      }),
    ]);

    const liveC = {
      id: "new-session-c",
      events: [
        makeEvent("assistant/message", 1, t0 + 3000, {
          message: { source: { provider: "pC", model: "mC" } },
          usage: { inputTokens: 300, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 70 },
          turn: 1, step: 1,
        }),
        makeEvent("assistant/message", 2, t0 + 4000, {
          message: { source: { provider: "pC", model: "mC" } },
          usage: { inputTokens: 400, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 80 },
          turn: 2, step: 1,
        }),
      ],
    };
    // Simulate the real dsh: list() only returns the LIVE session, old ones are absent.
    const ctx = { sessions: { list: async () => [liveC] } };

    const prevHome = process.env.HOME;
    process.env.HOME = home;
    try {
      const out = await readAllUsageEvents(ctx as any);
      // A + B + C(turn1, from disk deduped with live seq1) + C(turn2, live-only tail) = 4
      expect(out.length).toBe(4);

      const byKey = new Map(out.map((e) => [`${e.provider}/${e.model}`, e.usage.inputTokens]));
      expect(byKey.get("pA/mA")).toBe(100); // old session A read from disk
      expect(byKey.get("pB/mB")).toBe(200); // old session B read from disk

      // Session C: turn1 (300, from disk, deduped with live seq1) + turn2 (400, live-only tail, not on disk)
      const cInputs = out.filter((e) => e.model === "mC").map((e) => e.usage.inputTokens).sort((a, b) => a - b);
      expect(cInputs).toEqual([300, 400]);
    } finally {
      process.env.HOME = prevHome;
    }
  });

  it("returns empty when no sessions exist", async () => {
    home = mkdtempSync(join(tmpdir(), "heatmap-sess-"));
    const prevHome = process.env.HOME;
    process.env.HOME = home;
    try {
      const out = await readAllUsageEvents({ sessions: { list: async () => [] } } as any);
      expect(out).toEqual([]);
    } finally {
      process.env.HOME = prevHome;
    }
  });

  it("readLiveUsageEvents returns ONLY live sessions (no disk scan), sid-tagged", async () => {
    home = mkdtempSync(join(tmpdir(), "heatmap-sess-"));
    const root = join(home, ".dsh", "sessions");
    const t0 = Date.UTC(2026, 7, 1, 8, 0, 0);
    // Session on disk but NOT live: must NOT appear in the live-only read.
    writeSession(root, "--ws--", "old-session-a", [
      makeEvent("assistant/message", 1, t0, {
        message: { source: { provider: "pA", model: "mA" } },
        usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 50 },
        turn: 1, step: 1,
      }),
    ]);
    const liveB = {
      id: "live-session-b",
      events: [
        makeEvent("assistant/message", 1, t0, {
          message: { source: { provider: "pB", model: "mB" } },
          usage: { inputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 60 },
          turn: 1, step: 1,
        }),
      ],
    };
    const ctx = { sessions: { list: async () => [liveB] } };
    const prevHome = process.env.HOME;
    process.env.HOME = home;
    try {
      const out = await readLiveUsageEvents(ctx as any);
      expect(out.length).toBe(1); // only the live session, disk-only A excluded
      expect(out[0].provider).toBe("pB");
      expect(out[0].sid).toBe("live-session-b"); // sid tagged for store refresh replace
    } finally {
      process.env.HOME = prevHome;
    }
  });
});
