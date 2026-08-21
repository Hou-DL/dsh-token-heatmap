import assert from "node:assert/strict";
import { test, describe } from "node:test";
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
} from "./date-bucket.ts";

describe("date-bucket", () => {
  test("toDayKey uses Asia/Shanghai", () => {
    assert.equal(toDayKey(Date.UTC(2026, 7, 21, 2, 46, 37, 522)), "2026-08-21");
    assert.equal(toDayKey(Date.UTC(2026, 7, 20, 16, 0, 0)), "2026-08-21");
    assert.equal(toDayKey(Date.UTC(2026, 7, 20, 15, 59, 59, 999)), "2026-08-20");
  });
  test("dayKeyToDate round-trips", () => {
    assert.equal(toDayKey(dayKeyToDate("2026-08-21").getTime()), "2026-08-21");
    assert.equal(toDayKey(dayKeyToDate("2026-01-01").getTime()), "2026-01-01");
  });
  test("weekStartOf Monday", () => {
    assert.equal(weekStartOf("2026-08-21"), "2026-08-17");
    assert.equal(weekStartOf("2026-08-18"), "2026-08-17");
    assert.equal(weekStartOf("2026-08-17"), "2026-08-17");
    assert.equal(weekStartOf("2026-08-16"), "2026-08-10");
  });
  test("quarterStartOf", () => {
    assert.equal(quarterStartOf("2026-08-21"), "2026-07-01");
    assert.equal(quarterStartOf("2026-02-15"), "2026-01-01");
    assert.equal(quarterStartOf("2026-04-01"), "2026-04-01");
    assert.equal(quarterStartOf("2026-12-31"), "2026-10-01");
  });
  test("monthStartOf and yearStartOf", () => {
    assert.equal(monthStartOf("2026-08-21"), "2026-08-01");
    assert.equal(yearStartOf("2026-08-21"), "2026-01-01");
  });
  test("addDays and listDaysInRange", () => {
    assert.equal(addDays("2026-08-21", 1), "2026-08-22");
    assert.equal(addDays("2026-08-21", -1), "2026-08-20");
    assert.deepEqual(listDaysInRange("2026-08-21", "2026-08-23"), ["2026-08-21", "2026-08-22", "2026-08-23"]);
    assert.deepEqual(listDaysInRange("2026-08-21", "2026-08-21"), ["2026-08-21"]);
  });
  test("ranges", () => {
    assert.deepEqual(weekRangeFor("2026-08-21"), ["2026-08-17", "2026-08-23"]);
    assert.deepEqual(monthRangeFor("2026-08-21"), ["2026-08-01", "2026-08-31"]);
    assert.deepEqual(monthRangeFor("2026-02-15"), ["2026-02-01", "2026-02-28"]);
    assert.deepEqual(quarterRangeFor("2026-08-21"), ["2026-07-01", "2026-09-30"]);
    assert.deepEqual(yearRangeFor("2026-08-21"), ["2026-01-01", "2026-12-31"]);
  });
});
