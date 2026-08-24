import { aggregate, type Aggregated, type RawUsageEvent, type DayAgg } from "../aggregation.ts";
import { parseUsageEvents, readAllUsageEvents, readLiveUsageEvents } from "./session-reader.ts";
import { loadPersisted, savePersisted, mergePersistedAndLive } from "./persist.ts";
import { toDayKey } from "../date-bucket.ts";

export class HeatmapStore {
  private events: RawUsageEvent[] = [];
  private aggregated: Aggregated;
  private listeners = new Set<() => void>();
  private byTurnStep = new Map<string, RawUsageEvent>();
  private fallbackBySid = new Map<string, { provider: string; model: string }>();
  private ctx: any;
  private persistedDays = new Map<string, DayAgg>();

  constructor(ctx: any) {
    this.ctx = ctx;
    this.aggregated = aggregate([], Date.now());
  }

  async init() {
    // Load persisted cumulative history first
    this.persistedDays = loadPersisted();
    // Then scan current sessions
    const evs = await readAllUsageEvents(this.ctx);
    this.events = evs;
    this.rebuildPersistedAndAggregated();
  }

  /**
   * Refresh from LIVE sessions only. The full disk scan happened once at
   * init(); afterwards only live (in-memory) sessions change, so re-scanning
   * the whole ~/.dsh/sessions tree on every refresh would be wasted work.
   *
   * A live session's snapshot includes its full stored log, so we REPLACE that
   * session's events in place (never append) — history for sessions that are
   * no longer live is kept as-is from init(). This keeps each event present at
   * most once in this.events, so the max-merge into persistedDays never
   * under- or over-counts.
   */
  async refresh(): Promise<void> {
    const live = await readLiveUsageEvents(this.ctx);
    const liveSids = new Set(live.map((e) => e.sid).filter(Boolean) as string[]);
    this.events = [...this.events.filter((e) => !liveSids.has(e.sid)), ...live];
    this.persistedDays = loadPersisted();
    this.rebuildPersistedAndAggregated();
  }

  private rebuildPersistedAndAggregated() {
    this.invalidateCache();
    // Build live aggregated from current events
    const live = aggregate(this.events, Date.now());
    // Merge live byDay into persisted (persisted never shrinks)
    const mergedDays = mergePersistedAndLive(this.persistedDays, live.byDay);
    // If merged grew or any live day is newer/higher, persist
    if (mergedDays.size !== this.persistedDays.size || hasAnyIncrease(this.persistedDays, mergedDays)) {
      this.persistedDays = mergedDays;
      savePersisted(this.persistedDays);
    } else {
      // Even if no size change, merged may contain new totals (new tokens) - check live vs persisted
      // For simplicity, always update persisted to merged (it contains live's latest via max merge)
      this.persistedDays = mergedDays;
      // Only save if merged differs from what we loaded (avoid unnecessary writes)
      // We already checked hasAnyIncrease
      if (!mapsEqual(loadPersisted(), mergedDays)) {
        savePersisted(this.persistedDays);
      }
    }
    // Build final aggregated from persisted truth + live totals recomputed with fresh nowMs
    // Instead of re-aggregating from raw events (which would lose deleted history), aggregate from persistedDays
    this.aggregated = aggregateFromPersisted(this.persistedDays, Date.now());
    this.emit();
  }

  private rebuildAggregated() {
    this.invalidateCache();
    // Legacy path: just rebuild from persisted+live (used by ingest)
    this.aggregated = aggregateFromPersisted(this.persistedDays, Date.now());
    // Also need to incorporate any events not yet persisted? But persisted already contains merged live at init/refresh time.
    // For ingest incremental: we update persistedDays optimistically
    this.emit();
  }

  private cachedAgg: Aggregated | null = null;
  private cachedAt = 0;
  private static CACHE_TTL_MS = 30_000;

  getAggregated(): Aggregated {
    // Memoized for 30s to avoid re-aggregating on every poll; invalidated by ingest/refresh
    const now = Date.now();
    if (this.cachedAgg && now - this.cachedAt < HeatmapStore.CACHE_TTL_MS) return this.cachedAgg;
    const live = aggregate(this.events, now);
    const merged = mergePersistedAndLive(this.persistedDays, live.byDay);
    this.cachedAgg = aggregateFromPersisted(merged, now);
    this.cachedAt = now;
    return this.cachedAgg;
  }

  private invalidateCache() {
    this.cachedAgg = null;
    this.cachedAt = 0;
  }

