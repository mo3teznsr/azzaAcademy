import type { BatchSummary, LiveSession, ScheduleRule } from '@/lib/api/types';
import type { Formatters } from '@/lib/i18n/format';

export const COVER_BG: Record<string, string> = {
  sun: 'var(--sun)',
  sky: 'var(--sky)',
  sage: 'var(--sage)',
  peach: 'var(--peach)',
};
export const coverBg = (style: string | null | undefined) => COVER_BG[style ?? 'sun'] ?? COVER_BG.sun;

export function addMinutesHHMM(hhmm: string, minutes: number): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** "Tue & Thu · 19:00–20:30" */
type RuleLike = Pick<ScheduleRule, 'weekdays' | 'startTime' | 'durationMin'>;

export function describeRule(batch: { schedule: RuleLike | null }, f: Formatters, joiner = ' & '): string {
  const rule = batch.schedule;
  if (!rule) return '';
  const days = [...rule.weekdays].sort((a, b) => a - b).map((d) => f.weekdayName(d));
  return `${days.join(joiner)} · ${rule.startTime}–${addMinutesHHMM(rule.startTime, rule.durationMin)}`;
}

export function batchPriceFils(batch: Pick<BatchSummary, 'priceFils'>): number {
  return batch.priceFils;
}

export function minutesUntil(iso: string, now = Date.now()) {
  return Math.round((new Date(iso).getTime() - now) / 60000);
}

/** Derived display state for a session row (adds SOON and MOVED to the API status). */
export type SessionDisplayState = 'LIVE' | 'SOON' | 'SCHEDULED' | 'MOVED' | 'ENDED' | 'CANCELLED';
export function sessionState(s: Pick<LiveSession, 'status' | 'startsAt' | 'movedFrom'>, now = Date.now()): SessionDisplayState {
  if (s.status === 'LIVE') return 'LIVE';
  if (s.status === 'ENDED') return 'ENDED';
  if (s.status === 'CANCELLED') return 'CANCELLED';
  const mins = minutesUntil(s.startsAt, now);
  if (mins <= 15 && mins > -5) return 'SOON';
  if (s.movedFrom) return 'MOVED';
  return 'SCHEDULED';
}

export const initials = (name: string | null | undefined) =>
  (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

const AVATAR_TONES = ['var(--sun)', 'var(--sky)', 'var(--sage)', 'var(--peach)'];
export const toneFor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length]!;
};

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Offset (ms) of `timeZone` from UTC at instant `at`. */
function zoneOffsetMs(timeZone: string, at: number): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'), n('second')) - Math.floor(at / 1000) * 1000;
}

/** "2026-11-12" + "19:00" read as wall time in `timeZone` → ISO instant (null when unparsable). */
export function zonedToUtcIso(date: string, time: string, timeZone: string): string | null {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if (![y, mo, d, h, mi].every((v) => Number.isFinite(v))) return null;
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  let at = wall - zoneOffsetMs(timeZone, wall);
  at = wall - zoneOffsetMs(timeZone, at); // second pass settles DST edges
  return new Date(at).toISOString();
}

/** ISO instant → `{ date: 'YYYY-MM-DD', time: 'HH:MM' }` as wall time in `timeZone`. */
export function zonedParts(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso));
  const v = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { date: `${v('year')}-${v('month')}-${v('day')}`, time: `${v('hour')}:${v('minute')}` };
}
