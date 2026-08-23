import { describe, it, expect } from "vitest";
import {
  toDayKey,
  dayKeyToDate,
  weekStartOf,
  quarterStartOf,
  monthStartOf,
  yearStartOf,
  addDays,
  listDaysInRange,
  weekRangeFor,
  monthRangeFor,
  quarterRangeFor,
  yearRangeFor,
} from "./date-bucket.js";

describe("date-bucket", () => {
  it("toDayKey uses Asia/Shanghai", () => {
    // 2026-08-21 02:46 UTC = 2026-08-21 10:46 CST
    expect(toDayKey(Date.UTC(2026, 7, 21, 2, 46, 37, 522))).toBe("2026-08-21");
    // 2026-08-20 16:00 UTC = 2026-08-21 00:00 CST (boundary)
    expect(toDayKey(Date.UTC(2026, 7, 20, 16, 0, 0))).toBe("2026-08-21");
    // 2026-08-20 15:59:59 UTC = 2026-08-20 23:59:59 CST (just before midnight)
    expect(toDayKey(Date.UTC(2026, 7, 20, 15, 59, 59, 999))).toBe("2026-08-20");
  });

  it("dayKeyToDate round-trips", () => {
    expect(toDayKey(dayKeyToDate("2026-08-21").getTime())).toBe("2026-08-21");
    expect(toDayKey(dayKeyToDate("2026-01-01").getTime())).toBe("2026-01-01");
  });

  it("weekStartOf Monday", () => {
    expect(weekStartOf("2026-08-21")).toBe("2026-08-17"); // Fri -> Mon
    expect(weekStartOf("2026-08-18")).toBe("2026-08-17"); // Mon -> Mon
    expect(weekStartOf("2026-08-17")).toBe("2026-08-17"); // Mon itself
    expect(weekStartOf("2026-08-16")).toBe("2026-08-10"); // Sun -> prev Mon
  });

  it("quarterStartOf", () => {
    expect(quarterStartOf("2026-08-21")).toBe("2026-07-01");
    expect(quarterStartOf("2026-02-15")).toBe("2026-01-01");
    expect(quarterStartOf("2026-04-01")).toBe("2026-04-01");
    expect(quarterStartOf("2026-12-31")).toBe("2026-10-01");
  });

  it("monthStartOf and yearStartOf", () => {
    expect(monthStartOf("2026-08-21")).toBe("2026-08-01");
    expect(yearStartOf("2026-08-21")).toBe("2026-01-01");
  });

  it("addDays and listDaysInRange", () => {
    expect(addDays("2026-08-21", 1)).toBe("2026-08-22");
    expect(addDays("2026-08-21", -1)).toBe("2026-08-20");
    expect(listDaysInRange("2026-08-21", "2026-08-23")).toEqual(["2026-08-21", "2026-08-22", "2026-08-23"]);
    expect(listDaysInRange("2026-08-21", "2026-08-21")).toEqual(["2026-08-21"]);
  });

  it("ranges", () => {
    expect(weekRangeFor("2026-08-21")).toEqual(["2026-08-17", "2026-08-23"]);
    expect(monthRangeFor("2026-08-21")).toEqual(["2026-08-01", "2026-08-31"]);
    expect(monthRangeFor("2026-02-15")).toEqual(["2026-02-01", "2026-02-28"]);
    // Quarter is now a sliding 90-day window ending today
    expect(quarterRangeFor("2026-08-21")[1]).toBe("2026-08-21");
    expect(yearRangeFor("2026-08-21")).toEqual(["2026-01-01", "2026-12-31"]);
  });
});
