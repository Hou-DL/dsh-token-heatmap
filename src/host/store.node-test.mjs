import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { parseUsageEvents } from "./session-reader.ts";
import { HeatmapStore } from "./store.ts";

describe("parseUsageEvents", () => {
  test("parses assistant/message with source", () => {
    const evs = [
      { type: "request/header", time: 1000, data: { header: { config: { provider: "p1", model: "m1" } } } },
      { type: "assistant/message", time: 2000, seq: 10, data: { turn: 1, step: 1, message: { source: { provider: "p1", model: "m1" } }, usage: { inputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 5 } } },
    ];
    const out = parseUsageEvents(evs);
    assert.equal(out.length, 1);
    assert.equal(out[0].model, "m1");
    assert.equal(out[0].usage.inputTokens, 10);
  });

  test("chunk provisional is overwritten by message", () => {
    const evs = [
      { type: "request/header", time: 1000, data: { header: { config: { provider: "p", model: "M" } } } },
      { type: "assistant/chunk", time: 1500, data: { turn: 1, step: 1, chunk: { type: "usage", usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 } } } },
      { type: "assistant/message", time: 2000, seq: 10, data: { turn: 1, step: 1, message: { source: { provider: "p", model: "M" } }, usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } } },
    ];
    const out = parseUsageEvents(evs);
    assert.equal(out.length, 1);
    assert.equal(out[0].usage.inputTokens, 10);
  });

  test("multiple messages aggregate", () => {
    const evs = [
      { type: "assistant/message", time: Date.UTC(2026, 7, 21, 1, 0, 0), seq: 1, data: { turn: 1, step: 1, message: { source: { provider: "p", model: "A" } }, usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } } },
      { type: "assistant/message", time: Date.UTC(2026, 7, 21, 2, 0, 0), seq: 2, data: { turn: 1, step: 2, message: { source: { provider: "p", model: "A" } }, usage: { inputTokens: 20, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 } } },
    ];
    const out = parseUsageEvents(evs);
    assert.equal(out.length, 2);
  });
});

describe("HeatmapStore ingest", () => {
  test("incremental ingest dedups chunk then message", () => {
    const store = new HeatmapStore({});
    store.initialized = true;
    store.ingest({ type: "request/header", data: { header: { config: { provider: "p", model: "M" } } } });
    store.ingest({ type: "assistant/chunk", time: 1000, data: { turn: 1, step: 1, chunk: { type: "usage", usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 } } } });
    assert.equal(store.getAggregated().byDay.size, 1);
    // Now message for same turn:step should replace provisional
    store.ingest({ type: "assistant/message", time: 2000, seq: 10, data: { turn: 1, step: 1, message: { source: { provider: "p", model: "M" } }, usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } } });
    const agg = store.getAggregated();
    // Should still be 1 day, but total updated from 7 to 15
    const day = [...agg.byDay.values()][0];
    assert.equal(day.totalTokens, 15);
  });
});

describe("HeatmapStore getAggregated cache", () => {
  test("ingest invalidates memoized agg within TTL", () => {
    const store = new HeatmapStore({});
    store.initialized = true;
    // ingest a chunk (provisional) then message (authoritative, replaces)
    store.ingest({ type: "request/header", data: { header: { config: { provider: "p", model: "M" } } } });
    store.ingest({ type: "assistant/message", time: Date.UTC(2026, 7, 21, 1, 0, 0), seq: 1, data: { turn: 1, step: 1, message: { source: { provider: "p", model: "M" } }, usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } } });
    const agg1 = store.getAggregated();
    const day1 = agg1.byDay.get("2026-08-21");
    assert.equal(day1.totalTokens, 15);

    // Add another message for same day -> should invalidate cache
    store.ingest({ type: "assistant/message", time: Date.UTC(2026, 7, 21, 2, 0, 0), seq: 2, data: { turn: 1, step: 2, message: { source: { provider: "p", model: "M" } }, usage: { inputTokens: 30, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } } });
    const agg2 = store.getAggregated();
    const day2 = agg2.byDay.get("2026-08-21");
    assert.equal(day2.totalTokens, 45, "cache must invalidate after ingest");

    // Third one without new events should hit cache (same object maybe not, but same values)
    const agg3 = store.getAggregated();
    assert.equal(agg3.byDay.get("2026-08-21").totalTokens, 45);
  });
});
