import * as React from "react";
import { clampLevel, type DayAgg } from "../aggregation.ts";

export type ViewKind = "week" | "month" | "quarter" | "year";

const VIEW_ORDER: ViewKind[] = ["week", "month", "quarter", "year"];

function formatTooltip(day: DayAgg, t: (k: string, p?: any) => string): string {
  if (day.totalTokens === 0) return `${day.dayKey}: ${t("heatmap.tooltip.none")}`;
  const models = [...day.byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m, v]) => `${m}: ${v}`)
    .join(", ");
  const base = `${day.dayKey}: ${day.totalTokens} tokens`;
  if (models) return `${base} (${models})${day.winnerModel ? ` · ${t("model.winner")}: ${day.winnerModel}` : ""}`;
  return base;
}

function HeatCell({ day, t }: { day: DayAgg; t: (k: string, p?: any) => string }) {
  const level = clampLevel(day.totalTokens);
  const colors: Record<number, string> = {
    0: "var(--dsw-alias-bg-layer-2, #ebedf0)",
    1: "#9be9a8",
    2: "#40c463",
    3: "#30a14e",
    4: "#216e39",
  };
  return (
    <div
      title={formatTooltip(day, t)}
      aria-label={formatTooltip(day, t)}
      style={{
        width: 12,
        height: 12,
        borderRadius: 2,
        background: colors[level],
        border: level === 0 ? "1px solid var(--dsw-alias-border-l2, #e5e7eb)" : "1px solid transparent",
        boxSizing: "border-box",
        cursor: "pointer",
      }}
    />
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
            padding: "6px 12px",
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

function MonthLabels({ days }: { days: DayAgg[] }) {
  // Show month abbreviation at the first day of each month in the range
  const seen = new Set<string>();
  return (
    <div style={{ display: "flex", gap: 3, fontSize: 10, color: "var(--dsw-alias-label-tertiary)", marginBottom: 4, overflow: "hidden" }}>
      {days.map((d) => {
        const m = d.dayKey.slice(0, 7);
        if (seen.has(m)) return <span key={d.dayKey} style={{ width: 12, flexShrink: 0 }} />;
        seen.add(m);
        const label = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m.slice(5, 7)) - 1];
        return (
          <span key={d.dayKey} style={{ width: 12, flexShrink: 0, overflow: "visible", whiteSpace: "nowrap" }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

export function HeatmapGrid({
  t,
  days,
  view,
  onViewChange,
}: {
  t: (k: string, p?: any) => string;
  days: DayAgg[];
  view: ViewKind;
  onViewChange: (v: ViewKind) => void;
}) {
  const isWeek = view === "week";
  const isYear = view === "year";

  // For week: single row of 7
  // For month/quarter: grid with week-wrap (7 per row)
  // For year: GitHub-style 53 weeks (columns = weeks, rows = Mon..Sun)

  const hasAny = days.some((d) => d.totalTokens > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ViewSwitcher t={t} value={view} onChange={onViewChange} />

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
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <span style={{ width: 28, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" }} />
            {days.map((d) => (
              <span key={d.dayKey} style={{ width: 12, textAlign: "center", fontSize: 10, color: "var(--dsw-alias-label-tertiary)" }}>
                {d.dayKey.slice(8, 10)}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <span style={{ width: 28, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" }} />
            {days.map((d) => (
              <HeatCell key={d.dayKey} day={d} t={t} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 11, color: "var(--dsw-alias-label-tertiary)" }}>
            <span style={{ width: 28 }} />
            {days.map((d) => (
              <span key={d.dayKey} style={{ width: 12, textAlign: "center", fontSize: 10 }}>{String(new Date(d.dayKey + "T12:00:00+08:00").getDay() || 7)}</span>
            ))}
          </div>
        </div>
      ) : isYear ? (
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {/* Row labels */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 16 }}>
              <span style={{ height: 12, fontSize: 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: "12px" }}>Mon</span>
              <span style={{ height: 12 }} />
              <span style={{ height: 12, fontSize: 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: "12px" }}>Wed</span>
              <span style={{ height: 12 }} />
              <span style={{ height: 12, fontSize: 10, color: "var(--dsw-alias-label-tertiary)", lineHeight: "12px" }}>Fri</span>
              <span style={{ height: 12 }} />
              <span style={{ height: 12 }} />
            </div>
            {/* Year grid: days are chronological; need to pad to Monday start */}
            <div style={{ display: "flex", gap: 3 }}>
              {(() => {
                // Group into weeks (Mon..Sun)
                const weeks: DayAgg[][] = [];
                let cur: DayAgg[] = [];
                for (const d of days) {
                  const dow = (new Date(d.dayKey + "T12:00:00+08:00").getDay() + 6) % 7; // Mon=0
                  if (cur.length === 0 && weeks.length === 0 && dow !== 0) {
                    // pad first week with empties
                    for (let i = 0; i < dow; i++) {
                      cur.push({ dayKey: `pad-${i}`, totalTokens: -1, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, count: 0, byModel: new Map(), winnerModel: null });
                    }
                  }
                  cur.push(d);
                  if (cur.length === 7) {
                    weeks.push(cur);
                    cur = [];
                  }
                }
                if (cur.length > 0) {
                  while (cur.length < 7) cur.push({ dayKey: `pad-end-${cur.length}`, totalTokens: -1, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, count: 0, byModel: new Map(), winnerModel: null });
                  weeks.push(cur);
                }
                return weeks.map((week, wi) => (
                  <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {week.map((d) =>
                      d.totalTokens === -1 ? (
                        <div key={d.dayKey} style={{ width: 12, height: 12 }} />
                      ) : (
                        <HeatCell key={d.dayKey} day={d} t={t} />
                      ),
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {(() => {
            const rows: DayAgg[][] = [];
            let cur: DayAgg[] = [];
            // For month/quarter: days already Monday-aligned via listDaysInRange from XXXStartOf
            // So just chunk by 7
            for (let i = 0; i < days.length; i++) {
              cur.push(days[i]);
              if (cur.length === 7 || i === days.length - 1) {
                rows.push(cur);
                cur = [];
              }
            }
            // Pad first row to Mon start if needed
            if (rows.length > 0) {
              const firstDay = rows[0][0];
              const dow = (new Date(firstDay.dayKey + "T12:00:00+08:00").getDay() + 6) % 7;
              if (dow !== 0) {
                const pad: DayAgg[] = [];
                for (let i = 0; i < dow; i++) pad.push({ dayKey: `pad-${i}`, totalTokens: -1, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, count: 0, byModel: new Map(), winnerModel: null });
                rows[0] = [...pad, ...rows[0]];
              }
            }
            return rows.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 3 }}>
                {row.map((d) =>
                  d.totalTokens === -1 ? (
                    <div key={d.dayKey} style={{ width: 12, height: 12 }} />
                  ) : (
                    <HeatCell key={d.dayKey} day={d} t={t} />
                  ),
                )}
              </div>
            ));
          })()}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", fontSize: 12, color: "var(--dsw-alias-label-tertiary)" }}>
        <span>{t("heatmap.legend.less")}</span>
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "var(--dsw-alias-bg-layer-2, #ebedf0)", border: "1px solid var(--dsw-alias-border-l2)" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#9be9a8" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#40c463" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#30a14e" }} />
        <span style={{ width: 12, height: 12, borderRadius: 2, background: "#216e39" }} />
        <span>{t("heatmap.legend.more")}</span>
      </div>
    </div>
  );
}

export default HeatmapGrid;
