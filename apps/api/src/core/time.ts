// Timezone helpers on top of Intl (no extra dependency).

function tzOffsetMs(utc: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(utc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - utc.getTime();
}

/** "2026-11-24" + "19:00" in "Asia/Dubai" → the UTC instant. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let utc = guess - tzOffsetMs(new Date(guess), timeZone);
  // second pass settles DST edges
  utc = guess - tzOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

/** Calendar helpers on plain YYYY-MM-DD strings. */
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return isoDay(new Date(Date.UTC(y, m - 1, d + days)));
}
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
export const addHours = (d: Date, hours: number) => addMinutes(d, hours * 60);

export function formatInZone(d: Date, timeZone: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
