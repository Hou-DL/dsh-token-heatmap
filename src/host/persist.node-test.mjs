import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { mergePersistedAndLive } from "./persist.ts";

function day(key, total, byModel = {}, byProvider = {}) {
  return {
    dayKey: key,
    totalTokens: total,
    uncachedInputTokens: total,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    count: 1,
    byModel: new Map(Object.entries(byModel)),
    byProvider: new Map(Object.entries(byProvider)),
    winnerModel: Object.keys(byModel)[0] ?? null,
    winnerProvider: Object.keys(byProvider)[0] ?? null,
  };
}

describe("mergePersistedAndLive", () => {
  test("keeps persisted when live shrinks (session deletion)", () => {
    const persisted = new Map([["2026-08-21", day("2026-08-21", 100, { A: 100 }, { P1: 100 })]]);
    const live = new Map([["2026-08-21", day("2026-08-21", 60, { A: 60 }, { P1: 60 })]]);
    const merged = mergePersistedAndLive(persisted, live);
    assert.equal(merged.get("2026-08-21").totalTokens, 100);
    assert.equal(merged.get("2026-08-21").byModel.get("A"), 100);
  });
  test("grows when new events arrive", () => {
    const persisted = new Map([["2026-08-21", day("2026-08-21", 100, { A: 100 }, { P1: 100 })]]);
    const live = new Map([["2026-08-21", day("2026-08-21", 150, { A: 150 }, { P1: 150 })]]);
    const merged = mergePersistedAndLive(persisted, live);
    assert.equal(merged.get("2026-08-21").totalTokens, 150);
  });
  test("new day appears", () => {
    const persisted = new Map();
    const live = new Map([["2026-08-21", day("2026-08-21", 10, { A: 10 }, { P1: 10 })]]);
    const merged = mergePersistedAndLive(persisted, live);
    assert.equal(merged.get("2026-08-21").totalTokens, 10);
  });
  test("old day without live is preserved", () => {
    const persisted = new Map([["2026-08-20", day("2026-08-20", 50, { A: 50 }, { P1: 50 })]]);
    const live = new Map();
    const merged = mergePersistedAndLive(persisted, live);
    assert.equal(merged.get("2026-08-20").totalTokens, 50);
  });
  test("per-model max merge", () => {
    const persisted = new Map([["2026-08-21", day("2026-08-21", 100, { A: 100 }, { P1: 100 })]]);
    const live = new Map([["2026-08-21", day("2026-08-21", 80, { A: 30, B: 50 }, { P1: 30, P2: 50 })]]);
    const merged = mergePersistedAndLive(persisted, live);
    // A stays max(100,30)=100, B new 50 appears
    assert.equal(merged.get("2026-08-21").byModel.get("A"), 100);
    assert.equal(merged.get("2026-08-21").byModel.get("B"), 50);
    assert.equal(merged.get("2026-08-21").byProvider.get("P1"), 100);
    assert.equal(merged.get("2026-08-21").byProvider.get("P2"), 50);
  });
});
