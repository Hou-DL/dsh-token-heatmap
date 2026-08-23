import * as React from "react";
import { levelForView, type DayAgg } from "../aggregation.ts";

export type ViewKind = "week" | "month" | "quarter" | "year";

const VIEW_ORDER: ViewKind[] = ["week", "month", "quarter", "year"];

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(2) + "k";
  return n.toLocaleString();
}

function tooltipTotal(day: DayAgg): string {
  if (day.totalTokens === 0) return `${day.dayKey}: No usage`;
  return `${day.dayKey}: ${formatTokensShort(day.totalTokens)} tokens`;
}

function HeatCell({ day, viewMax, size = 14 }: { day: DayAgg; viewMax: number; size?: number }) {
  const level = levelForView(day.totalTokens, viewMax);
  const colors: Record<number, string> = {
    0: "var(--dsw-alias-bg-layer-2, #ebedf0)",
    1: "#c6e48b",
    2: "#7bc96f",
    3: "#239a3b",
    4: "#196127",
  };
  return (
    <div
      title={tooltipTotal(day)}
      aria-label={tooltipTotal(day)}
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        background: colors[level],
        border: level === 0 ? "1px solid var(--dsw-alias-border-l2, #e5e7eb)" : "1px solid transparent",
        boxSizing: "border-box",
        cursor: "pointer",
        flexShrink: 0,
      }}
    />
  );
}

/** Same quantile language as levelForView: 0, (0,25%], (25%,50%], (50%,75%], (75%,100%]. */
function miniLevel(v: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (v === 0 || max === 0) return 0;
  const r = v / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

function HourStrip({ day, weekMax }: { day: DayAgg; weekMax: number }) {
  const hourly = day.hourlyTokens ?? new Array(24).fill(0);
  const colors: Record<number, string> = {
    0: "var(--dsw-alias-bg-layer-2, #ebedf0)",
    1: "#c6e48b",
    2: "#7bc96f",
    3: "#239a3b",
    4: "#196127",
  };
  return (
    <div style={{ display: "flex", gap: 1, alignItems: "end", flex: 1, minWidth: 0 }}>
      {hourly.map((v, h) => {
        const lv = miniLevel(v, weekMax);
        const hh = v === 0 ? `${String(h).padStart(2, "0")}:00 — No usage` : `${String(h).padStart(2, "0")}:00 — ${formatTokensShort(v)} tokens`;
        return (
          <div
            key={h}
            title={hh}
            aria-label={hh}
            style={{
              flex: 1,
              height: 6 + lv * 4,
              borderRadius: 1,
              background: colors[lv],
              border: lv === 0 ? "1px solid var(--dsw-alias-border-l2)" : "none",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          />
        );
      })}
    </div>
  );
}

function ViewSwitcher({
  t,
  value,
  onChange,
}: {
  t: (k: string, p?: any) => string;
  value: ViewKind;
  onChange: (v: ViewKind) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="view switcher"
      style={{
        display: "inline-flex",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--dsw-alias-bg-layer-3)",
      }}
    >
      {VIEW_ORDER.map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            lineHeight: "20px",
            border: "none",
            cursor: "pointer",
            background: value === v ? "var(--dsw-alias-label-primary)" : "transparent",
            color: value === v ? "var(--dsw-alias-bg-layer-3)" : "var(--dsw-alias-label-primary)",
            fontWeight: value === v ? 600 : 400,
          }}
        >
          {t(`view.${v}`)}
        </button>
      ))}
    </div>
  );
}

function MonthHeader({ weeks, cellSize }: { weeks: DayAgg[][]; cellSize: number }) {
  const seen = new Set<string>();
  return (
    <div style={{ display: "flex", gap: 3, paddingLeft: cellSize + 20, marginBottom: 2 }}>
      {weeks.map((week, i) => {
        const m = week.find((d) => d.totalTokens !== -1)?.dayKey.slice(0, 7) ?? "";
        let label = "";
        if (m && !seen.has(m)) { seen.add(m); const n = Number(m.slice(5,7)); label = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][n-1]; }
        return <span key={i} style={{ width: cellSize, fontSize: 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: "12px", whiteSpace: "nowrap", overflow: "visible" }}>{label}</span>;
      })}
    </div>
  );
}

