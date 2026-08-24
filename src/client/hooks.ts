import * as React from "react";
import { aggregate, type Aggregated, type DayAgg } from "../aggregation.ts";
import { toDayKey } from "../date-bucket.ts";

const LS_INTERVAL_KEY = "dsh-token-heatmap:autoRefreshMinutes";

export function getAutoRefreshMinutes(): number {
  try {
    const v = localStorage.getItem(LS_INTERVAL_KEY);
    if (v === null) return 10;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 10;
    return Math.min(1440, Math.max(0, Math.round(n)));
  } catch {
    return 10;
  }
}

export function setAutoRefreshMinutes(minutes: number) {
  try {
    localStorage.setItem(LS_INTERVAL_KEY, String(minutes));
  } catch {}
}

const API_TIMEOUT_MS = 5000;

async function fetchFromApi(): Promise<Aggregated | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch("/api/dsh-token-heatmap/daily.json", { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !Array.isArray(json.days)) return null;
    const byDay = new Map<string, DayAgg>();
    for (const d of json.days) {
      byDay.set(d.dayKey, {
        dayKey: d.dayKey,
        totalTokens: d.totalTokens ?? 0,
        uncachedInputTokens: d.uncachedInputTokens ?? 0,
        cacheReadTokens: d.cacheReadTokens ?? 0,
        cacheWriteTokens: d.cacheWriteTokens ?? 0,
        outputTokens: d.outputTokens ?? 0,
        count: d.count ?? 0,
        byModel: new Map(Object.entries(d.byModel ?? {})) as Map<string, number>,
        byProvider: new Map(Object.entries(d.byProvider ?? {})) as Map<string, number>,
        hourlyTokens: Array.isArray(d.hourlyTokens) && d.hourlyTokens.length === 24 ? d.hourlyTokens : new Array(24).fill(0),
        winnerModel: d.winnerModel ?? null,
        winnerProvider: d.winnerProvider ?? null,
      });
    }
    const totals = json.totals ?? { today: 0, thisWeek: 0, thisMonth: 0, all: 0 };
    const topModels = Array.isArray(json.topModels) ? json.topModels.map((x: any) => ({ model: x.name ?? x.model, tokens: x.tokens })) : [];
    const topProviders = Array.isArray(json.topProviders) ? json.topProviders.map((x: any) => ({ provider: x.name ?? x.provider, tokens: x.tokens })) : [];
    const nowMs = Date.now();
    // Reuse aggregation helpers by building a synthetic Aggregated that delegates to byDay
    const fakeAgg = aggregate([], nowMs);
    (fakeAgg as any).byDay = byDay;
    (fakeAgg as any).totals = totals;
    (fakeAgg as any).topModels = topModels;
    (fakeAgg as any).topProviders = topProviders;
    (fakeAgg as any).top5 = topModels;
    // Patch window helpers to use our byDay
    const { weekRangeFor, monthRangeFor, quarterRangeFor, yearRangeFor, listDaysInRange } = await import("../date-bucket.ts");
    const resolveDay = (k: string) => byDay.get(k) ?? { dayKey: k, totalTokens: 0, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, count: 0, byModel: new Map(), byProvider: new Map(), hourlyTokens: new Array(24).fill(0), winnerModel: null, winnerProvider: null };
    const resolveRange = (s: string, e: string) => listDaysInRange(s, e).map(resolveDay);
    (fakeAgg as any).weekDays = (k: string) => resolveRange(...weekRangeFor(k));
    (fakeAgg as any).monthDays = (k: string) => resolveRange(...monthRangeFor(k));
    (fakeAgg as any).quarterDays = (k: string) => resolveRange(...quarterRangeFor(k));
    (fakeAgg as any).yearDays = (k: string) => resolveRange(...yearRangeFor(k));
    (fakeAgg as any).top5InWindow = (days: DayAgg[]) => {
      const m = new Map<string, number>();
      for (const d of days) for (const [model, tokens] of d.byModel) m.set(model, (m.get(model) ?? 0) + tokens);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([model, tokens]) => ({ model, tokens }));
    };
    (fakeAgg as any).topProvidersInWindow = (days: DayAgg[]) => {
      const m = new Map<string, number>();
      for (const d of days) for (const [provider, tokens] of d.byProvider) m.set(provider, (m.get(provider) ?? 0) + tokens);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([provider, tokens]) => ({ provider, tokens }));
    };
    return fakeAgg as Aggregated;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function useHeatmapData(ctx: any | null, refreshMs?: number, manualTick?: number) {
  const [data, setData] = React.useState<Aggregated | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<string | null>(null);

  const intervalMs = React.useMemo(() => {
    if (refreshMs !== undefined) return refreshMs;
    const mins = getAutoRefreshMinutes();
    return mins === 0 ? 0 : mins * 60 * 1000;
  }, [refreshMs, manualTick]);

  const fetchData = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const apiData = await fetchFromApi();
      if (apiData) {
        const isEmpty = apiData.byDay.size === 0;
        setData(apiData);
        setLastRefresh(new Date().toLocaleString());
        // If the host hasn't finished init() (empty data), retry shortly
        // instead of waiting for the next 10-min auto-refresh cycle.
        if (isEmpty) {
          setTimeout(() => { setTick((t) => t + 1); }, 3000);
        }
        return;
      }
      const store = ctx?.get?.("heatmapStore") ?? (typeof window !== "undefined" ? (window as any).__dsh_heatmapStore : null);
      if (store?.refresh) await store.refresh();
      if (store?.getAggregated) {
        setData(store.getAggregated());
        setLastRefresh(new Date().toLocaleString());
        return;
      }
      const snap = typeof window !== "undefined" ? (window as any).__dsh_heatmapSnapshot : null;
      if (snap?.byDay && snap?.totals) {
        setData(snap);
        setLastRefresh(new Date().toLocaleString());
        return;
      }
    } catch {
      // keep previous
    } finally {
      setRefreshing(false);
    }
    setData((prev) => prev ?? aggregate([], Date.now()));
  }, [ctx]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, manualTick]);

  React.useEffect(() => {
    if (intervalMs === 0) return;
    const id = setInterval(fetchData, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchData, intervalMs]);

  const refresh = React.useCallback(() => fetchData(), [fetchData]);

  return { data, refreshing, lastRefresh, refresh, intervalMs };
}

export function useHeatmapView(aggregated: Aggregated | null, initial: import("./HeatmapGrid.tsx").ViewKind = "month") {
  const [view, setView] = React.useState(initial);
  const [anchor, setAnchor] = React.useState(() => toDayKey(Date.now()));

  const days: DayAgg[] | null = React.useMemo(() => {
    if (!aggregated) return null;
    switch (view) {
      case "week":
        return aggregated.weekDays(anchor);
      case "month":
        return aggregated.monthDays(anchor);
      case "quarter":
        return aggregated.quarterDays(anchor);
      case "year":
        return aggregated.yearDays(anchor);
    }
  }, [aggregated, view, anchor]);

  const topModels = React.useMemo(() => {
    if (!aggregated || !days) return aggregated?.topModels ?? [];
    return aggregated.top5InWindow(days);
  }, [aggregated, days]);

  const topProviders = React.useMemo(() => {
    if (!aggregated || !days) return aggregated?.topProviders ?? [];
    return aggregated.topProvidersInWindow(days);
  }, [aggregated, days]);

  return { view, setView, anchor, setAnchor, days, topModels, topProviders };
}
