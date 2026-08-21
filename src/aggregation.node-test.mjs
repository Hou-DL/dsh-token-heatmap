import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { aggregate, clampLevel } from "./aggregation.ts";

describe("aggregation", () => {
  test("aggregates day/week/month/all and top5", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 21, 1, 0, 0), provider: "commandcode", model: "A", usage: { inputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 5 } },
      { time: Date.UTC(2026, 7, 20, 1, 0, 0), provider: "commandcode", model: "B", usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
      { time: Date.UTC(2026, 7, 15, 1, 0, 0), provider: "commandcode", model: "A", usage: { inputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 1 } },
    ];
    const a = aggregate(events, now);
    assert.equal(a.byDay.get("2026-08-21").totalTokens, 15);
    assert.equal(a.totals.today, 15);
    assert.equal(a.totals.thisWeek, 115);
    assert.equal(a.totals.all, 117);
    assert.deepEqual(a.top5[0], { model: "B", tokens: 100 });
    assert.equal(a.byDay.get("2026-08-21").winnerModel, "A");
  });
  test("handles cache tokens and counts", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 21, 1, 0, 0), provider: "p", model: "M", usage: { inputTokens: 10, cacheReadTokens: 20, cacheWriteTokens: 5, outputTokens: 7 } },
    ];
    const a = aggregate(events, now);
    const d = a.byDay.get("2026-08-21");
    assert.equal(d.totalTokens, 42);
    assert.equal(d.uncachedInputTokens, 10);
    assert.equal(d.cacheReadTokens, 20);
    assert.equal(d.cacheWriteTokens, 5);
    assert.equal(d.outputTokens, 7);
    assert.equal(d.count, 1);
  });
  test("view windows fill missing days", () => {
    const now = Date.UTC(2026, 7, 15, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 15, 1, 0, 0), provider: "p", model: "A", usage: { inputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
    ];
    const a = aggregate(events, now);
    const week = a.weekDays("2026-08-15");
    assert.equal(week.length, 7);
    assert.equal(week.find((d) => d.dayKey === "2026-08-15").totalTokens, 5);
    assert.equal(week.find((d) => d.dayKey === "2026-08-11").totalTokens, 0);
    const month = a.monthDays("2026-08-15");
    assert.equal(month.length, 31);
    const quarter = a.quarterDays("2026-08-15");
    assert.equal(quarter.length, 92);
    const year = a.yearDays("2026-08-15");
    assert.equal(year.length, 365);
  });
  test("clampLevel", () => {
    assert.equal(clampLevel(0), 0);
    assert.equal(clampLevel(1), 1);
    assert.equal(clampLevel(2000), 1);
    assert.equal(clampLevel(2001), 2);
    assert.equal(clampLevel(10000), 2);
    assert.equal(clampLevel(10001), 3);
    assert.equal(clampLevel(50000), 3);
    assert.equal(clampLevel(50001), 4);
  });
  test("top5InWindow scopes", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 21, 1, 0, 0), provider: "p", model: "A", usage: { inputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
      { time: Date.UTC(2026, 7, 20, 1, 0, 0), provider: "p", model: "B", usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
      { time: Date.UTC(2026, 7, 10, 1, 0, 0), provider: "p", model: "C", usage: { inputTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
    ];
    const a = aggregate(events, now);
    const week = a.weekDays("2026-08-21");
    const topWeek = a.top5InWindow(week);
    assert.equal(topWeek.find((x) => x.model === "C"), undefined);
    assert.equal(topWeek[0].model, "B");
  });
});
