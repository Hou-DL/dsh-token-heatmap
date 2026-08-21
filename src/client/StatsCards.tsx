import * as React from "react";

export type Totals = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  all: number;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

type CardProps = {
  label: string;
  value: number;
  hint?: string;
};

function StatCard({ label, value, hint }: CardProps) {
  return (
    <div
      style={{
        border: "1px solid var(--dsw-alias-border-l2)",
        background: "var(--dsw-alias-bg-layer-3)",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--dsw-alias-label-tertiary)", lineHeight: "18px" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--dsw-alias-label-primary)", lineHeight: "28px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {formatTokens(value)}
      </div>
      {hint ? <div style={{ fontSize: 12, color: "var(--dsw-alias-label-tertiary)", lineHeight: "16px" }}>{hint}</div> : null}
    </div>
  );
}

export function StatsCards({
  t,
  totals,
  todayCount,
}: {
  t: (key: string, params?: Record<string, any>) => string;
  totals: Totals;
  todayCount?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
      }}
    >
      <StatCard label={t("stats.today")} value={totals.today} hint={todayCount !== undefined ? t("stats.count", { count: todayCount }) : undefined} />
      <StatCard label={t("stats.week")} value={totals.thisWeek} />
      <StatCard label={t("stats.month")} value={totals.thisMonth} />
      <StatCard label={t("stats.all")} value={totals.all} />
    </div>
  );
}

export default StatsCards;
