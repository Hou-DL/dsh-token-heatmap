import * as React from "react";
import { StatsCards } from "./StatsCards.tsx";
import { HeatmapGrid, type ViewKind } from "./HeatmapGrid.tsx";
import { ModelTop5 } from "./ModelTop5.tsx";
import { useHeatmapData, useHeatmapView, getAutoRefreshMinutes, setAutoRefreshMinutes } from "./hooks.ts";
import type { DayAgg } from "../aggregation.ts";

type SettingsSectionProps = {
  t: (key: string, params?: Record<string, any>) => string;
  ctx?: any;
  days?: DayAgg[];
  totals?: any;
  top5?: any;
};

export function SettingsSection({ t, ctx, days: injectedDays, totals: injectedTotals, top5: injectedTop5 }: SettingsSectionProps) {
  const [tick, setTick] = React.useState(0);
  const { data: aggregated, refreshing, lastRefresh, refresh } = useHeatmapData(ctx ?? null, undefined, tick);
  const { view, setView, days: computedDays, topModels: computedTopModels, topProviders: computedTopProviders } = useHeatmapView(aggregated);
  const [topMode, setTopMode] = React.useState<"model" | "provider">("model");
  const [intervalMins, setIntervalMins] = React.useState(() => getAutoRefreshMinutes());

  const days = injectedDays ?? computedDays;
  const totals = injectedTotals ?? aggregated?.totals;
  const viewTopModels = computedTopModels.length
    ? computedTopModels.map((x) => ({ name: x.model, tokens: x.tokens }))
    : (aggregated?.topModels ?? []).map((x) => ({ name: x.model, tokens: x.tokens }));
  const viewTopProviders = computedTopProviders.length
    ? computedTopProviders.map((x) => ({ name: x.provider, tokens: x.tokens }))
    : (aggregated?.topProviders ?? []).map((x) => ({ name: x.provider, tokens: x.tokens }));
  const injectedTop = injectedTop5;
  const hasData = totals && (totals.today > 0 || totals.thisWeek > 0 || totals.thisMonth > 0 || totals.all > 0);

  const handleRefresh = async () => {
    await refresh();
    setTick((x) => x + 1);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = Number(e.target.value);
    setAutoRefreshMinutes(v);
    setIntervalMins(v);
    setTick((x) => x + 1);
  };

  const handleReset = () => {
    if (!confirm(t("heatmap.reset.confirm"))) return;
    const store = ctx?.get?.("heatmapStore") ?? (typeof window !== "undefined" ? (window as any).__dsh_heatmapStore : null);
    if (store?.clearPersisted) {
      store.clearPersisted();
      setTick((x) => x + 1);
    }
  };

  return (
    <section aria-labelledby="heatmap-title" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 id="heatmap-title" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--dsw-alias-label-primary)" }}>
          {t("heatmap.title")}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--dsw-alias-label-tertiary)", lineHeight: 1.5 }}>
          {t("heatmap.subtitle")}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 8,
            border: "1px solid var(--dsw-alias-border-l2)",
            background: refreshing ? "var(--dsw-alias-bg-layer-2)" : "var(--dsw-alias-bg-layer-3)",
            color: "var(--dsw-alias-label-primary)",
            cursor: refreshing ? "wait" : "pointer",
          }}
        >
          {refreshing ? t("heatmap.refreshing") : t("heatmap.refresh")}
        </button>
        <span style={{ fontSize: 12, color: "var(--dsw-alias-label-tertiary)" }}>
          {lastRefresh ? t("heatmap.lastRefresh", { time: lastRefresh }) : ""}
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary)" }}>
          {t("heatmap.autoRefresh")}
          <select
            value={intervalMins}
            onChange={handleIntervalChange}
            title={t("heatmap.autoRefresh.hint")}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--dsw-alias-border-l2)",
              background: "var(--dsw-alias-bg-layer-3)",
              color: "var(--dsw-alias-label-primary)",
            }}
          >
            <option value={0}>{t("heatmap.autoRefresh.off")}</option>
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
          </select>
        </label>
        <button
          onClick={handleReset}
          style={{
            padding: "6px 10px",
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--dsw-alias-state-error-primary, #e5484d)",
            background: "transparent",
            color: "var(--dsw-alias-state-error-primary, #e5484d)",
            cursor: "pointer",
          }}
        >
          {t("heatmap.reset")}
        </button>
      </div>

      {totals ? <StatsCards t={t} totals={totals} todayCount={undefined} /> : null}
      {days ? <HeatmapGrid t={t} days={days} view={view} onViewChange={setView} /> : null}
      {injectedTop ? (
        <ModelTop5 t={t} topModels={injectedTop} topProviders={[]} days={days ?? undefined} mode={topMode} onModeChange={setTopMode} />
      ) : viewTopModels.length > 0 || viewTopProviders.length > 0 ? (
        <ModelTop5 t={t} topModels={viewTopModels} topProviders={viewTopProviders} days={days ?? undefined} mode={topMode} onModeChange={setTopMode} />
      ) : null}
      {!hasData && !days ? (
        <div
          style={{
            border: "1px solid var(--dsw-alias-border-l2)",
            background: "var(--dsw-alias-bg-layer-3)",
            borderRadius: 12,
            padding: 24,
            color: "var(--dsw-alias-label-tertiary)",
            fontSize: 13,
          }}
        >
          {t("heatmap.empty")}
        </div>
      ) : null}
    </section>
  );
}

export default SettingsSection;
