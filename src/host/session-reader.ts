import type { RawUsageEvent } from "../aggregation.ts";

type SessionEvent = {
  type: string;
  time?: number;
  seq?: number;
  data?: any;
  surfaceOp?: any;
};

/**
 * Parse a batch of raw session events into RawUsageEvents.
 * Rules:
 * - request/header stores provider/model for fallback
 * - assistant/chunk type=usage is provisional, keyed by turn/step
 * - assistant/message with usage is authoritative, overwrites provisional for same turn/step
 */
export function parseUsageEvents(events: SessionEvent[]): RawUsageEvent[] {
  // Track provider/model: prefer message source, fallback to request/header
  let fallbackProvider = "";
  let fallbackModel = "";
  // turn/step -> RawUsageEvent (provisional or final)
  const byTurnStep = new Map<string, RawUsageEvent>();

  for (const ev of events) {
    if (ev.type === "request/header" && ev.data?.header?.config) {
      const cfg = ev.data.header.config;
      if (cfg.provider) fallbackProvider = cfg.provider;
      if (cfg.model) fallbackModel = cfg.model;
    }
    if (ev.type === "request/context" && ev.data) {
      if (ev.data.provider) fallbackProvider = ev.data.provider;
      if (ev.data.model) fallbackModel = ev.data.model;
    }
    if (ev.type === "assistant/chunk" && ev.data?.chunk?.type === "usage") {
      const key = `${ev.data.turn}:${ev.data.step}`;
      // Only set if not already finalized by a message
      if (!byTurnStep.has(key)) {
        const u = ev.data.chunk.usage;
        byTurnStep.set(key, {
          time: ev.time ?? Date.now(),
          provider: fallbackProvider,
          model: fallbackModel,
          usage: {
            inputTokens: u.inputTokens ?? 0,
            cacheReadTokens: u.cacheReadTokens ?? 0,
            cacheWriteTokens: u.cacheWriteTokens ?? 0,
            outputTokens: u.outputTokens ?? 0,
          },
        });
      }
    }
    if (ev.type === "assistant/message" && ev.data?.usage) {
      const msg = ev.data.message;
      const src = msg?.source;
      const provider = src?.provider ?? fallbackProvider;
      const model = src?.model ?? fallbackModel;
      const turn = ev.data.turn;
      const step = ev.data.step;
      const key = turn !== undefined && step !== undefined ? `${turn}:${step}` : `msg:${ev.seq ?? Math.random()}`;
      const u = ev.data.usage;
      byTurnStep.set(key, {
        time: ev.time ?? Date.now(),
        provider,
        model,
        usage: {
          inputTokens: u.inputTokens ?? 0,
          cacheReadTokens: u.cacheReadTokens ?? 0,
          cacheWriteTokens: u.cacheWriteTokens ?? 0,
          outputTokens: u.outputTokens ?? 0,
        },
      });
      // Also update fallback from message source for subsequent chunks
      if (src?.provider) fallbackProvider = src.provider;
      if (src?.model) fallbackModel = src.model;
    }
  }

  return [...byTurnStep.values()];
}

/**
 * Read all sessions' events via ctx.sessions or filesystem fallback.
 * Returns flattened RawUsageEvents across all sessions.
 */
export async function readAllUsageEvents(ctx: any): Promise<RawUsageEvent[]> {
  const allEvents: SessionEvent[] = [];

  // Try ctx.sessions API first (if available)
  try {
    if (ctx.sessions?.list) {
      const sessions = await ctx.sessions.list();
      for (const s of sessions ?? []) {
        const events = (s as any).events ?? [];
        allEvents.push(...events);
      }
      if (allEvents.length > 0) return parseUsageEvents(allEvents);
    }
  } catch {
    // fall through to filesystem
  }

  // Filesystem fallback: scan ~/.dsh/sessions
  try {
    const { readdirSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { execSync } = await import("node:child_process");
    const home = process.env.HOME ?? "/home/dell";
    const sessionsDir = join(home, ".dsh", "sessions");
    if (!existsSync(sessionsDir)) return [];

    function walk(dir: string, acc: string[]) {
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, entry.name);
          if (entry.isDirectory()) walk(p, acc);
          else if (entry.name === "session.jsonl.zstd" || entry.name === "session.jsonl") acc.push(p);
        }
      } catch {}
    }
    const files: string[] = [];
    walk(sessionsDir, files);

    for (const f of files) {
      try {
        let text: string;
        if (f.endsWith(".zstd")) {
          text = execSync(`zstd -dc ${JSON.stringify(f)}`, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
        } else {
          const { readFileSync } = await import("node:fs");
          text = readFileSync(f, "utf-8");
        }
        for (const line of text.split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            // Only keep relevant event types
            if (obj.type === "request/header" || obj.type === "request/context" || obj.type === "assistant/chunk" || obj.type === "assistant/message") {
              allEvents.push(obj);
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}

  return parseUsageEvents(allEvents);
}
