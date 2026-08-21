import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { DayAgg } from "../aggregation.ts";

export type PersistedDay = {
  dayKey: string;
  totalTokens: number;
  uncachedInputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  count: number;
  byModel: Record<string, number>;
  byProvider: Record<string, number>;
  winnerModel: string | null;
  winnerProvider: string | null;
};

export type PersistedFile = {
  version: 1;
  days: Record<string, PersistedDay>;
};

function persistPath(): string {
  // Use ~/.dsh/storages for global persistence (survives session deletion)
  // This directory already exists in every DSH install
  const dir = join(homedir(), ".dsh", "storages", "dsh-token-heatmap");
  return join(dir, "daily.json");
}

function toPersistedDay(day: DayAgg): PersistedDay {
  return {
    dayKey: day.dayKey,
    totalTokens: day.totalTokens,
    uncachedInputTokens: day.uncachedInputTokens,
    cacheReadTokens: day.cacheReadTokens,
    cacheWriteTokens: day.cacheWriteTokens,
    outputTokens: day.outputTokens,
    count: day.count,
    byModel: Object.fromEntries(day.byModel),
    byProvider: Object.fromEntries(day.byProvider),
    winnerModel: day.winnerModel,
    winnerProvider: day.winnerProvider,
  };
}

function fromPersistedDay(p: PersistedDay): DayAgg {
  const byModel = new Map<string, number>(Object.entries(p.byModel ?? {}));
  const byProvider = new Map<string, number>(Object.entries(p.byProvider ?? {}));
  return {
    dayKey: p.dayKey,
    totalTokens: p.totalTokens,
    uncachedInputTokens: p.uncachedInputTokens ?? 0,
    cacheReadTokens: p.cacheReadTokens ?? 0,
    cacheWriteTokens: p.cacheWriteTokens ?? 0,
    outputTokens: p.outputTokens ?? 0,
    count: p.count ?? 0,
    byModel,
    byProvider,
    winnerModel: p.winnerModel ?? null,
    winnerProvider: p.winnerProvider ?? null,
  };
}

export function loadPersisted(): Map<string, DayAgg> {
  try {
    const p = persistPath();
    if (!existsSync(p)) return new Map();
    const raw = readFileSync(p, "utf-8");
    const parsed: PersistedFile = JSON.parse(raw);
    if (!parsed || typeof parsed.days !== "object") return new Map();
    const m = new Map<string, DayAgg>();
    for (const [k, v] of Object.entries(parsed.days)) {
      try {
        m.set(k, fromPersistedDay(v));
      } catch {
        // skip corrupt day
      }
    }
    return m;
  } catch {
    return new Map();
  }
}

export function savePersisted(days: Map<string, DayAgg>): void {
  try {
    const p = persistPath();
    mkdirSync(dirname(p), { recursive: true });
    const out: PersistedFile = {
      version: 1,
      days: Object.fromEntries([...days.entries()].map(([k, v]) => [k, toPersistedDay(v)])),
    };
    const tmp = p + ".tmp";
    writeFileSync(tmp, JSON.stringify(out, null, 2), "utf-8");
    renameSync(tmp, p);
  } catch {
    // best-effort
  }
}

/**
 * Merge strategy: persisted is cumulative historical truth that never shrinks.
 * For each dayKey, if live has data, take element-wise MAX for additive fields,
 * and merge byModel/byProvider by taking max per key (or summing? No - live total is sum of remaining sessions, persisted is sum of all-time events. Taking max per day total prevents loss on deletion while allowing growth on new events. Per-model we also take max per model per day? But that would undercount if a new model appears. Better: merge by taking max of total, and for byModel: for each model, max(persisted, live). If a new model appears only in live, it propagates.
 * For count: max as well.
 */
export function mergePersistedAndLive(
  persisted: Map<string, DayAgg>,
  live: Map<string, DayAgg>,
): Map<string, DayAgg> {
  const result = new Map<string, DayAgg>();

  // Start from persisted
  for (const [k, v] of persisted) {
    result.set(k, cloneDay(v));
  }

  for (const [k, liveDay] of live) {
    const prev = result.get(k);
    if (!prev) {
      result.set(k, cloneDay(liveDay));
      continue;
    }
    // Take max for scalar totals (never shrink)
    const merged: DayAgg = {
      dayKey: k,
      totalTokens: Math.max(prev.totalTokens, liveDay.totalTokens),
      uncachedInputTokens: Math.max(prev.uncachedInputTokens, liveDay.uncachedInputTokens),
      cacheReadTokens: Math.max(prev.cacheReadTokens, liveDay.cacheReadTokens),
      cacheWriteTokens: Math.max(prev.cacheWriteTokens, liveDay.cacheWriteTokens),
      outputTokens: Math.max(prev.outputTokens, liveDay.outputTokens),
      count: Math.max(prev.count, liveDay.count),
      byModel: mergeMapMax(prev.byModel, liveDay.byModel),
      byProvider: mergeMapMax(prev.byProvider, liveDay.byProvider),
      winnerModel: null,
      winnerProvider: null,
    };
    // recompute winners
    let bestM: string | null = null;
    let bestMVal = -1;
    for (const [m, v2] of merged.byModel) {
      if (v2 > bestMVal) {
        bestMVal = v2;
        bestM = m;
      }
    }
    merged.winnerModel = bestM;
    let bestP: string | null = null;
    let bestPVal = -1;
    for (const [p, v2] of merged.byProvider) {
      if (v2 > bestPVal) {
        bestPVal = v2;
        bestP = p;
      }
    }
    merged.winnerProvider = bestP;
    result.set(k, merged);
  }

  return result;
}

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

function mergeMapMax(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const r = new Map<string, number>(a);
  for (const [k, v] of b) {
    r.set(k, Math.max(r.get(k) ?? 0, v));
  }
  return r;
}

export function getPersistPath(): string {
  return persistPath();
}
