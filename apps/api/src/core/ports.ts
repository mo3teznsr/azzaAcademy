// Ports (interfaces) that services depend on. Adapters in src/infrastructure implement them,
// so swapping Stripe, LiveKit, SMTP or Firebase never touches business logic (DIP).

export interface Clock {
  now(): Date;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}
export interface PushNotifier {
  send(message: PushMessage): Promise<{ invalidTokens: string[] }>;
}

export interface RealtimeBroadcaster {
  toUser(userId: string, event: string, payload: unknown): void;
  toSession(sessionId: string, event: string, payload: unknown): void;
  toRole(role: 'STUDENT' | 'TEACHER' | 'ADMIN', event: string, payload: unknown): void;
}

export interface VideoGrant {
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
  canPublishData: boolean;
  isHost: boolean;
  /** Invisible to other participants (admin observers). */
  hidden?: boolean;
  metadata?: string;
}
export interface RoomInfo {
  name: string;
  numParticipants: number;
  createdAt: Date | null;
  recording: boolean;
}
export interface VideoWebhookEvent {
  event: string;
  roomName?: string;
  participantIdentity?: string;
  egressId?: string;
  fileUrl?: string;
  at: Date;
}
export interface VideoProvider {
  readonly serverUrl: string;
  createJoinToken(grant: VideoGrant): Promise<string>;
  ensureRoom(roomName: string, opts: { emptyTimeoutSec: number; maxParticipants: number }): Promise<void>;
  listRooms(): Promise<RoomInfo[]>;
  closeRoom(roomName: string): Promise<void>;
  muteParticipant(roomName: string, identity: string): Promise<void>;
  removeParticipant(roomName: string, identity: string): Promise<void>;
  /** Grant/revoke publish (camera + mic) rights for a participant already in the room. */
  setCanPublish(roomName: string, identity: string, canPublish: boolean): Promise<void>;
  startRecording(roomName: string): Promise<{ egressId: string }>;
  stopRecording(egressId: string): Promise<void>;
  parseWebhook(rawBody: string, authHeader: string | undefined): Promise<VideoWebhookEvent>;
}

export interface CreatePaymentIntentArgs {
  amountFils: number; // AED minor units — always AED
  reference: string;
  customerEmail: string;
  metadata: Record<string, string>;
}
export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
}
/** A Stripe subscription as the webhook reports it. */
export interface WebhookSubscription {
  id: string;
  customerId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  /** Carries our `subscriptionRef` (the Subscription row id). */
  metadata: Record<string, string>;
  /** True when the gateway re-read the subscription from Stripe for this event, so the state is current rather than a delayed snapshot. */
  fresh?: boolean;
}
/** A Stripe invoice of a subscription, in AED fils. */
export interface WebhookInvoice {
  id: string;
  subscriptionId: string | null;
  amountPaidFils: number;
  feeFils: number;
  periodStart: Date;
  periodEnd: Date;
  billingReason: string | null;
  /** The subscription's metadata snapshot on the invoice (`subscriptionRef`), when Stripe has it. */
  metadata?: Record<string, string>;
  customerId?: string | null;
}
export interface PaymentWebhookEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'subscription.updated' | 'invoice.paid' | 'invoice.failed' | 'ignored';
  paymentIntentId?: string;
  /** `refund.succeeded`: the invoice the refunded charge paid (a subscription charge), when there is one. */
  invoiceId?: string;
  /** `refund.succeeded`: the charge's cumulative refunded amount in fils. */
  amountRefundedFils?: number;
  /** Set for Stripe Checkout events; the order is found by it. */
  checkoutSessionId?: string;
  feeFils?: number;
  /** `subscription.updated` */
  subscription?: WebhookSubscription;
  /** `invoice.paid` and `invoice.failed` */
  invoice?: WebhookInvoice;
}
export interface CreateSubscriptionCheckoutArgs {
  priceId: string;
  customerEmail: string;
  /** Our Subscription row id; the return page polls by it. */
  reference: string;
  /** Goes on the Checkout Session and on the subscription (`subscriptionRef` links every later event). */
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  /** Free until this moment (Stripe `subscription_data.trial_end`). */
  trialEnd?: Date;
  /** When the Checkout Session lapses (at least 30 minutes out). Keep it stable across retries so the idempotency key returns the same session. */
  expiresAt?: Date;
}
export interface CreateCheckoutSessionArgs {
  amountFils: number; // AED minor units — always AED
  reference: string;
  customerEmail: string;
  productName: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}