  /** Ingest a single session event incrementally. Keys are scoped per session
   *  via `event.sid` (set by the plugin's session/event handler) so sessions
   *  with the same turn/step do not overwrite each other. */
  ingest(event: any) {
    const sid = (event as any)?.sid ?? "";
    const fb = (): { provider: string; model: string } => this.fallbackBySid.get(sid) ?? { provider: "", model: "" };
    const setFb = (provider?: string, model?: string) => {
      const cur = this.fallbackBySid.get(sid) ?? { provider: "", model: "" };
      if (provider) cur.provider = provider;
      if (model) cur.model = model;
      this.fallbackBySid.set(sid, cur);
    };
    if (event.type === "request/header" && event.data?.header?.config) {
      const cfg = event.data.header.config;
      setFb(cfg.provider, cfg.model);
      return;
    }
    if (event.type === "request/context" && event.data) {
      setFb(event.data.provider, event.data.model);
      return;
    }
    if (event.type === "assistant/chunk" && event.data?.chunk?.type === "usage") {
      const key = `${sid}::${event.data.turn}:${event.data.step}`;
      if (!this.byTurnStep.has(key)) {
        const f = fb();
        const u = event.data.chunk.usage;
        const ev: RawUsageEvent = {
          time: event.time ?? Date.now(),
          provider: f.provider,
          model: f.model,
          sid,
          usage: {
            inputTokens: u.inputTokens ?? 0,
            cacheReadTokens: u.cacheReadTokens ?? 0,
            cacheWriteTokens: u.cacheWriteTokens ?? 0,
            outputTokens: u.outputTokens ?? 0,
          },
        };
        this.byTurnStep.set(key, ev);
        this.events.push(ev);
        this.persistIncremental(ev);
        this.rebuildAggregated();
      }
      return;
    }
    if (event.type === "assistant/message" && event.data?.usage) {
      const msg = event.data.message;
      const src = msg?.source;
      const f = fb();
      const provider = src?.provider ?? f.provider;
      const model = src?.model ?? f.model;
      const turn = event.data.turn;
      const step = event.data.step;
      const key = turn !== undefined && step !== undefined ? `${sid}::${turn}:${step}` : `${sid}::msg:${event.seq ?? Math.random()}`;
      const existing = this.byTurnStep.get(key);
      const u = event.data.usage;
      const ev: RawUsageEvent = {
        time: event.time ?? Date.now(),
        provider,
        model,
        sid,
        usage: {
          inputTokens: u.inputTokens ?? 0,
          cacheReadTokens: u.cacheReadTokens ?? 0,
          cacheWriteTokens: u.cacheWriteTokens ?? 0,
          outputTokens: u.outputTokens ?? 0,
        },
      };
      if (existing) {
        const idx = this.events.indexOf(existing);
        if (idx !== -1) this.events.splice(idx, 1);
        // also revert persisted contribution? No - persisted is max, so removing provisional doesn't shrink persisted; just replace
      }
      this.byTurnStep.set(key, ev);
      this.events.push(ev);
      setFb(src?.provider, src?.model);
      this.persistIncremental(ev);
      this.rebuildAggregated();
    }
  }

  private persistIncremental(ev: RawUsageEvent) {
    const live = aggregate(this.events, Date.now());
    const dayKey = toDayKey(ev.time);
    const liveDay = live.byDay.get(dayKey);
    if (!liveDay) return;
    const prev = this.persistedDays.get(dayKey);
    const merged = prev ? mergeTwoDays(prev, liveDay) : cloneDay(liveDay);
    this.persistedDays.set(dayKey, merged);
    savePersisted(this.persistedDays);
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb();
  }

  dispose() {
    this.listeners.clear();
  }

  /** For testing: inject events directly */
  _injectEvents(evs: RawUsageEvent[]) {
    this.events.push(...evs);
    this.rebuildAggregated();
  }

  // Exposed for settings UI / manual refresh
  getPersistedDays(): Map<string, DayAgg> {
    return new Map(this.persistedDays);
  }

  clearPersisted() {
    this.persistedDays.clear();
    savePersisted(this.persistedDays);
    this.rebuildAggregated();
  }
}

import { weekRangeFor, monthRangeFor } from "../date-bucket.ts";

