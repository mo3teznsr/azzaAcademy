import { createHash } from 'node:crypto';
import type { StatementMatchKind } from '@azza/shared';
import { asciiDigits } from './statement-csv';

/** A bank transfer still waiting for its money: a seat order or a plan payment. */
export interface OpenTransfer {
  kind: 'SEAT' | 'PLAN';
  id: string;
  reference: string;
  totalFils: number;
  status: string;
  userName: string;
  createdAt: Date;
}

export interface MatchableLine {
  id: string;
  postedOn: Date;
  amountFils: number;
  description: string;
  /** The line was already imported before (same hash): nothing to do. */
  known?: boolean;
}

export interface TransferRef {
  kind: 'SEAT' | 'PLAN';
  id: string;
}

export interface LineMatch {
  lineId: string;
  kind: StatementMatchKind;
  /** The transfer whose reference is in the description (EXACT, AMOUNT_DIFFERS, or the one already taken for DUPLICATE). */
  transfer: TransferRef | null;
  /** Weak guesses when no reference was found: same amount, created shortly before the credit, best name match first. */
  suggestions: (TransferRef & { score: number })[];
}

/** Seats and plans that can still be settled by a bank line. */
export const OPEN_SEAT_STATUSES = ['AWAITING_RECEIPT', 'VERIFYING', 'AMOUNT_MISMATCH'] as const;
export const OPEN_PLAN_STATUSES = ['AWAITING_RECEIPT', 'AWAITING_REVIEW'] as const;

/** Upper case letters and digits only, so `az-b07-48213`, `AZ B07 48213` and `AZB0748213` compare equal. */
export const compact = (s: string) => asciiDigits(s).toUpperCase().replace(/[^A-Z0-9]/g, '');

const DAY = 86_400_000;
/** A transfer is a weak suggestion for a credit posted up to this many days after the order (and a day before, for time zones). */
export const SUGGESTION_WINDOW_DAYS = 14;

const nameTokens = (s: string) =>
  s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3);

/**
 * Stable identity of a statement line so importing the same statement twice changes nothing: the account, date, amount,
 * description (spacing and case ignored) and which occurrence of that same tuple it is in the file (two equal transfers
 * on one day stay two lines).
 */
export function lineHash(bankAccountId: string, postedOn: Date, amountFils: number, description: string, occurrence: number) {
  const text = description.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update([bankAccountId, postedOn.toISOString().slice(0, 10), amountFils, text, occurrence].join('\u0001')).digest('hex');
}

/** Assigns each line its occurrence number among lines with the same date, amount and description. */
export function withOccurrences<T extends { postedOn: Date; amountFils: number; description: string }>(lines: T[]): (T & { occurrence: number })[] {
  const seen = new Map<string, number>();
  return lines.map((l) => {
    const key = [l.postedOn.toISOString().slice(0, 10), l.amountFils, l.description.toLowerCase().replace(/\s+/g, ' ').trim()].join('|');
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return { ...l, occurrence: n };
  });
}

/**
 * Proposes a transfer for each credit line. Pure: the caller loads the open transfers and says which lines are known.
 *  - DUPLICATE: the line was imported before, or an earlier line already claims the same transfer.
 *  - EXACT: a reference is in the description and the amount equals the transfer's total.
 *  - AMOUNT_DIFFERS: the reference is there, the amount is not the total.
 *  - SUGGESTED: no reference, but transfers of the same amount made shortly before (student name in the text ranks first).
 *  - UNMATCHED: nothing.
 */
export function matchStatementLines(lines: MatchableLine[], transfers: OpenTransfer[]): LineMatch[] {
  // Longest references first so `AZ-B07-48213` never loses to a shorter reference that it contains.
  const byRef = transfers
    .map((t) => ({ t, ref: compact(t.reference) }))
    .filter((x) => x.ref.length >= 6)
    .sort((a, b) => b.ref.length - a.ref.length);
  const claimed = new Set<string>();
  const key = (t: TransferRef) => `${t.kind}:${t.id}`;

  return lines.map((line): LineMatch => {
    if (line.known) return { lineId: line.id, kind: 'DUPLICATE', transfer: null, suggestions: [] };
    const text = compact(line.description);
    const hit = byRef.find((x) => text.includes(x.ref))?.t;
    if (hit) {
      const ref = { kind: hit.kind, id: hit.id };
      if (claimed.has(key(ref))) return { lineId: line.id, kind: 'DUPLICATE', transfer: ref, suggestions: [] };
      claimed.add(key(ref));
      return { lineId: line.id, kind: hit.totalFils === line.amountFils ? 'EXACT' : 'AMOUNT_DIFFERS', transfer: ref, suggestions: [] };
    }

    const words = new Set(nameTokens(line.description));
    const posted = line.postedOn.getTime();
    const suggestions = transfers
      .filter((t) => t.totalFils === line.amountFils && !claimed.has(key(t)))
      .filter((t) => t.createdAt.getTime() <= posted + 2 * DAY && t.createdAt.getTime() >= posted - SUGGESTION_WINDOW_DAYS * DAY)
      .map((t) => {
        const tokens = nameTokens(t.userName);
        const named = tokens.filter((w) => words.has(w)).length;
        // Name words found count most; closer in time breaks ties.
        const days = Math.abs(posted - t.createdAt.getTime()) / DAY;
        const score = Math.round((tokens.length ? named / tokens.length : 0) * 100 + Math.max(0, SUGGESTION_WINDOW_DAYS - days));
        return { kind: t.kind, id: t.id, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { lineId: line.id, kind: suggestions.length ? 'SUGGESTED' : 'UNMATCHED', transfer: null, suggestions };
  });
}