function GitHubGrid({ days, t, cellSize, twoRows, isEn }: { days: DayAgg[]; t: (k: string, p?: any) => string; cellSize: number; twoRows?: boolean; isEn?: boolean }) {
  const viewMax = days.reduce((m, d) => Math.max(m, d.totalTokens), 1);
  const weeks: DayAgg[][] = [];
  let cur: DayAgg[] = [];
  for (const d of days) {
    const rawDow = new Date(d.dayKey + "T12:00:00+08:00").getDay();
    const dow = isEn ? rawDow : (rawDow + 6) % 7;
    if (cur.length === 0 && weeks.length === 0 && dow !== 0) {
      for (let i = 0; i < dow; i++) {
        cur.push({ dayKey: `pad-${i}`, totalTokens: -1, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, count: 0, byModel: new Map(), byProvider: new Map(), hourlyTokens: new Array(24).fill(0), winnerModel: null, winnerProvider: null });
      }
    }
    cur.push(d);
    if (cur.length === 7) {
      weeks.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) {
    while (cur.length < 7) cur.push({ dayKey: `pad-end-${cur.length}`, totalTokens: -1, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, count: 0, byModel: new Map(), byProvider: new Map(), hourlyTokens: new Array(24).fill(0), winnerModel: null, winnerProvider: null });
    weeks.push(cur);
  }

  const renderWeeks = (ws: DayAgg[][]) => (
    <div style={{ display: "flex", gap: cellSize >= 22 ? 10 : 5 }}>
      {ws.map((week, wi) => (
        <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {week.map((d) =>
            d.totalTokens === -1 ? (
              <div key={d.dayKey} style={{ width: cellSize, height: cellSize }} />
            ) : (
              <HeatCell key={d.dayKey} day={d} viewMax={viewMax} size={cellSize} />
            ),
          )}
        </div>
      ))}
    </div>
  );

  if (twoRows && weeks.length > 26) {
    const mid = Math.ceil(weeks.length / 2);
    const top = weeks.slice(0, mid);
    const bot = weeks.slice(mid);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <div>
          <MonthHeader weeks={top} cellSize={cellSize} />
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ height: cellSize, fontSize: cellSize >= 22 ? 13 : 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: `${cellSize}px` }}>{isEn ? "Sun" : "Mon"}</span>
              <span style={{ height: cellSize }} />
              <span style={{ height: cellSize, fontSize: cellSize >= 22 ? 13 : 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: `${cellSize}px` }}>{isEn ? "Tue" : "Wed"}</span>
              <span style={{ height: cellSize }} />
              <span style={{ height: cellSize, fontSize: cellSize >= 22 ? 13 : 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: `${cellSize}px` }}>{isEn ? "Thu" : "Fri"}</span>
              <span style={{ height: cellSize }} />
              <span style={{ height: cellSize }} />
            </div>
            {renderWeeks(top)}
          </div>
        </div>
        <div>
          <MonthHeader weeks={bot} cellSize={cellSize} />
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ height: cellSize, fontSize: cellSize >= 22 ? 13 : 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: `${cellSize}px` }}>{isEn ? "Sun" : "Mon"}</span>
              <span style={{ height: cellSize }} />
              <span style={{ height: cellSize, fontSize: cellSize >= 22 ? 13 : 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: `${cellSize}px` }}>{isEn ? "Tue" : "Wed"}</span>
              <span style={{ height: cellSize }} />
              <span style={{ height: cellSize, fontSize: cellSize >= 22 ? 13 : 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: `${cellSize}px` }}>{isEn ? "Thu" : "Fri"}</span>
              <span style={{ height: cellSize }} />
              <span style={{ height: cellSize }} />
            </div>
            {renderWeeks(bot)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <MonthHeader weeks={weeks} cellSize={cellSize} />
      <div style={{ display: "flex", gap: cellSize >= 22 ? 10 : 5, justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: cellSize >= 22 ? 13 : 10, color: "var(--dsw-alias-label-tertiary)" }}>
          {(isEn ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]).map((w, i) => (
            <span key={w} style={{ height: cellSize, lineHeight: `${cellSize}px`, textAlign: "right", paddingRight: 4, fontWeight: 500 }}>{w}</span>
          ))}
        </div>
        {renderWeeks(weeks)}
      </div>
    </div>
  );
}

