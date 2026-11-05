import type { CheckoutInput, EnrollmentStatus, OrderStatus, PaymentMethod } from '@azza/shared';
import { BusinessRuleError } from '../../../core/errors';
import type { OrderRecord, SaleBatch, UserContact } from '../payments.repository';
import type { Quote } from '../price-calculator';

export interface CheckoutContext {
  user: UserContact;
  batch: SaleBatch;
  quote: Quote;
  reference: string;
  input: CheckoutInput;
  now: Date;
}

export interface CheckoutStart {
  orderStatus: OrderStatus;
  expiresAt: Date | null;
  stripePaymentIntentId?: string;
  bankAccountId?: string;
  appleProductId?: string;
  appleAppAccountToken?: string;
  /** Extra fields returned to the client next to `order`. */
  response: Record<string, unknown>;
  /** Side effects once the order row exists (e.g. instructions email). */
  onCreated?: (order: OrderRecord) => Promise<void>;
}

/** Open/closed: each payment method is one class; the checkout service never branches on method. */
export interface CheckoutStrategy {
  readonly method: PaymentMethod;
  /** Enrollment status while this method's payment is outstanding. */
  readonly pendingEnrollmentStatus: EnrollmentStatus;
  start(ctx: CheckoutContext): Promise<CheckoutStart>;
}

export class CheckoutStrategyRegistry {
  private readonly byMethod = new Map<PaymentMethod, CheckoutStrategy>();

  constructor(strategies: CheckoutStrategy[]) {
    for (const s of strategies) this.byMethod.set(s.method, s);
  }

  get(method: PaymentMethod): CheckoutStrategy {
    const s = this.byMethod.get(method);
    if (!s) throw new BusinessRuleError(`Payment method ${method} is not available`, 'PAYMENT_METHOD_UNAVAILABLE');
    return s;
  }

  methods(): PaymentMethod[] {
    return [...this.byMethod.keys()];
  }
}
