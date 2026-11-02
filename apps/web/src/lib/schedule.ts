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

export function batchPriceFils(batch: Pick<BatchSummary, 'priceFils' | 'course'>): number {
  return batch.priceFils ?? batch.course.priceFils;
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
