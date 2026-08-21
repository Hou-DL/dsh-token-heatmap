import { HeatmapStore } from "./host/store.ts";

export const name = "dsh-token-heatmap";
export const inject = ["sessions"] as const;

export function apply(ctx: any) {
  const store = new HeatmapStore(ctx);
  ctx.provide("heatmapStore", store);

  (ctx as any).heatmapStore = store;

  let disposed = false;

  store.init().catch((e: unknown) => {
    ctx.logger?.warn?.(`dsh-token-heatmap init failed: ${String(e)}`);
  });

  ctx.on("session/event", (_session: any, event: any) => {
    if (disposed) return;
    store.ingest(event);
  });

  ctx.on("session/flush", () => {});

  ctx.effect(
    () => () => {
      disposed = true;
      store.dispose();
    },
    "dsh-token-heatmap.dispose",
  );

  ctx.logger.info("dsh-token-heatmap host up");
}
