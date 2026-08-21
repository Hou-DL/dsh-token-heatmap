import * as React from "react";
import { aggregate, type Aggregated, type DayAgg } from "../aggregation.ts";
import { toDayKey } from "../date-bucket.ts";

// Settings key for auto-refresh interval (minutes), stored in localStorage as fallback
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

export function useHeatmapData(ctx: any | null, refreshMs?: number, manualTick?: number) {
  const [data, setData] = React.useState<Aggregated | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<string | null>(null);

  // Determine interval: explicit refreshMs wins, otherwise use stored pref (default 10 min)
  const intervalMs = React.useMemo(() => {
    if (refreshMs !== undefined) return refreshMs;
    const mins = getAutoRefreshMinutes();
    return mins === 0 ? 0 : mins * 60 * 1000;
  }, [refreshMs, manualTick]);

  const fetchData = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const store = ctx?.get?.("heatmapStore") ?? (typeof window !== "undefined" ? (window as any).__dsh_heatmapStore : null);
      if (store?.refresh) {
        await store.refresh();
      }
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
    // fallback empty
    setData((prev) => prev ?? aggregate([], Date.now()));
  }, [ctx]);

  // Initial fetch + manual tick trigger
  React.useEffect(() => {
    fetchData();
  }, [fetchData, manualTick]);

  // Auto-refresh timer (0 = disabled)
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
