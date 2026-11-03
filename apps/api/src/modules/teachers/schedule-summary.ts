const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * One-line schedule for cards: `{ weekdays: [2, 4], startTime: '19:00', sessionCount: 12 }` → "Tue & Thu · 19:00 · 12 sessions".
 * Weekdays are listed Monday-first (Sunday last), like the batch screens. Without a rule → null.
 */
export function scheduleSummary(rule: { weekdays: number[]; startTime: string; sessionCount: number } | null): string | null {
  if (!rule) return null;
  const days = [...new Set(rule.weekdays)]
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => WEEKDAYS[d]!);
  const dayText = days.length > 1 ? `${days.slice(0, -1).join(', ')} & ${days.at(-1)}` : (days[0] ?? '');
  const count = `${rule.sessionCount} ${rule.sessionCount === 1 ? 'session' : 'sessions'}`;
  return [dayText, rule.startTime, count].filter(Boolean).join(' · ');
}
