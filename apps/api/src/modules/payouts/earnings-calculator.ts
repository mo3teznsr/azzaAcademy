import type { PayoutStatus } from '@azza/shared';

export interface OrderMoney {
  totalFils: number;
  vatFils: number;
  refundedFils: number;
  feeFils: number;
}

export interface PayoutDecision {
  status: Extract<PayoutStatus, 'READY' | 'HELD' | 'CARRIED_OVER'>;
  holdReason: string | null;
}

/** Pure money rules for teacher earnings. All amounts are integer fils. */
export class EarningsCalculator {
  constructor(private readonly sharePercent: number) {}

  /**
   * Net revenue an order contributes to its batch: what was kept after refunds,
   * excluding VAT (owed to the tax authority), minus the processor fee.
   */
  orderNet(o: OrderMoney): number {
    const kept = o.totalFils - o.refundedFils;
    if (o.totalFils <= 0) return -o.feeFils;
    const exVat = Math.round((kept * (o.totalFils - o.vatFils)) / o.totalFils);
    return exVat - o.feeFils;
  }

  batchNet(orders: OrderMoney[]): number {
    return orders.reduce((sum, o) => sum + this.orderNet(o), 0);
  }

  /** Gross → net waterfall for a batch's orders (net = `batchNet`). */
  batchBreakdown(orders: OrderMoney[]) {
    const sum = (f: (o: OrderMoney) => number) => orders.reduce((s, o) => s + f(o), 0);
    const netFils = this.batchNet(orders);
    const grossFils = sum((o) => o.totalFils);
    const refundsFils = sum((o) => o.refundedFils);
    const feesFils = sum((o) => o.feeFils);
    return { grossFils, refundsFils, feesFils, vatFils: grossFils - refundsFils - feesFils - netFils, netFils };
  }

  /** round(share% × net ÷ sessionCount) — what the teacher earns for one delivered session. */
  sessionShare(netFils: number, sessionCount: number): number {
    if (sessionCount <= 0 || netFils <= 0) return 0;
    return Math.round((this.sharePercent / 100) * (netFils / sessionCount));
  }

  /**
   * A refund after some sessions were delivered claws back the share already earned on that
   * money (future sessions accrue on the smaller net automatically). Returns a negative amount.
   */
  refundReversal(refundNetFils: number, deliveredSessions: number, sessionCount: number): number {
    if (sessionCount <= 0 || deliveredSessions <= 0 || refundNetFils <= 0) return 0;
    const delivered = Math.min(deliveredSessions, sessionCount);
    return -Math.round((this.sharePercent / 100) * ((refundNetFils * delivered) / sessionCount));
  }

  payoutDecision(args: { amountFils: number; bankVerified: boolean; hasBankDetails: boolean; minPayoutFils: number }): PayoutDecision {
    if (!args.hasBankDetails) return { status: 'HELD', holdReason: 'NO_BANK_DETAILS' };
    if (!args.bankVerified) return { status: 'HELD', holdReason: 'BANK_DETAILS_UNVERIFIED' };
    if (args.amountFils < args.minPayoutFils) return { status: 'CARRIED_OVER', holdReason: 'BELOW_MINIMUM' };
    return { status: 'READY', holdReason: null };
  }
}