function CalendarGrid({ days, t, viewMax, selectedKey, onSelect, isEn }: { days: DayAgg[]; t: (k:string,p?:any)=>string; viewMax: number; selectedKey: string | null; onSelect: (k: string | null) => void; isEn?: boolean }) {
  const weekdaysZh = ["一","二","三","四","五","六","日"];
  const weekdaysEn = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const isZh = (t("heatmap.title") || "").includes("Token") ? false : false;
  // Use locale-aware: check if nav is Chinese
  const header = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const headerZh = ["一","二","三","四","五","六","日"];
  // Simple: show Mon-Sun always (github style), but tint weekend header
  const firstDow = firstDowOf(days);
  const pad = firstDow;
  const cells: (DayAgg | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (const d of days) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function firstDowOf(ds: DayAgg[]): number {
    if (ds.length === 0) return 0;
    const raw = new Date(ds[0].dayKey + "T12:00:00+08:00").getDay();
    return isEn ? raw : (raw + 6) % 7;
  }

  return (
    <div style={{ border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 12, overflow: "hidden", background: "var(--dsw-alias-bg-layer-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, padding: "8px 6px 6px" }}>
        {(isEn ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] : header).map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 500, color: "var(--dsw-alias-label-tertiary)" }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, padding: "0 6px" }}>
        {cells.map((d, idx) => {
          if (!d) return <div key={`pad-${idx}`} style={{ minHeight: 50 }} />;
          const selected = d.dayKey === selectedKey;
          const level = levelForView(d.totalTokens, viewMax);
          const bgMap: Record<number,string> = { 0: "var(--dsw-alias-bg-layer-3)", 1: "#c6e48b", 2: "#7bc96f", 3: "#239a3b", 4: "#196127" };
          return (
            <button
              key={d.dayKey}
              onClick={() => onSelect(selected ? null : d.dayKey)}
              title={tooltipTotal(d)}
              aria-label={tooltipTotal(d)}
              style={{
                minHeight: 50,
                padding: "6px 6px 4px",
                textAlign: "left",
                border: selected ? "1.5px solid var(--dsw-alias-brand-primary, #1677ff)" : "1px solid var(--dsw-alias-border-l2, #e5e7eb)",
                borderRadius: 8,
                background: selected ? "var(--dsw-alias-brand-primary, #1677ff)" : bgMap[level],
                color: selected ? "#fff" : level === 0 ? "var(--dsw-alias-label-primary)" : level <= 2 ? "#1a1a1a" : "#fff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, lineHeight: "16px" }}>{d.dayKey.slice(8, 10).replace(/^0/, "")}</span>
              <span style={{ fontSize: 10, lineHeight: "12px", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.totalTokens > 0 ? formatTokensShort(d.totalTokens) : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HeatmapGrid({
  t,
  days,
  view,
  onViewChange,
  selectedKey,
  onSelect,
  isEn,
}: {
  t: (k: string, p?: any) => string;
  days: DayAgg[];
  view: ViewKind;
  onViewChange: (v: ViewKind) => void;
  selectedKey?: string | null;
  onSelect?: (k: string | null) => void;
  isEn?: boolean;
}) {
  const isWeek = view === "week";
  const hasAny = days.some((d) => d.totalTokens > 0);
  const viewMax = days.reduce((m, d) => Math.max(m, d.totalTokens), 1);
  // Week-view hour bars are colored against the whole week's peak hour (cross-day comparable)
  const weekMax = days.reduce(
    (m, d) => Math.max(m, ...(d.hourlyTokens ?? [])),
    1,
  );
  const cellSize = isWeek ? 16 : view === "quarter" ? 23 : (view === "year" ? 14 : 14);

  const handleViewChange = (v: ViewKind) => {
    onSelect?.(null);
    onViewChange(v);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <ViewSwitcher t={t} value={view} onChange={handleViewChange} />

      {!hasAny ? (
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

      {isWeek ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {days.map((d) => {
            const wd = new Date(d.dayKey + "T12:00:00+08:00").getDay();
            const weekday = isEn
              ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][wd]
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(wd + 6) % 7];
            const sel = d.dayKey === selectedKey;
            return (
              <button
                key={d.dayKey}
                onClick={() => onSelect?.(sel ? null : d.dayKey)}
                title={tooltipTotal(d)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, minWidth: 0, width: "100%",
                  padding: "6px 8px", borderRadius: 8,
                  border: sel ? "1px solid var(--dsw-alias-brand-primary)" : "1px solid transparent",
                  background: sel ? "var(--dsw-alias-bg-layer-2)" : "transparent",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-primary)", lineHeight: "16px" }}>{weekday}</span>
                  <span style={{ fontSize: 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: "12px" }}>{d.dayKey.slice(5)}</span>
                </div>
                <HourStrip day={d} weekMax={weekMax} />
                <span style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary)", whiteSpace: "nowrap", width: 80, textAlign: "right" }}>
                  {d.totalTokens === 0 ? "No usage" : `${formatTokensShort(d.totalTokens)} tokens`}
                </span>
              </button>
            );
          })}
        </div>
      ) : view === "month" ? (
        <CalendarGrid days={days} t={t} viewMax={viewMax} selectedKey={selectedKey ?? null} onSelect={onSelect ?? (() => {})} isEn={isEn} />
      ) : view === "year" ? (
        <GitHubGrid days={days} t={t} cellSize={cellSize} twoRows isEn={isEn} />
      ) : (
        <GitHubGrid days={days} t={t} cellSize={cellSize} isEn={isEn} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", fontSize: 12, color: "var(--dsw-alias-label-tertiary)" }}>
        <span>{t("heatmap.legend.less")}</span>
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "var(--dsw-alias-bg-layer-2, #ebedf0)", border: "1px solid var(--dsw-alias-border-l2)" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#c6e48b" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#7bc96f" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#239a3b" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#196127" }} />
        <span>{t("heatmap.legend.more")}</span>
      </div>
    </div>
  );
}

export default HeatmapGrid;
