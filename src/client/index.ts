import * as React from "react";
import { SettingsSection } from "./SettingsSection.tsx";
import { zh, en } from "./locales.ts";

const NS = "dsh-token-heatmap";

export function apply(ctx: any) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "dsh-token-heatmap: dictionaries",
  );
  const t = ctx.locale.bind(NS);

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "heatmap",
        order: 55,
        label: () => t("nav"),
        locale: NS,
      },
      (props: any) => React.createElement(SettingsSection, { t, ctx, ...props }),
    ),
  );
}
