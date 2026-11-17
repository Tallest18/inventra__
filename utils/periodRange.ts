// utils/periodRange.ts
// Date ranges behind the Finance summary: one day, one Mon–Sun week, or one
// calendar month. All in LOCAL time (toISOString() would shift the day after
// 11pm in Lagos, which is UTC+1).
import type { Period } from "@/app/types/finance.types";

export interface DateRange {
  start: Date;
  end: Date;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** YYYY-MM-DD in local time, for the API. */
export const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Monday of the week containing d. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export const dayRange = (d: Date): DateRange => ({ start: startOfDay(d), end: startOfDay(d) });
export const weekRange = (d: Date): DateRange => {
  const start = startOfWeek(d);
  return { start, end: addDays(start, 6) };
};
export const monthRange = (year: number, month: number): DateRange => ({
  start: new Date(year, month, 1),
  end: new Date(year, month + 1, 0),
});

export const defaultRange = (period: Period, now = new Date()): DateRange =>
  period === "Today"
    ? dayRange(now)
    : period === "Week"
      ? weekRange(now)
      : monthRange(now.getFullYear(), now.getMonth());

export const summaryTitle = (period: Period) =>
  period === "Today" ? "Daily Summary" : period === "Week" ? "Weekly Summary" : "Monthly Summary";

/** "Nov 16, 2026" · "Nov 10 – 16" · "Oct 27 – Nov 2" · "November 2026" */
export const rangeLabel = (period: Period, r: DateRange): string => {
  if (period === "Today") return `${MONTHS[r.start.getMonth()]} ${r.start.getDate()}, ${r.start.getFullYear()}`;
  if (period === "Month") return `${MONTH_NAMES[r.start.getMonth()]} ${r.start.getFullYear()}`;
  return weekLabel(r);
};

export const weekLabel = (r: DateRange) =>
  r.start.getMonth() === r.end.getMonth()
    ? `${MONTHS[r.start.getMonth()]} ${r.start.getDate()} – ${r.end.getDate()}`
    : `${MONTHS[r.start.getMonth()]} ${r.start.getDate()} – ${MONTHS[r.end.getMonth()]} ${r.end.getDate()}`;

export const shortMonth = (m: number) => MONTHS[m];
