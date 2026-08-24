import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { aggregate, clampLevel, levelByRank, logLevel, MIN_RANK_POINTS } from "./aggregation.ts";

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
    assert.equal(quarter.length, 90); // sliding 90-day window
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

describe("hourly bucketing", () => {
  test("midnight hour lands in bucket 0 (not 24)", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    // 2026-08-21 00:30 Shanghai = 2026-08-20 16:30 UTC
    const events = [
      { time: Date.UTC(2026, 7, 20, 16, 30, 0), provider: "p", model: "M", usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
    ];
    const a = aggregate(events, now);
    const day = a.byDay.get("2026-08-21");
    assert.ok(day, "event should land on 2026-08-21 (Shanghai)");
    assert.equal(day.hourlyTokens[0], 100, "midnight CST should increment hour 0");
    assert.equal(day.hourlyTokens.reduce((s, v) => s + v, 0), 100, "no tokens lost to hour 24");
  });

  test("23:59 lands in bucket 23", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 21, 15, 59, 0), provider: "p", model: "M", usage: { inputTokens: 42, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
    ];
    const a = aggregate(events, now);
    const day = a.byDay.get("2026-08-21");
    assert.ok(day);
    assert.equal(day.hourlyTokens[23], 42);
  });
});

describe("rank-based bucketing (outlier-proof)", () => {
  // 10 days: one huge outlier (1000), rest small (1..10)
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000];

  test("max value is always level 4; four colored levels all appear", () => {
    // midpoint ranks for sorted=[1..9,1000], n=10:
    // 1:.05->1 2:.15->1 3:.25->1 4:.35->2 5:.45->2 6:.55->3 7:.65->3 8:.75->3 9:.85->4 1000:.95->4
    assert.equal(levelByRank(1, sorted), 1);
    assert.equal(levelByRank(3, sorted), 1);
    assert.equal(levelByRank(5, sorted), 2);
    assert.equal(levelByRank(6, sorted), 3);
    assert.equal(levelByRank(8, sorted), 3);
    assert.equal(levelByRank(9, sorted), 4);
    assert.equal(levelByRank(1000, sorted), 4); // max always top
  });

  test("zero always maps to level 0", () => {
    assert.equal(levelByRank(0, sorted), 0);
  });

  test("ties share the same midpoint rank; max stays top", () => {
    const withTies = [5, 5, 5, 5, 5, 5, 10];
    // 5: midpoint rank (0 + 6/7)/2 ≈ .429 -> 2; 10: (6/7+7/7)/2 ≈ .93 -> 4
    assert.equal(levelByRank(5, withTies), 2);
    assert.equal(levelByRank(10, withTies), 4);
  });

  test("empty non-zero array maps any positive value to level 1", () => {
    assert.equal(levelByRank(50, []), 1);
  });

  test("logLevel fallback: monotonic and outlier-compressed", () => {
    const viewMax = 1_000_000;
    assert.equal(logLevel(0, viewMax), 0);
    assert.equal(logLevel(10, viewMax), 1);
    assert.equal(logLevel(1_000_000, viewMax), 4);
    assert.ok(logLevel(500_000, viewMax) >= logLevel(100, viewMax));
  });

  test("max maps to 4 even with few points; UI falls back to logLevel below 5", () => {
    const sparse = [1, 1000];
    // midpoint rank on 2 points: 1 -> (.0+.5)/2=.25 -> 1; 1000 -> (.5+1)/2=.75 -> 3
    assert.equal(levelByRank(1, sparse), 1);
    assert.equal(levelByRank(1000, sparse), 3);
    // UI uses logLevel when non-zero count < MIN_RANK_POINTS (5)
    // log1p(1)/log1p(1000) = 0.693/6.909 ≈ 0.10 -> level 1 (deeply compressed)
    assert.equal(logLevel(1, 1000), 1);
  });
});

