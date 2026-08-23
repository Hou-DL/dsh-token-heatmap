const TZ = "Asia/Shanghai";

export function toDayKey(ms: number, tz = TZ): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(ms));
}

export function dayKeyToDate(key: string, _tz = TZ): Date {
  return new Date(key + "T12:00:00+08:00");
}

export function weekStartOf(dayKey: string): string {
  const d = dayKeyToDate(dayKey);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return toDayKey(d.getTime());
}

export function monthStartOf(dayKey: string): string {
  const d = dayKeyToDate(dayKey);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function quarterStartOf(dayKey: string): string {
  const d = dayKeyToDate(dayKey);
  const q = Math.floor(d.getMonth() / 3);
  const m = q * 3 + 1;
  return `${d.getFullYear()}-${String(m).padStart(2, "0")}-01`;
}

export function yearStartOf(dayKey: string): string {
  const d = dayKeyToDate(dayKey);
  return `${d.getFullYear()}-01-01`;
}

export function addDays(dayKey: string, n: number): string {
  const d = dayKeyToDate(dayKey);
  d.setDate(d.getDate() + n);
  return toDayKey(d.getTime());
}

export function listDaysInRange(startKey: string, endKey: string): string[] {
  const result: string[] = [];
  let cur = startKey;
  while (cur <= endKey) {
    result.push(cur);
    cur = addDays(cur, 1);
  }
  return result;
}

export function weekRangeFor(dateKey: string): [string, string] {
  const s = weekStartOf(dateKey);
  return [s, addDays(s, 6)];
}

export function monthRangeFor(dateKey: string): [string, string] {
  const s = monthStartOf(dateKey);
  const d = dayKeyToDate(s);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return [s, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`];
}

/** Last ~90 days: sliding window for the "Quarter" tab (not calendar quarter). */
export function quarterRangeFor(dateKey: string): [string, string] {
  return [addDays(dateKey, -89), dateKey];
}

export function yearRangeFor(dateKey: string): [string, string] {
  const s = yearStartOf(dateKey);
  const d = dayKeyToDate(s);
  return [s, `${d.getFullYear()}-12-31`];
}
