declare const __PLUGIN_VERSION__: string;

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
  const { view, setView, anchor, setAnchor, days: computedDays, topModels: computedTopModels, topProviders: computedTopProviders } = useHeatmapView(aggregated);
  const [topMode, setTopMode] = React.useState<"model" | "provider">("model");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [intervalMins, setIntervalMins] = React.useState(() => getAutoRefreshMinutes());
  const [lang, setLang] = React.useState<"zh" | "en">(() => {
    try { const v = localStorage.getItem("dsh-token-heatmap:lang"); return v === "en" ? "en" : "zh"; } catch { return "zh"; }
  });
  // ⋯ 菜单：显式开关 + 点击外部自动收回
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const days = injectedDays ?? computedDays;
  const totals = injectedTotals ?? aggregated?.totals;
  const viewTopModelsRaw = computedTopModels.length ? computedTopModels : (aggregated?.topModels ?? []);
  const viewTopProvidersRaw = computedTopProviders.length ? computedTopProviders : (aggregated?.topProviders ?? []);

  // If a day is selected, show that day's Top 5 instead of the view's
  let viewTopModels: typeof viewTopModelsRaw = viewTopModelsRaw;
  let viewTopProviders: typeof viewTopProvidersRaw = viewTopProvidersRaw;
  let topTitleExtra = "";
  if (selectedKey && aggregated) {
    const sel = aggregated.byDay.get(selectedKey);
    if (sel) {
      viewTopModels = [...sel.byModel.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([model,tokens])=>({model,tokens}));
      viewTopProviders = [...sel.byProvider.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([provider,tokens])=>({provider,tokens}));
      topTitleExtra = ` · ${selectedKey}`;
    }
  }
  const viewTopModelsNamed = viewTopModels.map((x) => ({ name: x.model, tokens: x.tokens }));
  const viewTopProvidersNamed = viewTopProviders.map((x) => ({ name: (x as any).provider ?? (x as any).name, tokens: x.tokens }));

  const injectedTop = injectedTop5;
  const hasData = totals && (totals.today > 0 || totals.thisWeek > 0 || totals.thisMonth > 0 || totals.all > 0);

  const tt = (key: string, params?: Record<string, any>) => {
    // lang-aware: prefer current lang's dictionary, fallback to t()
    // For now t() is already bound to the plugin's locale (zh by default). We override a few keys manually.
    const zhEn: Record<string, {zh:string,en:string}> = {
      "heatmap.lang.zh": { zh: "中文", en: "中文" },
      "heatmap.lang.en": { zh: "English", en: "English" },
      "heatmap.lang.label": { zh: "语言", en: "Language" },
      "heatmap.dayDetail": { zh: `${selectedKey ?? ""} · 当日 Top 5`, en: `${selectedKey ?? ""} · Top 5 of the day` },
      "heatmap.clearSelection": { zh: "清除选择", en: "Clear" },
    };
    const entry = zhEn[key];
    if (entry) {
      let s = entry[lang];
      if (params) for (const [k,v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
      return s;
    }
    return t(key, params);
  };

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

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as "zh" | "en";
    setLang(v);
    try { localStorage.setItem("dsh-token-heatmap:lang", v); } catch {}
  };

  const handleReset = () => {
    if (!confirm(t("heatmap.reset.confirm"))) return;
    const store = ctx?.get?.("heatmapStore") ?? (typeof window !== "undefined" ? (window as any).__dsh_heatmapStore : null);
    if (store?.clearPersisted) {
      store.clearPersisted();
      setTick((x) => x + 1);
    }
  };

  const handleViewChange = (v: typeof view) => {
    setSelectedKey(null);
    setView(v);
  };

  const handleSelect = (k: string | null) => setSelectedKey(k);

  return (
    <section aria-labelledby="heatmap-title" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 id="heatmap-title" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--dsw-alias-label-primary)" }}>
            {t("heatmap.title")}
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: "var(--dsw-alias-label-tertiary)", verticalAlign: "middle" }}>
              v{__PLUGIN_VERSION__}
            </span>
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--dsw-alias-label-tertiary)", lineHeight: 1.5 }}>
            {lang === "en" ? "Token usage from local session logs, bucketed by Asia/Shanghai. Synced once then persisted — deleting sessions keeps history." : t("heatmap.subtitle")}
          </p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary)", flexShrink: 0 }}>
          {tt("heatmap.lang.label")}
          <select value={lang} onChange={handleLangChange} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", color: "var(--dsw-alias-label-primary)" }}>
            <option value="zh">{tt("heatmap.lang.zh")}</option>
            <option value="en">{tt("heatmap.lang.en")}</option>
          </select>
        </label>
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
          {lang === "en" ? (refreshing ? "Refreshing…" : "Refresh") : (refreshing ? t("heatmap.refreshing") : t("heatmap.refresh"))}
        </button>
        <span style={{ fontSize: 12, color: "var(--dsw-alias-label-tertiary)" }}>
          {lastRefresh ? (lang === "en" ? `Last refresh: ${lastRefresh}` : t("heatmap.lastRefresh", { time: lastRefresh })) : ""}
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary)" }}>
          {lang === "en" ? "Auto refresh" : t("heatmap.autoRefresh")}
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
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            style={{ listStyle: "none", cursor: "pointer", padding: "2px 8px", fontSize: 13, color: "var(--dsw-alias-label-tertiary)", opacity: 0.7, border: "none", background: "transparent" }}
          >⋯</button>
          {menuOpen ? (
            <div
              style={{ position: "absolute", right: 0, top: "100%", zIndex: 10, background: "var(--dsw-alias-bg-layer-3)", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, padding: 6, minWidth: 120, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            >
              <button onClick={handleReset} style={{ width: "100%", padding: "6px 10px", fontSize: 12, borderRadius: 6, border: "none", background: "transparent", color: "var(--dsw-alias-state-error-primary, #e5484d)", cursor: "pointer", textAlign: "left" }}>{lang === "en" ? "Reset history" : t("heatmap.reset")}</button>
            </div>
          ) : null}
        </div>
      </div>

      {view === "week" || view === "month" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => setAnchor((a: string) => { const d = new Date(a + "T12:00:00+08:00"); if (view === "week") d.setDate(d.getDate() - 7); else d.setMonth(d.getMonth() - 1); const ms = d.getTime(); return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" } as any); })} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", cursor: "pointer" }}>{lang === "en" ? "‹ Prev" : "‹ 上一"}{view === "week" ? (lang==="en"?" Week":"周") : (lang==="en"?" Month":"月")}</button>
          <span style={{ fontSize: 12, color: "var(--dsw-alias-label-secondary)", fontWeight: 500 }}>
            {view === "week" ? (()=>{ const a = anchor; const d = new Date(a+"T12:00:00+08:00"); const dow=(d.getDay()+6)%7; const mon=new Date(d); mon.setDate(d.getDate()-dow); const sun=new Date(mon); sun.setDate(mon.getDate()+6); const fmt=(x:Date)=> `${x.getMonth()+1}/${x.getDate()}`; return lang==="en" ? `Week of ${fmt(mon)} - ${fmt(sun)}` : `${mon.getMonth()+1}月${mon.getDate()}日 - ${sun.getMonth()+1}月${sun.getDate()}日`; })() : `${Number(anchor.slice(0,4))}年${Number(anchor.slice(5,7))}月`}
            {lang === "en" && view==="month" ? ` ${anchor.slice(0,7)}` : ""}
          </span>
          <button onClick={() => setAnchor((a: string) => { const d = new Date(a + "T12:00:00+08:00"); if (view === "week") d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1); const ms = d.getTime(); return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" } as any); })} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", cursor: "pointer" }}>{lang === "en" ? "Next ›" : "下一"}{view === "week" ? (lang==="en"?" Week":"周") : (lang==="en"?" Month":"月")} ›</button>
        </div>
      ) : null}

      {totals ? <StatsCards t={lang === "en" ? (k:string,p?:any)=> { const enMap:Record<string,string>={"stats.today":"Today","stats.week":"This week","stats.month":"This month","stats.all":"All time"}; if(k==="stats.count") return `${p?.count ?? ""} turns`; return (enMap as any)[k] ?? t(k,p); } : t} totals={totals} todayCount={undefined} /> : null}
      {days ? <HeatmapGrid t={lang === "en" ? (k:string,p?:any)=> { const enM:Record<string,string>={"view.week":"Week","view.month":"Month","view.quarter":"Quarter","view.year":"Year","heatmap.legend.less":"Less","heatmap.legend.more":"More","heatmap.empty":"No data yet","heatmap.tooltip.none":"No usage","heatmap.subtitle":"Token usage from local session logs, bucketed by Asia/Shanghai. First sync is persisted — deleting sessions keeps history.","heatmap.title":"Token Heatmap"}; return (enM as any)[k] ?? t(k,p); } : t} days={days} view={view} onViewChange={handleViewChange} selectedKey={selectedKey} onSelect={handleSelect} isEn={lang === "en"} /> : null}
      {selectedKey ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--dsw-alias-label-secondary)" }}>
          <span>{tt("heatmap.dayDetail")}</span>
          <button onClick={() => setSelectedKey(null)} style={{ padding: "2px 8px", fontSize: 11, borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", cursor: "pointer" }}>{tt("heatmap.clearSelection")}</button>
        </div>
      ) : null}
      {injectedTop ? (
        <ModelTop5 t={t} topModels={injectedTop} topProviders={[]} days={days ?? undefined} mode={topMode} onModeChange={setTopMode} />
      ) : viewTopModelsNamed.length > 0 || viewTopProvidersNamed.length > 0 ? (
        <ModelTop5 t={lang === "en" ? (k:string,p?:any)=> ({ "model.top5":"Top 5 Models","provider.top5":"Top 5 Providers","model.top5.hint":"By token usage","model.none":"No data","view.model":"Model","view.provider":"Provider"} as any)[k] ?? t(k,p) : t} topModels={viewTopModelsNamed} topProviders={viewTopProvidersNamed} days={days ?? undefined} mode={topMode} onModeChange={setTopMode} />
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
