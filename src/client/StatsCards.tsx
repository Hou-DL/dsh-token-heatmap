import * as React from "react";

export type Totals = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  all: number;
};

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(2) + "k";
  return n.toLocaleString();
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
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--dsw-alias-label-tertiary)", lineHeight: "18px" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--dsw-alias-label-primary)", lineHeight: "28px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
