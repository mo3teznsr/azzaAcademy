import { describe, expect, test } from 'bun:test';
import { compact, lineHash, matchStatementLines, withOccurrences, type OpenTransfer } from '../src/modules/reconciliation/statement-matcher';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const transfers: OpenTransfer[] = [
  { kind: 'SEAT', id: 'o1', reference: 'AZ-B08-48213', totalFils: 92_400, status: 'AWAITING_RECEIPT', userName: 'Sara Ahmed', createdAt: d('2026-11-01') },
  { kind: 'SEAT', id: 'o2', reference: 'AZ-B08-51234', totalFils: 92_400, status: 'VERIFYING', userName: 'Omar Khalid', createdAt: d('2026-11-01') },
  { kind: 'PLAN', id: 'p1', reference: 'AZ-REC-20001', totalFils: 52_395, status: 'AWAITING_REVIEW', userName: 'محمد علي', createdAt: d('2026-11-02') },
  { kind: 'PLAN', id: 'p2', reference: 'AZ-REC-30003', totalFils: 52_395, status: 'AWAITING_RECEIPT', userName: 'Maya Haddad', createdAt: d('2026-11-03') },
];
const line = (id: string, description: string, amountFils: number, postedOn = '2026-11-04') => ({ id, description, amountFils, postedOn: d(postedOn) });

describe('statement matcher', () => {
  test('exact: reference in the text and the amount equals the total', () => {
    const [m] = matchStatementLines([line('l1', 'IPI TRF SARA AHMED REF AZ-B08-48213', 92_400)], transfers);
    expect(m).toEqual({ lineId: 'l1', kind: 'EXACT', transfer: { kind: 'SEAT', id: 'o1' }, suggestions: [] });
  });

  test('references match whatever the case, spacing or separators, and in Arabic text', () => {
    const lines = [line('a', 'ref az b08 51234', 92_400), line('b', 'تحويل المرجع AZREC20001', 52_395), line('c', 'AZ/REC/٣٠٠٠٣', 52_395)];
    expect(matchStatementLines(lines, transfers).map((m) => [m.kind, m.transfer?.id])).toEqual([
      ['EXACT', 'o2'],
      ['EXACT', 'p1'],
      ['EXACT', 'p2'],
    ]);
    expect(compact('az-b08 / 48213')).toBe('AZB0848213');
  });

  test('amount differs: reference found, money short or over', () => {
    const [m] = matchStatementLines([line('l1', 'AZ-B08-48213', 90_000)], transfers);
    expect(m).toMatchObject({ kind: 'AMOUNT_DIFFERS', transfer: { id: 'o1' } });
  });

  test('not found: same amount shortly before is a weak suggestion, the student name ranks first', () => {
    const [m] = matchStatementLines([line('l1', 'TRANSFER FROM MAYA HADDAD', 52_395)], transfers);
    expect(m!.kind).toBe('SUGGESTED');
    expect(m!.transfer).toBeNull();
    expect(m!.suggestions.map((s) => s.id)).toEqual(['p2', 'p1']);
    expect(m!.suggestions[0]!.score).toBeGreaterThan(m!.suggestions[1]!.score);
  });

  test('not found outside the date window or at another amount: unmatched', () => {
    expect(matchStatementLines([line('l1', 'MAYA HADDAD', 52_395, '2026-12-30')], transfers)[0]!.kind).toBe('UNMATCHED');
    expect(matchStatementLines([line('l2', 'MAYA HADDAD', 10_000)], transfers)[0]!.kind).toBe('UNMATCHED');
    expect(matchStatementLines([line('l3', 'AZ-B99-00000', 92_400, '2026-10-01')], transfers)[0]!.kind).toBe('UNMATCHED');
  });

  test('duplicate: a line imported before, or a second line naming a transfer already claimed', () => {
    const ms = matchStatementLines(
      [{ ...line('old', 'AZ-B08-48213', 92_400), known: true }, line('l1', 'AZ-B08-51234', 92_400), line('l2', 'again AZ-B08-51234', 92_400)],
      transfers,
    );
    expect(ms.map((m) => m.kind)).toEqual(['DUPLICATE', 'EXACT', 'DUPLICATE']);
    expect(ms[2]!.transfer).toEqual({ kind: 'SEAT', id: 'o2' });
  });

  test('a claimed transfer is no longer suggested for another line', () => {
    const ms = matchStatementLines([line('l1', 'AZ-REC-30003', 52_395), line('l2', 'MAYA', 52_395)], transfers);
    expect(ms[1]!.suggestions.map((s) => s.id)).toEqual(['p1']);
  });

  test('the longest reference wins when one contains another', () => {
    const ts: OpenTransfer[] = [
      { ...transfers[0]!, id: 'short', reference: 'AZ-B08-4821' },
      { ...transfers[0]!, id: 'long', reference: 'AZ-B08-48213' },
    ];
    expect(matchStatementLines([line('l1', 'AZ-B08-48213', 92_400)], ts)[0]!.transfer?.id).toBe('long');
  });

  test('line hash is stable across spacing and case, and two equal lines in one file stay two', () => {
    const a = lineHash('enbd', d('2026-11-04'), 92_400, 'IPI  TRF  Sara', 0);
    expect(lineHash('enbd', d('2026-11-04'), 92_400, 'ipi trf sara', 0)).toBe(a);
    expect(lineHash('enbd', d('2026-11-04'), 92_400, 'ipi trf sara', 1)).not.toBe(a);
    expect(lineHash('adcb', d('2026-11-04'), 92_400, 'ipi trf sara', 0)).not.toBe(a);
    const occ = withOccurrences([line('x', 'Fee', 100), line('y', 'fee', 100), line('z', 'Fee', 200)]);
    expect(occ.map((o) => o.occurrence)).toEqual([0, 1, 0]);
  });
});
