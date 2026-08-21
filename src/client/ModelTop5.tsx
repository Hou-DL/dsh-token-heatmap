import * as React from "react";
import type { DayAgg } from "../aggregation.ts";

export type TopItem = { model?: string; provider?: string; name: string; tokens: number };

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function ModelTop5({
  t,
  topModels,
  topProviders,
  days,
  mode = "model",
  onModeChange,
}: {
  t: (k: string, p?: any) => string;
  topModels: TopItem[];
  topProviders: TopItem[];
  days?: DayAgg[];
  mode?: "model" | "provider";
  onModeChange?: (m: "model" | "provider") => void;
}) {
  const active = mode === "provider" ? topProviders : topModels;

  if (active.length === 0) {
    return (
      <div
        style={{
          border: "1px solid var(--dsw-alias-border-l2)",
          background: "var(--dsw-alias-bg-layer-3)",
          borderRadius: 12,
          padding: 16,
          color: "var(--dsw-alias-label-tertiary)",
          fontSize: 13,
        }}
      >
        {t("model.none")}
      </div>
    );
  }

  const max = active[0]?.tokens ?? 1;

  const winners: Array<{ dayKey: string; name: string }> = [];
  if (days) {
    for (const d of days) {
      const w = mode === "provider" ? d.winnerProvider : d.winnerModel;
      if (w) winners.push({ dayKey: d.dayKey, name: w });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          border: "1px solid var(--dsw-alias-border-l2)",
          background: "var(--dsw-alias-bg-layer-3)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px 8px",
            borderBottom: "1px solid var(--dsw-alias-border-l2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary)" }}>
              {mode === "provider" ? t("provider.top5") : t("model.top5")}
            </span>
            <span style={{ fontSize: 11, color: "var(--dsw-alias-label-tertiary)" }}>{t("model.top5.hint")}</span>
          </div>
          {onModeChange ? (
            <div style={{ display: "inline-flex", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 6, overflow: "hidden" }}>
              <button
                onClick={() => onModeChange("model")}
                style={{
                  padding: "2px 8px",
                  fontSize: 11,
                  border: "none",
                  cursor: "pointer",
                  background: mode === "model" ? "var(--dsw-alias-label-primary)" : "transparent",
                  color: mode === "model" ? "var(--dsw-alias-bg-layer-3)" : "var(--dsw-alias-label-secondary)",
                }}
              >
                {t("view.model")}
              </button>
              <button
                onClick={() => onModeChange("provider")}
                style={{
                  padding: "2px 8px",
                  fontSize: 11,
                  border: "none",
                  cursor: "pointer",
                  background: mode === "provider" ? "var(--dsw-alias-label-primary)" : "transparent",
                  color: mode === "provider" ? "var(--dsw-alias-bg-layer-3)" : "var(--dsw-alias-label-secondary)",
                }}
              >
                {t("view.provider")}
              </button>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {active.map((item, idx) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderTop: idx === 0 ? "none" : "1px solid var(--dsw-alias-border-l2)",
              }}
            >
              <span style={{ width: 20, textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-tertiary)" }}>
                {idx + 1}
              </span>
              <span
                style={{
                  flex: "0 1 40%",
                  minWidth: 0,
                  fontSize: 13,
                  color: "var(--dsw-alias-label-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={item.name}
              >
                {item.name}
              </span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--dsw-alias-bg-layer-2, #ebedf0)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(4, (item.tokens / max) * 100)}%`, height: "100%", background: "#40c463", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--dsw-alias-label-secondary)", whiteSpace: "nowrap" }}>
                {formatTokens(item.tokens)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {winners.length > 0 ? (
        <div
          style={{
            border: "1px solid var(--dsw-alias-border-l2)",
            background: "var(--dsw-alias-bg-layer-3)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-primary)", marginBottom: 8 }}>
            {t(mode === "provider" ? "provider.winner" : "model.winner")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {winners.slice(0, 14).map((w) => (
              <span
                key={w.dayKey}
                title={`${w.dayKey}: ${w.name}`}
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: "var(--dsw-alias-bg-layer-2, #f0f0f0)",
                  color: "var(--dsw-alias-label-secondary)",
                  border: "1px solid var(--dsw-alias-border-l2)",
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {w.dayKey.slice(5)} {w.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ModelTop5;
