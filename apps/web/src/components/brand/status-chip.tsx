'use client';

import type { BatchStatus, OrderStatus, PayoutRunStatus, PayoutStatus, CourseStatus, EnrollmentStatus } from '@azza/shared';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/provider';
import type { SessionDisplayState } from '@/lib/schedule';

export type ChipTone =
  | 'sky'
  | 'sun'
  | 'sage'
  | 'peach'
  | 'ivory'
  | 'onair'
  | 'outline'
  | 'dashed'
  | 'dashedPeach'
  | 'strike'
  | 'ink'
  | 'danger';

const TONES: Record<ChipTone, string> = {
  sky: 'bg-sky text-ink',
  sun: 'bg-sun text-ink',
  sage: 'bg-sage text-ink',
  peach: 'bg-peach text-ink',
  /* Inverted chip: ivory on the ink ground, ink in light mode (admin cream keeps ivory). */
  ivory: 'bg-ivory text-ink light:bg-ink light:text-ivory',
  onair: 'bg-onair text-ink',
  outline: 'border border-muted-foreground text-muted-foreground',
  dashed: 'border border-dashed border-muted-foreground text-muted-foreground',
  dashedPeach: 'border border-dashed border-peach-fg text-peach-fg',
  strike: 'border border-border text-muted-foreground line-through',
  /* Fixed ink chip — sits on accent fills (sun / on-air banners). */
  ink: 'bg-ink text-ivory',
  danger: 'border border-danger-line bg-danger-bg text-danger-fg',
};

/** Pill status chip — JetBrains Mono caps (Main.dc.html §06). */
/** `live` turns the dot into the on-air ping (defaults to on for the onair tone). */
export function Chip({ tone = 'outline', dot, live, children, className }: { tone?: ChipTone; dot?: boolean; live?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && ((live ?? tone === 'onair') ? <span aria-hidden className="onair size-1.5" /> : <span aria-hidden className="size-1.5 rounded-full bg-current" />)}
      {children}
    </span>
  );
}

const SESSION_TONE: Record<SessionDisplayState, ChipTone> = {
  LIVE: 'onair',
  SOON: 'sun',
  SCHEDULED: 'sky',
  MOVED: 'dashedPeach',
  ENDED: 'outline',
  CANCELLED: 'strike',
};

export function SessionStatusChip({ state, minutes }: { state: SessionDisplayState; minutes?: number }) {
  const { t, fill } = useI18n();
  const label = state === 'SOON' ? fill(t.status.session.SOON, { n: Math.max(0, minutes ?? 0) }) : t.status.session[state];
  return (
    <Chip tone={SESSION_TONE[state]} dot={state === 'LIVE'}>
      {label}
    </Chip>
  );
}

const BATCH_TONE: Record<BatchStatus, ChipTone> = {
  DRAFT: 'dashed',
  ENROLLING: 'sage',
  FULL: 'peach',
  RUNNING: 'ivory',
  COMPLETED: 'outline',
  CANCELLED: 'strike',
};

export function BatchStatusChip({ status, taken, capacity }: { status: BatchStatus; taken?: number; capacity?: number }) {
  const { t, f } = useI18n();
  const seats = status === 'ENROLLING' && taken !== undefined && capacity ? ` · ${f.number(taken)}/${f.number(capacity)}` : '';
  return <Chip tone={BATCH_TONE[status]}>{t.status.batch[status] + seats}</Chip>;
}

const ORDER_TONE: Record<OrderStatus, ChipTone> = {
  AWAITING_PAYMENT: 'dashed',
  AWAITING_RECEIPT: 'sun',
  VERIFYING: 'sky',
  AMOUNT_MISMATCH: 'peach',
  PAID: 'sage',
  FAILED: 'danger',
  REJECTED: 'danger',
  EXPIRED: 'strike',
  REFUNDED: 'outline',
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <Chip tone={ORDER_TONE[status]}>{t.status.order[status]}</Chip>;
}

const ENROLLMENT_TONE: Record<EnrollmentStatus, ChipTone> = {
  PENDING_PAYMENT: 'dashed',
  AWAITING_TRANSFER: 'sun',
  VERIFYING: 'sky',
  ACTIVE: 'sage',
  WAITLISTED: 'peach',
  CANCELLED: 'strike',
  REFUNDED: 'outline',
  EXPIRED: 'strike',
};
export function EnrollmentStatusChip({ status }: { status: EnrollmentStatus }) {
  const { t } = useI18n();
  return <Chip tone={ENROLLMENT_TONE[status]}>{t.status.enrollment[status]}</Chip>;
}

const COURSE_TONE: Record<CourseStatus, ChipTone> = { DRAFT: 'dashed', PUBLISHED: 'sage', ARCHIVED: 'outline' };
export function CourseStatusChip({ status }: { status: CourseStatus }) {
  const { t } = useI18n();
  return <Chip tone={COURSE_TONE[status]}>{t.status.course[status]}</Chip>;
}

const PAYOUT_TONE: Record<PayoutStatus, ChipTone> = { READY: 'sage', HELD: 'peach', PAID: 'outline', CARRIED_OVER: 'dashed' };
export function PayoutStatusChip({ status }: { status: PayoutStatus }) {
  const { t } = useI18n();
  return <Chip tone={PAYOUT_TONE[status]}>{t.status.payout[status]}</Chip>;
}

const RUN_TONE: Record<PayoutRunStatus, ChipTone> = { DRAFT: 'dashed', APPROVED: 'sun', PROCESSING: 'sky', PAID: 'sage' };
export function RunStatusChip({ status }: { status: PayoutRunStatus }) {
  const { t } = useI18n();
  return <Chip tone={RUN_TONE[status]}>{t.status.run[status]}</Chip>;
}
