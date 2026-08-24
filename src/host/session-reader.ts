import type { RawUsageEvent } from "../aggregation.ts";

type SessionEvent = {
  type: string;
  time?: number;
  seq?: number;
  data?: any;
  surfaceOp?: any;
  /** Session id this event belongs to. Events do NOT carry it in the log; the
   *  reader tags it so turn/step keys stay scoped per session. */
  sid?: string;
};

/**
 * Parse a batch of raw session events into RawUsageEvents.
 * Rules:
 * - request/header stores provider/model for fallback (per session)
 * - assistant/chunk type=usage is provisional, keyed by sid/turn/step
 * - assistant/message with usage is authoritative, overwrites provisional for same sid/turn/step
 *
 * The dedupe key MUST include the session id: turn/step counters restart per
 * session (every session has a turn 1 step 1), so without `sid` different
 * sessions overwrite each other and older sessions' usage silently disappears.
 */
export function parseUsageEvents(events: SessionEvent[]): RawUsageEvent[] {
  // session id -> fallback provider/model
  const fallbackBySid = new Map<string, { provider: string; model: string }>();
  const fallbackFor = (sid: string | undefined) => fallbackBySid.get(sid ?? "") ?? { provider: "", model: "" };
  // sid/turn/step -> RawUsageEvent (provisional or final)
  const byTurnStep = new Map<string, RawUsageEvent>();

  for (const ev of events) {
    const sid = ev.sid ?? "";
    if (ev.type === "request/header" && ev.data?.header?.config) {
      const cfg = ev.data.header.config;
      const fb = fallbackBySid.get(sid) ?? { provider: "", model: "" };
      if (cfg.provider) fb.provider = cfg.provider;
      if (cfg.model) fb.model = cfg.model;
      fallbackBySid.set(sid, fb);
    }
    if (ev.type === "request/context" && ev.data) {
      const fb = fallbackBySid.get(sid) ?? { provider: "", model: "" };
      if (ev.data.provider) fb.provider = ev.data.provider;
      if (ev.data.model) fb.model = ev.data.model;
      fallbackBySid.set(sid, fb);
    }
    if (ev.type === "assistant/chunk" && ev.data?.chunk?.type === "usage") {
      const key = `${sid}::${ev.data.turn}:${ev.data.step}`;
      // Only set if not already finalized by a message
      if (!byTurnStep.has(key)) {
        const fb = fallbackFor(sid);
        const u = ev.data.chunk.usage;
        byTurnStep.set(key, {
          time: ev.time ?? Date.now(),
          provider: fb.provider,
          model: fb.model,
          sid,
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
      const fb = fallbackFor(sid);
      const provider = src?.provider ?? fb.provider;
      const model = src?.model ?? fb.model;
      const turn = ev.data.turn;
      const step = ev.data.step;
      const key = turn !== undefined && step !== undefined ? `${sid}::${turn}:${step}` : `${sid}::msg:${ev.seq ?? Math.random()}`;
      const u = ev.data.usage;
      byTurnStep.set(key, {
        time: ev.time ?? Date.now(),
        provider,
        model,
        sid,
        usage: {
          inputTokens: u.inputTokens ?? 0,
          cacheReadTokens: u.cacheReadTokens ?? 0,
          cacheWriteTokens: u.cacheWriteTokens ?? 0,
          outputTokens: u.outputTokens ?? 0,
        },
      });
      // Also update fallback from message source for subsequent chunks
      const cur = fallbackBySid.get(sid) ?? { provider: "", model: "" };
      if (src?.provider) cur.provider = src.provider;
      if (src?.model) cur.model = src.model;
      fallbackBySid.set(sid, cur);
    }
  }

  return [...byTurnStep.values()];
}

/**
 * Read all sessions' usage events: FULL disk history (every session, old + new)
 * merged with live in-memory events that are not yet flushed to disk.
 *
 * NOTE: ctx.sessions.list() returns only LIVE sessions (created/resumed in the
 * current process) — historical sessions from previous processes are NOT in it.
 * The old implementation returned early whenever any live session had events,
 * so it never scanned the disk and old sessions never showed up. Here we ALWAYS
 * read the whole ~/.dsh/sessions tree and merge live events on top, deduping by
 * sessionId:seq (events carry no sessionId; the disk path derives it from the
 * session directory name).
 */
export async function readAllUsageEvents(ctx: any): Promise<RawUsageEvent[]> {
  const allEvents: SessionEvent[] = [];
  const seen = new Set<string>();

  const relevant = (o: any) =>
    o.type === "request/header" || o.type === "request/context" ||
    o.type === "assistant/chunk" || o.type === "assistant/message";

  const pushUnique = (sid: string, o: any) => {
    if (typeof o?.seq === "number") {
      const key = `${sid}:${o.seq}`;
      if (seen.has(key)) return;
      seen.add(key);
    }
    allEvents.push({ ...o, sid });
  };

  // 1) Full history: scan ~/.dsh/sessions (all sessions, including old ones).
  try {
    const { readdirSync, existsSync } = await import("node:fs");
    const { join, basename, dirname } = await import("node:path");
    const home = process.env.HOME ?? "/home/dell";
    const sessionsDir = join(home, ".dsh", "sessions");
    if (existsSync(sessionsDir)) {
      const files: string[] = [];
      (function walk(dir: string) {
        try {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const p = join(dir, entry.name);
            if (entry.isDirectory()) walk(p);
            else if (entry.name === "session.jsonl.zstd" || entry.name === "session.jsonl") files.push(p);
          }
        } catch {}
      })(sessionsDir);

      for (const f of files) {
        // <root>/<workspace>/<sessionId>/session.jsonl.zstd
        const sid = basename(dirname(f));
        try {
          let text: string;
          if (f.endsWith(".zstd")) {
            const { readFileSync } = await import("node:fs");
            const zlib = await import("node:zlib");
            if (typeof zlib.zstdDecompressSync === "function") {
              // Native zstd (Node >= 23.8 / 24): no external `zstd` binary needed.
              text = zlib.zstdDecompressSync(readFileSync(f)).toString("utf-8");
            } else {
              // Fallback for Node < 23.8 (no built-in zstd): external CLI required.
              const { execSync } = await import("node:child_process");
              text = execSync(`zstd -dc ${JSON.stringify(f)}`, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
            }
          } else {
            const { readFileSync } = await import("node:fs");
            text = readFileSync(f, "utf-8");
          }
          for (const line of text.split("\n")) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (relevant(obj)) pushUnique(sid, obj);
            } catch {}
          }
        } catch {}
      }
    }
  } catch {}

  // 2) Live sessions: merge events not yet flushed to disk (dedupe by sid:seq).
  try {
    if (ctx.sessions?.list) {
      const sessions = await ctx.sessions.list();
      for (const s of sessions ?? []) {
        const sid = s?.id ?? "live";
        for (const event of (s as any)?.events ?? []) {
          if (relevant(event)) pushUnique(sid, event);
        }
      }
    }
  } catch {}

  return parseUsageEvents(allEvents);
}

/**
 * Read usage from LIVE sessions only (ctx.sessions.list() = sessions created
 * or resumed in the current process). Cheap — no disk scan. Used by
 * store.refresh() after init() has already captured the full disk history,
 * so refreshes do not re-decompress ~/.dsh/sessions on every tick.
 *
 * A live session's `events` includes its full stored log, so the result is a
 * complete snapshot per live session; callers must REPLACE (not append) that
 * session's events to avoid double counting.
 */
export async function readLiveUsageEvents(ctx: any): Promise<RawUsageEvent[]> {
  const events: SessionEvent[] = [];
  const relevant = (o: any) =>
    o.type === "request/header" || o.type === "request/context" ||
    o.type === "assistant/chunk" || o.type === "assistant/message";
  try {
    if (ctx.sessions?.list) {
      const sessions = await ctx.sessions.list();
      for (const s of sessions ?? []) {
        const sid = s?.id ?? "live";
        for (const event of (s as any)?.events ?? []) {
          if (relevant(event)) events.push({ ...event, sid });
        }
      }
    }
  } catch {}
  return parseUsageEvents(events);
}
