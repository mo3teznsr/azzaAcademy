import type { Locale } from '@azza/shared';

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Locale-aware formatters. Arabic uses Western digits too (docs/BRAND.md: Western digits everywhere, even in Arabic runs). */
export function makeFormatters(locale: Locale, timeZone?: string) {
  const tag = locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB';
  const tz = safeTz(timeZone);
  const plural = new Intl.PluralRules(locale);
  const cache = new Map<string, Intl.DateTimeFormat>();
  const dtf = (opts: Intl.DateTimeFormatOptions, zone = tz) => {
    const key = JSON.stringify([opts, zone]);
    let f = cache.get(key);
    if (!f) {
      f = new Intl.DateTimeFormat(tag, { ...opts, timeZone: zone });
      cache.set(key, f);
    }
    return f;
  };
  const toDate = (d: string | number | Date) => (d instanceof Date ? d : new Date(d));

  return {
    tag,
    number: (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(tag, opts).format(n),
    percent: (n: number) => new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 }).format(n / 100),
    date: (d: string | Date, zone?: string) => dtf({ weekday: 'short', day: 'numeric', month: 'short' }, safeTz(zone) ?? tz).format(toDate(d)),
    dateLong: (d: string | Date, zone?: string) =>
      dtf({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, safeTz(zone) ?? tz).format(toDate(d)),
    dayMonth: (d: string | Date, zone?: string) => dtf({ day: 'numeric', month: 'short' }, safeTz(zone) ?? tz).format(toDate(d)),
    weekday: (d: string | Date, zone?: string) => dtf({ weekday: 'short' }, safeTz(zone) ?? tz).format(toDate(d)),
    dayNum: (d: string | Date, zone?: string) => dtf({ day: 'numeric' }, safeTz(zone) ?? tz).format(toDate(d)),
    monthYear: (d: string | Date) => dtf({ month: 'long', year: 'numeric' }).format(toDate(d)),
    time: (d: string | Date, zone?: string) =>
      dtf({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, safeTz(zone) ?? tz).format(toDate(d)),
    dateTime: (d: string | Date, zone?: string) =>
      dtf({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, safeTz(zone) ?? tz).format(toDate(d)),
    weekdayName: (index: number) => {
      // 0 = Sunday; 2023-01-01 was a Sunday
      return new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + index)));
    },
    plural: (n: number, forms: PluralForms) => (forms[plural.select(n)] ?? forms.other).replace('{n}', new Intl.NumberFormat(tag).format(n)),
  };
}

export type Formatters = ReturnType<typeof makeFormatters>;

function safeTz(tz?: string): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

/** Replace {name} placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Latin timecode HH:MM:SS from seconds. */
export function timecode(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Slate ID like B07·S05 — always Latin. */
export const slate = (batchCode: string, sessionNumber?: number) =>
  sessionNumber === undefined ? batchCode : `${batchCode}·S${String(sessionNumber).padStart(2, '0')}`;

export const sessionCode = (n: number) => `S${String(n).padStart(2, '0')}`;

export function gmtOffset(timeZone: string, at = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    return part ?? timeZone;
  } catch {
    return timeZone;
  }
}
