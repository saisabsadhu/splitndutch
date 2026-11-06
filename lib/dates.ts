export function nowISO(): string {
  return new Date().toISOString();
}

/** The app's calendar day. Defaults to India time so "today" doesn't flip at 5:30 am IST on a UTC server. */
const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ || "Asia/Kolkata";

export function todayISO(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${m}-${d}`;
  }
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)).toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TZ,
  });
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 1));
  return dt.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export type RepeatInterval = "weekly" | "monthly";

/** Dates after `start` that are due by `until` and not already posted. */
export function dueOccurrences(
  start: string,
  interval: RepeatInterval,
  until: string,
  existing: Set<string>,
  limit = 36,
): string[] {
  const out: string[] = [];
  let cursor = start;
  for (let i = 0; i < limit; i++) {
    cursor = interval === "weekly" ? addDays(cursor, 7) : addMonths(cursor, 1);
    if (cursor > until) break;
    if (!existing.has(cursor)) out.push(cursor);
  }
  return out;
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
