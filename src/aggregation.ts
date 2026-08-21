import {
  toDayKey,
  addDays,
  listDaysInRange,
  weekRangeFor,
  monthRangeFor,
  quarterRangeFor,
  yearRangeFor,
} from "./date-bucket.ts";

export type RawUsageEvent = {
  time: number;
  provider: string;
  model: string;
  usage: {
    inputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
  };
};

export type DayAgg = {
  dayKey: string;
  totalTokens: number;
  uncachedInputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  count: number;
  byModel: Map<string, number>;
  byProvider: Map<string, number>;
  winnerModel: string | null;
  winnerProvider: string | null;
};

export type TopItem = { name: string; tokens: number };

export type Aggregated = {
  byDay: Map<string, DayAgg>;
  totals: { today: number; thisWeek: number; thisMonth: number; all: number };
  topModels: Array<{ model: string; tokens: number }>;
  topProviders: Array<{ provider: string; tokens: number }>;
  /** @deprecated use topModels */
  top5: Array<{ model: string; tokens: number }>;
  weekDays(dayKey: string): DayAgg[];
  monthDays(dayKey: string): DayAgg[];
  quarterDays(dayKey: string): DayAgg[];
  yearDays(dayKey: string): DayAgg[];
  top5InWindow(days: DayAgg[]): Array<{ model: string; tokens: number }>;
  topProvidersInWindow(days: DayAgg[]): Array<{ provider: string; tokens: number }>;
};

function emptyDay(dayKey: string): DayAgg {
  return {
    dayKey,
    totalTokens: 0,
    uncachedInputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    count: 0,
    byModel: new Map(),
    byProvider: new Map(),
    winnerModel: null,
    winnerProvider: null,
  };
}

function sumByDay(days: DayAgg[]): number {
  return days.reduce((s, d) => s + d.totalTokens, 0);
}

function resolveDay(byDay: Map<string, DayAgg>, key: string): DayAgg {
  return byDay.get(key) ?? emptyDay(key);
}

function resolveRange(byDay: Map<string, DayAgg>, start: string, end: string): DayAgg[] {
  return listDaysInRange(start, end).map((k) => resolveDay(byDay, k));
}

export function clampLevel(value: number): 0 | 1 | 2 | 3 | 4 {
  if (value === 0) return 0;
  if (value <= 2000) return 1;
  if (value <= 10000) return 2;
  if (value <= 50000) return 3;
  return 4;
}

export function aggregate(events: RawUsageEvent[], nowMs: number): Aggregated {
  const byDay = new Map<string, DayAgg>();
  const globalByModel = new Map<string, number>();
  const globalByProvider = new Map<string, number>();

  for (const ev of events) {
    const dayKey = toDayKey(ev.time);
    let agg = byDay.get(dayKey);
    if (!agg) {
      agg = emptyDay(dayKey);
      byDay.set(dayKey, agg);
    }
    const u = ev.usage;
    const total = (u.inputTokens ?? 0) + (u.cacheReadTokens ?? 0) + (u.cacheWriteTokens ?? 0) + (u.outputTokens ?? 0);
    agg.totalTokens += total;
    agg.uncachedInputTokens += u.inputTokens ?? 0;
    agg.cacheReadTokens += u.cacheReadTokens ?? 0;
    agg.cacheWriteTokens += u.cacheWriteTokens ?? 0;
    agg.outputTokens += u.outputTokens ?? 0;
    agg.count += 1;

    const modelKey = ev.model || "unknown";
    const providerKey = ev.provider || "unknown";
    agg.byModel.set(modelKey, (agg.byModel.get(modelKey) ?? 0) + total);
    agg.byProvider.set(providerKey, (agg.byProvider.get(providerKey) ?? 0) + total);
    globalByModel.set(modelKey, (globalByModel.get(modelKey) ?? 0) + total);
    globalByProvider.set(providerKey, (globalByProvider.get(providerKey) ?? 0) + total);
  }

  // compute winners per day
  for (const agg of byDay.values()) {
    let bestM: string | null = null;
    let bestMVal = -1;
    for (const [m, v] of agg.byModel) {
      if (v > bestMVal) {
        bestMVal = v;
        bestM = m;
      }
    }
    agg.winnerModel = bestM;

    let bestP: string | null = null;
    let bestPVal = -1;
    for (const [p, v] of agg.byProvider) {
      if (v > bestPVal) {
        bestPVal = v;
        bestP = p;
      }
    }
    agg.winnerProvider = bestP;
  }

  const todayKey = toDayKey(nowMs);
  const [wStart, wEnd] = weekRangeFor(todayKey);
  const [mStart, mEnd] = monthRangeFor(todayKey);

  const today = byDay.get(todayKey)?.totalTokens ?? 0;
  const thisWeek = sumByDay(resolveRange(byDay, wStart, wEnd));
  const thisMonth = sumByDay(resolveRange(byDay, mStart, mEnd));
  let all = 0;
  for (const v of byDay.values()) all += v.totalTokens;

  const topModels = [...globalByModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([model, tokens]) => ({ model, tokens }));

  const topProviders = [...globalByProvider.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([provider, tokens]) => ({ provider, tokens }));

  function top5InWindow(days: DayAgg[]): Array<{ model: string; tokens: number }> {
    const m = new Map<string, number>();
    for (const d of days) {
      for (const [model, tokens] of d.byModel) {
        m.set(model, (m.get(model) ?? 0) + tokens);
      }
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, tokens]) => ({ model, tokens }));
  }

  function topProvidersInWindow(days: DayAgg[]): Array<{ provider: string; tokens: number }> {
    const m = new Map<string, number>();
    for (const d of days) {
      for (const [provider, tokens] of d.byProvider) {
        m.set(provider, (m.get(provider) ?? 0) + tokens);
      }
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([provider, tokens]) => ({ provider, tokens }));
  }

  return {
    byDay,
    totals: { today, thisWeek, thisMonth, all },
    topModels,
    topProviders,
    top5: topModels,
    weekDays: (k: string) => {
      const [s, e] = weekRangeFor(k);
      return resolveRange(byDay, s, e);
    },
    monthDays: (k: string) => {
      const [s, e] = monthRangeFor(k);
      return resolveRange(byDay, s, e);
    },
    quarterDays: (k: string) => {
      const [s, e] = quarterRangeFor(k);
      return resolveRange(byDay, s, e);
    },
    yearDays: (k: string) => {
      const [s, e] = yearRangeFor(k);
      return resolveRange(byDay, s, e);
    },
    top5InWindow,
    topProvidersInWindow,
  };
}
