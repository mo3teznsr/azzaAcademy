import type { BatchStatus, EnrollmentStatus } from '@azza/shared';
import { percentOf } from '@azza/shared';
import { GRANTABLE } from '../payments/enrollment-state';

// Pure rules for seat packs (corporate orders): money, seat accounting, assigning and revoking. No I/O, no clock.

export type SeatPackStatus = 'INVOICED' | 'PAID' | 'CANCELLED';

/** Packs whose seats count: invoiced or paid. A cancelled pack holds nothing. */
export const SEAT_PACK_LIVE: SeatPackStatus[] = ['INVOICED', 'PAID'];

/** Batches a pack can be sold into or assigned in. */
export const PACK_BATCH_STATUSES: BatchStatus[] = ['ENROLLING', 'FULL', 'RUNNING'];

export interface PackMoney {
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
}

/** seats × unit price, less a deal discount (capped at the subtotal), plus VAT on what is left. */
export function packAmounts(seats: number, unitPriceFils: number, discountFils: number, vatPercent: number): PackMoney {
  const subtotalFils = seats * unitPriceFils;
  const discount = Math.min(Math.max(0, discountFils), subtotalFils);
  const vatFils = percentOf(subtotalFils - discount, vatPercent);
  return { subtotalFils, discountFils: discount, vatFils, totalFils: subtotalFils - discount + vatFils };
}

/** Seats of a pack nobody holds yet. */
export const unusedSeats = (pack: { seats: number; used: number }) => Math.max(0, pack.seats - pack.used);

/** Unassigned seats of live packs: they are held in the batch, so checkout cannot sell them. */
export const reservedSeats = (packs: { seats: number; used: number; status?: SeatPackStatus }[]) =>
  packs.filter((p) => !p.status || SEAT_PACK_LIVE.includes(p.status)).reduce((s, p) => s + unusedSeats(p), 0);

export type PackRefusal = 'BATCH_NOT_OPEN' | 'CAPACITY_EXCEEDED' | null;

/** A live pack must fit in the seats the batch has left (held = enrollments on seats + seats other packs hold). */
export function packRefusal(batch: { status: BatchStatus; capacity: number }, held: number, seats: number): PackRefusal {
  if (!PACK_BATCH_STATUSES.includes(batch.status)) return 'BATCH_NOT_OPEN';
  if (held + seats > batch.capacity) return 'CAPACITY_EXCEEDED';
  return null;
}

export type AssignRefusal = 'PACK_CANCELLED' | 'NO_SEATS_LEFT' | 'ALREADY_ASSIGNED' | 'BATCH_NOT_OPEN' | 'ALREADY_ENROLLED' | 'ACCESS_ENDED' | null;

/**
 * Can this learner take a seat? `existing` is their current enrollment status in the pack's batch (live packs), and
 * `alreadyAssigned` whether they hold a seat of this pack already. Recorded packs pass `batchStatus: null`.
 */
export function assignRefusal(args: {
  packStatus: SeatPackStatus;
  seats: number;
  used: number;
  alreadyAssigned: boolean;
  batchStatus: BatchStatus | null;
  existing: EnrollmentStatus | null;
  accessEndsAt?: Date | null;
  now: Date;
}): AssignRefusal {
  if (!SEAT_PACK_LIVE.includes(args.packStatus)) return 'PACK_CANCELLED';
  if (args.alreadyAssigned) return 'ALREADY_ASSIGNED';
  if (unusedSeats(args) === 0) return 'NO_SEATS_LEFT';
  if (args.batchStatus !== null) {
    if (!PACK_BATCH_STATUSES.includes(args.batchStatus)) return 'BATCH_NOT_OPEN';
    if (!GRANTABLE.includes(args.existing)) return 'ALREADY_ENROLLED';
  } else if (args.accessEndsAt && args.accessEndsAt.getTime() <= args.now.getTime()) {
    return 'ACCESS_ENDED';
  }
  return null;
}

export type RevokeRefusal = 'NOT_ACTIVE' | 'CLASS_STARTED' | 'LEARNING_STARTED' | null;

/**
 * A seat goes back to the pack only before the learner used it: a live seat until the first session starts (and while
 * the batch is still enrolling), a recorded seat until the learner completes a lesson.
 */
export function revokeRefusal(args: {
  assignmentStatus: 'ACTIVE' | 'REVOKED';
  batch: { status: BatchStatus; firstSessionAt: Date | null; startsOn: Date } | null;
  completedLessons: number;
  now: Date;
}): RevokeRefusal {
  if (args.assignmentStatus !== 'ACTIVE') return 'NOT_ACTIVE';
  if (args.batch) {
    const starts = args.batch.firstSessionAt ?? args.batch.startsOn;
    if (!['ENROLLING', 'FULL'].includes(args.batch.status) || args.now.getTime() >= starts.getTime()) return 'CLASS_STARTED';
    return null;
  }
  return args.completedLessons > 0 ? 'LEARNING_STARTED' : null;
}

/**
 * Cancelling a pack credits the seats nobody used: unused × (its share of the total). The VAT split is the credit-note
 * job's (same share as the invoice). A pack with every seat in use cannot be cancelled for money back.
 */
export function cancellationCreditFils(pack: { seats: number; used: number; totalFils: number; refundedFils: number }): number {
  if (pack.seats <= 0) return 0;
  const credit = pack.used === 0 ? pack.totalFils : Math.floor((pack.totalFils * unusedSeats(pack)) / pack.seats);
  return Math.max(0, Math.min(credit, pack.totalFils - pack.refundedFils));
}

/** `CORP-7K2QX9`: easy to read out on a bank transfer. */
export function seatPackReference(random: () => number = Math.random): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(random() * alphabet.length)];
  return `CORP-${out}`;
}
