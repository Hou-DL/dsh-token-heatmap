declare const __PLUGIN_VERSION__: string;

import * as React from "react";
import { StatsCards } from "./StatsCards.tsx";
import { HeatmapGrid, type ViewKind, type LevelThresholds, DEFAULT_THRESHOLDS } from "./HeatmapGrid.tsx";
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
  // 分档阈值设置：>= high 恒为深绿(4档)，< low 恒为浅绿(1档)；localStorage 持久化（tokens）
  // UI 上以 M tokens 为单位显示与输入
  const LS_TH_KEY = "dsh-token-heatmap:thresholds";
  const [thresholds, setThresholds] = React.useState<LevelThresholds>(() => {
    try {
      const raw = localStorage.getItem(LS_TH_KEY);
      if (!raw) return DEFAULT_THRESHOLDS;
      const parsed = JSON.parse(raw);
      const high = Number(parsed?.high) || 0;
      const low = Number(parsed?.low) || 0;
      return { high: Math.max(0, high), low: Math.max(0, low) };
    } catch { return DEFAULT_THRESHOLDS; }
  });
  // 弹出式设置窗口（⋯ 打开），点遮罩/完成关闭；内部不再互相退出
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const applyThresholdsM = (highM: number, lowM: number) => {
    setThresholds({ high: Math.max(0, highM) * 1_000_000, low: Math.max(0, lowM) * 1_000_000 });
  };
  const thInM = { high: thresholds.high / 1_000_000, low: thresholds.low / 1_000_000 };
  const applyThresholds = (t: LevelThresholds) => {
    setThresholds(t);
    try { localStorage.setItem(LS_TH_KEY, JSON.stringify(t)); } catch {}
  };
  // ⋯ 菜单：显式开关 + 点击外部自动收回

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
        <button
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          style={{ listStyle: "none", cursor: "pointer", padding: "2px 8px", fontSize: 13, color: "var(--dsw-alias-label-tertiary)", opacity: 0.7, border: "none", background: "transparent" }}
          title={lang === "en" ? "Settings" : "设置"}
        >⋯</button>

        {settingsOpen ? (
          <div
            onClick={() => setSettingsOpen(false)}   // 点遮罩关闭
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}     // 内容区阻止冒泡，不关窗
              style={{
                background: "var(--dsw-alias-bg-layer-3)",
                border: "1px solid var(--dsw-alias-border-l2)",
                borderRadius: 12,
                minWidth: 340,
                maxWidth: "90vw",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                padding: 16,
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dsw-alias-label-primary)" }}>
                  {lang === "en" ? "Heatmap Settings" : "热图设置"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() => { if (confirm(lang === "en" ? "Reset all historical data? This cannot be undone." : "确定重置所有历史数据？此操作不可撤销。")) { handleReset(); } }}
                    title={lang === "en" ? "Reset history (advanced)" : "重置历史（高级）"}
                    style={{ border: "none", background: "transparent", fontSize: 11, cursor: "pointer", color: "var(--dsw-alias-label-tertiary)", opacity: 0.55, textDecoration: "underline" }}
                  >
                    {lang === "en" ? "Reset history…" : "重置历史…"}
                  </button>
                  <button onClick={() => setSettingsOpen(false)} aria-label="close" style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "var(--dsw-alias-label-tertiary)" }}>✕</button>
                </div>
              </div>

              {/* 分档阈值 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-secondary)" }}>
                  {lang === "en" ? "Level thresholds (M tokens)" : "分档阈值（M tokens）"}
                </div>
                {([
                  { key: "high" as const, label: lang === "en" ? "Deep green ≥ (M)" : "深绿阈值 ≥（M）" },
                  { key: "low" as const, label: lang === "en" ? "Light green < (M)" : "浅绿阈值 <（M）" },
                ]).map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11, color: "var(--dsw-alias-label-secondary)" }}>
                    {label}
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={thInM[key]}
                      onChange={(e) => applyThresholdsM(
                        key === "high" ? Math.max(0, Number(e.target.value) || 0) : thInM.high,
                        key === "low" ? Math.max(0, Number(e.target.value) || 0) : thInM.low,
                      )}
                      placeholder="0 = off"
                      style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", color: "var(--dsw-alias-label-primary)" }}
                    />
                  </label>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => applyThresholds(DEFAULT_THRESHOLDS)} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 5, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", cursor: "pointer" }}>{lang === "en" ? "Defaults (100M / 10M)" : "恢复默认（100M / 10M）"}</button>
                  <span style={{ fontSize: 10, color: "var(--dsw-alias-label-tertiary)" }}>0 = off</span>
                </div>
              </div>

              <button onClick={() => setSettingsOpen(false)} style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-3)", color: "var(--dsw-alias-label-primary)", cursor: "pointer" }}>
                {lang === "en" ? "Done" : "完成"}
              </button>
            </div>
          </div>
        ) : null}
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
      {days ? <HeatmapGrid t={lang === "en" ? (k:string,p?:any)=> { const enM:Record<string,string>={"view.week":"Week","view.month":"Month","view.quarter":"Quarter","view.year":"Year","heatmap.legend.less":"Less","heatmap.legend.more":"More","heatmap.empty":"No data yet","heatmap.tooltip.none":"No usage","heatmap.subtitle":"Token usage from local session logs, bucketed by Asia/Shanghai. First sync is persisted — deleting sessions keeps history.","heatmap.title":"Token Heatmap"}; return (enM as any)[k] ?? t(k,p); } : t} days={days} view={view} onViewChange={handleViewChange} selectedKey={selectedKey} onSelect={handleSelect} isEn={lang === "en"} thresholds={thresholds} /> : null}
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