// Minimal helpers reused from persist.ts logic but need local clones
function cloneDay(d: DayAgg): DayAgg {
  return {
    dayKey: d.dayKey,
    totalTokens: d.totalTokens,
    uncachedInputTokens: d.uncachedInputTokens,
    cacheReadTokens: d.cacheReadTokens,
    cacheWriteTokens: d.cacheWriteTokens,
    outputTokens: d.outputTokens,
    count: d.count,
    byModel: new Map(d.byModel),
    byProvider: new Map(d.byProvider),
    winnerModel: d.winnerModel,
    winnerProvider: d.winnerProvider,
  };
}

function mergeTwoDays(prev: DayAgg, live: DayAgg): DayAgg {
  const byModel = new Map(prev.byModel);
  for (const [k, v] of live.byModel) byModel.set(k, Math.max(byModel.get(k) ?? 0, v));
  const byProvider = new Map(prev.byProvider);
  for (const [k, v] of live.byProvider) byProvider.set(k, Math.max(byProvider.get(k) ?? 0, v));
  const merged: DayAgg = {
    dayKey: prev.dayKey,
    totalTokens: Math.max(prev.totalTokens, live.totalTokens),
    uncachedInputTokens: Math.max(prev.uncachedInputTokens, live.uncachedInputTokens),
    cacheReadTokens: Math.max(prev.cacheReadTokens, live.cacheReadTokens),
    cacheWriteTokens: Math.max(prev.cacheWriteTokens, live.cacheWriteTokens),
    outputTokens: Math.max(prev.outputTokens, live.outputTokens),
    count: Math.max(prev.count, live.count),
    byModel,
    byProvider,
    winnerModel: null,
    winnerProvider: null,
  };
  let bestM: string | null = null;
  let bestMVal = -1;
  for (const [m, v2] of byModel) if (v2 > bestMVal) { bestMVal = v2; bestM = m; }
  merged.winnerModel = bestM;
  let bestP: string | null = null;
  let bestPVal = -1;
  for (const [p, v2] of byProvider) if (v2 > bestPVal) { bestPVal = v2; bestP = p; }
  merged.winnerProvider = bestP;
  return merged;
}

function hasAnyIncrease(a: Map<string, DayAgg>, b: Map<string, DayAgg>): boolean {
  for (const [k, vb] of b) {
    const va = a.get(k);
    if (!va) return true;
    if (vb.totalTokens > va.totalTokens) return true;
    if (vb.count > va.count) return true;
  }
  return false;
}

function mapsEqual(a: Map<string, DayAgg>, b: Map<string, DayAgg>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (!vb) return false;
    if (va.totalTokens !== vb.totalTokens || va.count !== vb.count) return false;
  }
  return true;
}

function aggregateFromPersisted(persistedDays: Map<string, DayAgg>, nowMs: number): Aggregated {
  const fakeEvents: RawUsageEvent[] = [];
  for (const day of persistedDays.values()) {
    for (const [model, tokens] of day.byModel) {
      fakeEvents.push({
        time: new Date(day.dayKey + "T12:00:00+08:00").getTime(),
        provider: day.winnerProvider ?? "unknown",
        model,
        usage: { inputTokens: tokens, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
      });
    }
    if (day.byModel.size === 0 && day.totalTokens > 0) {
      fakeEvents.push({
        time: new Date(day.dayKey + "T12:00:00+08:00").getTime(),
        provider: day.winnerProvider ?? "unknown",
        model: day.winnerModel ?? "unknown",
        usage: { inputTokens: day.totalTokens, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
      });
    }
  }
  const agg = aggregate(fakeEvents, nowMs);
  const todayKey = toDayKey(nowMs);
  const [wS, wE] = weekRangeFor(todayKey);
  const [mS, mE] = monthRangeFor(todayKey);
  const sumRange = (s: string, e: string) => {
    let sum = 0;
    let cur = s;
    while (cur <= e) {
      sum += persistedDays.get(cur)?.totalTokens ?? 0;
      const d = new Date(cur + "T12:00:00+08:00");
      d.setDate(d.getDate() + 1);
      cur = toDayKey(d.getTime());
      if (cur > e) break;
    }
    return sum;
  };
  let all = 0;
  for (const v of persistedDays.values()) all += v.totalTokens;
  const today = persistedDays.get(todayKey)?.totalTokens ?? 0;
  const thisWeek = sumRange(wS, wE);
  const thisMonth = sumRange(mS, mE);
  (agg as any).totals = { today, thisWeek, thisMonth, all };
  (agg as any).byDay = new Map(persistedDays);
  return agg;
}