export interface CheckoutSessionResult {
  id: string;
  url: string;
}
export interface UpsertRecordedProductArgs {
  productId?: string;
  name: string;
  courseId: string;
  monthlyFils: number;
  yearlyFils: number;
  currentMonthlyPriceId?: string;
  currentYearlyPriceId?: string;
}
export interface UpsertRecordedProductResult {
  productId: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
}
export interface PaymentGateway {
  createPaymentIntent(args: CreatePaymentIntentArgs): Promise<PaymentIntentResult>;
  /** Hosted Stripe Checkout page; payment is confirmed only by the `checkout.session.*` webhook. */
  createCheckoutSession(args: CreateCheckoutSessionArgs): Promise<CheckoutSessionResult>;
  refund(paymentIntentId: string, amountFils: number): Promise<void>;
  /**
   * Creates or renames the course's Stripe Product and makes sure it has one AED Price per plan, VAT-inclusive
   * (the pre-VAT args are grossed up with the seat-checkout VAT rule). A changed inclusive amount creates a new Price and archives the old one; subscribers keep the Price they signed up on.
   */
  upsertRecordedProduct(args: UpsertRecordedProductArgs): Promise<UpsertRecordedProductResult>;
  /** Hosted Checkout in subscription mode; state is driven by the `customer.subscription.*` and `invoice.*` webhooks. */
  createSubscriptionCheckout(args: CreateSubscriptionCheckoutArgs): Promise<CheckoutSessionResult>;
  /** Closes an unfinished Checkout Session. 'completed' means the learner already paid, so a new one must not be started. */
  expireCheckoutSession(sessionId: string): Promise<'expired' | 'completed'>;
  setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean): Promise<void>;
  cancelNow(subscriptionId: string): Promise<void>;
  /** Moves the subscription to another Price, prorating (`create_prorations`). */
  switchPlan(subscriptionId: string, newPriceId: string): Promise<{ currentPeriodEnd: Date }>;
  /** Stripe Customer Portal (update card, invoices). */
  customerPortalUrl(customerId: string, returnUrl: string): Promise<string>;
  refundInvoice(invoiceId: string, amountFils: number): Promise<void>;
  parseWebhook(rawBody: string, signature: string | undefined): Promise<PaymentWebhookEvent>;
}

export interface StoredFile {
  /** Storage key, e.g. `receipts/3f9c….pdf` — safe to put in a URL path. */
  key: string;
  /** Absolute public URL the file is served from. */
  url: string;
}
export interface FileStorage {
  save(file: { folder: string; extension: string; contentType: string; bytes: Uint8Array }): Promise<StoredFile>;
  /** `null` when the key is unknown or malformed. */
  read(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  /** The key of a URL this storage returned from `save`, or `null` for any other URL. */
  keyFromUrl(url: string): string | null;
  /** Removes a stored file; a missing or malformed key is a no-op. Optional so simple fakes need not implement it. */
  delete?(key: string): Promise<void>;
}

/** A StoreKit 2 transaction whose JWS signature, certificate chain, bundle id and environment were verified. */
export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  environment: 'Production' | 'Sandbox';
  /** UUID the app passed to StoreKit at purchase (`appAccountToken`) — we issue one per order. */
  appAccountToken: string | null;
  purchaseDate: Date | null;
  /** Price in milliunits of `currency` (e.g. 924000 = 924.00), when Apple includes it. */
  priceMilliunits: number | null;
  currency: string | null;
  revocationDate: Date | null;
  /** Auto-renewable subscriptions: when the paid period ends. */
  expiresDate?: Date | null;
  /** StoreKit product type, e.g. 'Auto-Renewable Subscription' or 'Consumable'. */
  type?: string | null;
}
/** App Store Server Notification V2, verified. */
export interface AppleNotification {
  notificationUUID: string;
  notificationType: string;
  subtype: string | null;
  environment: 'Production' | 'Sandbox';
  transaction: AppleTransaction | null;
  /** Subscriptions: the product the learner chose for the next renewal (`autoRenewProductId` of the signed renewal info). */
  renewalProductId?: string | null;
}
export interface AppleSignedDataVerifier {
  verifyTransaction(signedTransaction: string): Promise<AppleTransaction>;
  verifyNotification(signedPayload: string): Promise<AppleNotification>;
}
