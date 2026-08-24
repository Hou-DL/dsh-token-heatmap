import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zstdCompressSync } from "node:zlib";
import { HeatmapStore } from "./store.js";

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

describe("HeatmapStore refresh (live-only, disk scanned once at init)", () => {
  let home: string;
  afterEach(() => {
    if (home) rmSync(home, { recursive: true, force: true });
    home = "";
  });

  it("keeps non-live history and replaces live sessions without double counting", async () => {
    home = mkdtempSync(join(tmpdir(), "heatmap-store-"));
    const root = join(home, ".dsh", "sessions");
    const t0 = Date.UTC(2026, 7, 1, 8, 0, 0);
    const dayKey = "2026-08-01";

    // Old non-live session Y: only on disk (100 tokens).
    writeSession(root, "--ws--", "sess-y", [
      makeEvent("assistant/message", 1, t0, {
        message: { source: { provider: "pY", model: "mY" } },
        usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
        turn: 1, step: 1,
      }),
    ]);
    // Live session X: disk has seq1 (100); live snapshot also carries seq2 (200).
    writeSession(root, "--ws--", "sess-x", [
      makeEvent("assistant/message", 1, t0, {
        message: { source: { provider: "pX", model: "mX" } },
        usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
        turn: 1, step: 1,
      }),
    ]);
    const liveX = {
      id: "sess-x",
      events: [
        makeEvent("assistant/message", 1, t0, {
          message: { source: { provider: "pX", model: "mX" } },
          usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
          turn: 1, step: 1,
        }),
        makeEvent("assistant/message", 2, t0 + 1000, {
          message: { source: { provider: "pX", model: "mX" } },
          usage: { inputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
          turn: 2, step: 1,
        }),
      ],
    };
    let liveList: any[] = [liveX];
    const ctx: any = { sessions: { list: async () => liveList } };

    const prevHome = process.env.HOME;
    process.env.HOME = home;
    try {
      const store = new HeatmapStore(ctx);
      await store.init();
      // init(): full scan = Y(100) + X turn1(100) + X turn2(200) = 400, count 3
      const day1 = store.getAggregated().byDay.get(dayKey)!;
      expect(day1.totalTokens).toBe(400);
      expect(day1.count).toBe(3);

      // Refresh with live only: X gains turn3 (300). Y must be kept from history.
      liveX.events.push(makeEvent("assistant/message", 3, t0 + 2000, {
        message: { source: { provider: "pX", model: "mX" } },
        usage: { inputTokens: 300, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
        turn: 3, step: 1,
      }));
      await store.refresh();

      // Y(100) kept + X turn1+2+3 (100+200+300) = 700, count 4 — NOT double counted.
      const day2 = store.getAggregated().byDay.get(dayKey)!;
      expect(day2.totalTokens).toBe(700);
      expect(day2.count).toBe(4);

      // Refresh again with no change: totals must stay identical (no accumulation).
      await store.refresh();
      const day3 = store.getAggregated().byDay.get(dayKey)!;
      expect(day3.totalTokens).toBe(700);
      expect(day3.count).toBe(4);
    } finally {
      process.env.HOME = prevHome;
    }
  });
});
