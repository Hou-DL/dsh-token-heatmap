import * as React from "react";
import { SettingsSection } from "./SettingsSection.tsx";
import { zh, en } from "./locales.ts";

const NS = "dsh-token-pulse";

export const inject = ["locale", "slots"] as const;

// CSS: replace default gear with a heatmap/grid icon for this settings entry
const NAV_CSS = `
[data-dsh-token-pulse-nav] > svg:first-child { display: none; }
[data-dsh-token-pulse-nav]::before {
  content: ''; flex: none; width: 16px; height: 16px; background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='7' height='7' rx='1'/%3E%3Crect x='14' y='3' width='7' height='7' rx='1'/%3E%3Crect x='3' y='14' width='7' height='7' rx='1'/%3E%3Crect x='14' y='14' width='7' height='7' rx='1'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='7' height='7' rx='1'/%3E%3Crect x='14' y='3' width='7' height='7' rx='1'/%3E%3Crect x='3' y='14' width='7' height='7' rx='1'/%3E%3Crect x='14' y='14' width='7' height='7' rx='1'/%3E%3C/svg%3E") center / contain no-repeat;
}
`;

function injectNavCss() {
  if (typeof document === "undefined") return;
  const id = "dsh-token-pulse-nav-css";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = NAV_CSS;
  document.head.appendChild(el);
}

function markNavRow() {
  if (typeof document === "undefined") return;
  const nav = t_global();
  // Match by the plugin's own label so future copy changes need only one edit.
  // Legacy strings kept as belt-and-suspenders fallbacks for the icon injection.
  const dynamic = typeof nav === "function" ? nav("nav") : "";
  const labels = [dynamic, "Token Pulse", "Token Heatmap", "用量热图"].filter(Boolean);
  for (const label of labels) {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim().includes(label));
    if (btn) btn.setAttribute("data-dsh-token-pulse-nav", "");
  }
}

let t_global: () => any = () => (k: string) => k;

// One-time migration from the pre-rename `dsh-token-heatmap:*` localStorage
// keys. The plugin was renamed to `dsh-token-pulse`; carry lang, thresholds
// and auto-refresh forward so existing users keep their settings.
function migrateLegacyLocalStorage() {
  if (typeof localStorage === "undefined") return;
  const pairs = [
    ["dsh-token-heatmap:lang", "dsh-token-pulse:lang"],
    ["dsh-token-heatmap:thresholds", "dsh-token-pulse:thresholds"],
    ["dsh-token-heatmap:autoRefreshMinutes", "dsh-token-pulse:autoRefreshMinutes"],
  ] as const;
  for (const [from, to] of pairs) {
    try {
      if (localStorage.getItem(to) === null) {
        const v = localStorage.getItem(from);
        if (v !== null) localStorage.setItem(to, v);
      }
    } catch {}
  }
}

export function apply(ctx: any) {
  migrateLegacyLocalStorage();
  injectNavCss();
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "dsh-token-pulse: dictionaries",
  );
  const t = ctx.locale.bind(NS);
  t_global = () => t;

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "heatmap",
        order: 55,
        label: () => t("nav"),
        locale: NS,
      },
      (props: any) => {
        // Mark nav row on render (settings panel is open, rows are mounted)
        setTimeout(markNavRow, 50);
        return React.createElement(SettingsSection, { t, ctx, ...props });
      },
    ),
  );
  // Also try to mark whenever settings panel opens (poll a bit)
  if (typeof document !== "undefined") {
    const mo = new MutationObserver(() => markNavRow());
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 30000);
  }
}
