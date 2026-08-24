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

  ctx.on("session/event", (session: any, event: any) => {
    if (disposed) return;
    // Tag with the session id so per-session turn/step keys never collide.
    store.ingest({ ...event, sid: session?.id ?? "" });
  });

  ctx.on("session/flush", () => {});

  // Serve persisted data for browser client via /api/dsh-token-heatmap/daily.json
  let unregisterRoute: (() => void) | null = null;
  ctx.inject(["webServer"], (wsCtx: any) => {
    try {
      const handler = (req: any, res: any) => {
        try {
          const agg = store.getAggregated();
          const days = [...agg.byDay.values()].map((d) => ({
            dayKey: d.dayKey,
            totalTokens: d.totalTokens,
            uncachedInputTokens: d.uncachedInputTokens,
            cacheReadTokens: d.cacheReadTokens,
            cacheWriteTokens: d.cacheWriteTokens,
            outputTokens: d.outputTokens,
            count: d.count,
            byModel: Object.fromEntries(d.byModel),
            byProvider: Object.fromEntries(d.byProvider),
            hourlyTokens: d.hourlyTokens,
            winnerModel: d.winnerModel,
            winnerProvider: d.winnerProvider,
          }));
          const body = JSON.stringify({
            version: 1 as const,
            totals: agg.totals,
            topModels: agg.topModels.map((x) => ({ name: x.model, tokens: x.tokens })),
            topProviders: agg.topProviders.map((x) => ({ name: x.provider, tokens: x.tokens })),
            days,
          });
          res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(body);
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(e) }));
        }
      };
      unregisterRoute = wsCtx.webServer.register({ kind: "exact", path: "/api/dsh-token-heatmap/daily.json", handler });
      ctx.logger.info("dsh-token-heatmap: registered /api/dsh-token-heatmap/daily.json");
    } catch (e) {
      ctx.logger?.warn?.(`dsh-token-heatmap route register failed: ${String(e)}`);
    }
  });

  ctx.effect(
    () => () => {
      disposed = true;
      store.dispose();
      if (unregisterRoute) try { unregisterRoute(); } catch {}
    },
    "dsh-token-heatmap.dispose",
  );

  ctx.logger.info("dsh-token-heatmap host up");
}
