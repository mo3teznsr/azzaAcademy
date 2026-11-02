import { describe, expect, test } from 'bun:test';
import { CalendarTokenSigner } from '../src/modules/me/calendar-token';
import { buildIcs, escapeText, foldLine } from '../src/modules/me/ics-calendar';

const now = new Date('2026-11-02T10:00:00Z');

describe('ICS builder', () => {
  test('writes one VEVENT per session in UTC with CRLF endings', () => {
    const ics = buildIcs(
      'Azza',
      [
        {
          uid: 's1@azza',
          start: new Date('2026-11-24T15:00:00Z'),
          end: new Date('2026-11-24T16:30:00Z'),
          summary: 'Product Design Foundations B07·S05 — Information architecture',
          url: 'http://web.test/live/s1',
          status: 'SCHEDULED',
          updatedAt: now,
        },
        { uid: 's2@azza', start: now, end: now, summary: 'Moved; cancelled, sorry', status: 'CANCELLED', updatedAt: now },
      ],
      now,
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20261124T150000Z');
    expect(ics).toContain('DTEND:20261124T163000Z');
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('SUMMARY:Moved\; cancelled\\, sorry');
  });

  test('escapes text and folds long lines at 75 octets (UTF-8 aware)', () => {
    expect(escapeText('a\\b\nc')).toBe('a\\\\b\\nc');
    const long = `SUMMARY:${'أساسيات تصميم المنتجات '.repeat(6)}`;
    const folded = foldLine(long);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(long);
  });
});

describe('calendar feed token', () => {
  test('verifies only the token signed for that user', () => {
    const signer = new CalendarTokenSigner('x'.repeat(32));
    const token = signer.sign('sara');
    expect(signer.verify('sara', token)).toBe(true);
    expect(signer.verify('lina', token)).toBe(false);
    expect(signer.verify('sara', 'deadbeef')).toBe(false);
    expect(new CalendarTokenSigner('y'.repeat(32)).verify('sara', token)).toBe(false);
  });
});
