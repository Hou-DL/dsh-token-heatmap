import { describe, it, expect } from "vitest";
import { aggregate, clampLevel } from "./aggregation.js";

describe("aggregation", () => {
  it("aggregates day/week/month/all and top5", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 21, 1, 0, 0), provider: "commandcode", model: "A", usage: { inputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 5 } },
      { time: Date.UTC(2026, 7, 20, 1, 0, 0), provider: "commandcode", model: "B", usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
      { time: Date.UTC(2026, 7, 15, 1, 0, 0), provider: "commandcode", model: "A", usage: { inputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 1 } },
    ];
    const a = aggregate(events, now);
    expect(a.byDay.get("2026-08-21")!.totalTokens).toBe(15);
    expect(a.totals.today).toBe(15);
    expect(a.totals.thisWeek).toBe(115);
    expect(a.totals.all).toBe(117);
    expect(a.top5[0]).toEqual({ model: "B", tokens: 100 });
    expect(a.byDay.get("2026-08-21")!.winnerModel).toBe("A");
  });

  it("handles cache tokens and counts", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 21, 1, 0, 0), provider: "p", model: "M", usage: { inputTokens: 10, cacheReadTokens: 20, cacheWriteTokens: 5, outputTokens: 7 } },
    ];
    const a = aggregate(events, now);
    const d = a.byDay.get("2026-08-21")!;
    expect(d.totalTokens).toBe(42);
    expect(d.uncachedInputTokens).toBe(10);
    expect(d.cacheReadTokens).toBe(20);
    expect(d.cacheWriteTokens).toBe(5);
    expect(d.outputTokens).toBe(7);
    expect(d.count).toBe(1);
  });

  it("view windows fill missing days with zeros", () => {
    const now = Date.UTC(2026, 7, 15, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 15, 1, 0, 0), provider: "p", model: "A", usage: { inputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
    ];
    const a = aggregate(events, now);
    const week = a.weekDays("2026-08-15");
    expect(week.length).toBe(7);
    expect(week.find((d) => d.dayKey === "2026-08-15")!.totalTokens).toBe(5);
    expect(week.find((d) => d.dayKey === "2026-08-11")!.totalTokens).toBe(0);

    const month = a.monthDays("2026-08-15");
    expect(month.length).toBe(31);
    const quarter = a.quarterDays("2026-08-15");
    expect(quarter.length).toBe(92); // Jul-Sep 2026: 31+31+30
    const year = a.yearDays("2026-08-15");
    expect(year.length).toBe(365);
  });

  it("clampLevel thresholds", () => {
    expect(clampLevel(0)).toBe(0);
    expect(clampLevel(1)).toBe(1);
    expect(clampLevel(2000)).toBe(1);
    expect(clampLevel(2001)).toBe(2);
    expect(clampLevel(10000)).toBe(2);
    expect(clampLevel(10001)).toBe(3);
    expect(clampLevel(50000)).toBe(3);
    expect(clampLevel(50001)).toBe(4);
  });

  it("top5InWindow scopes to window", () => {
    const now = Date.UTC(2026, 7, 21, 10, 0, 0);
    const events = [
      { time: Date.UTC(2026, 7, 21, 1, 0, 0), provider: "p", model: "A", usage: { inputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
      { time: Date.UTC(2026, 7, 20, 1, 0, 0), provider: "p", model: "B", usage: { inputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
      { time: Date.UTC(2026, 7, 10, 1, 0, 0), provider: "p", model: "C", usage: { inputTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 } },
    ];
    const a = aggregate(events, now);
    const week = a.weekDays("2026-08-21");
    const topWeek = a.top5InWindow(week);
    expect(topWeek.find((x) => x.model === "C")).toBeUndefined();
    expect(topWeek[0].model).toBe("B");
  });
});
