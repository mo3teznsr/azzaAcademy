// Composition root: the only place that knows concrete classes. Everything else
// receives its dependencies through constructors (DIP), so tests swap adapters freely.

import { createAuth } from './auth/auth';
import { BetterAuthUserProvisioner, InviteRegistry } from './auth/user-provisioner';
import type { Job } from './jobs/scheduler';
import type { AppConfig } from './core/config';
import { fileURLToPath } from 'node:url';
import type { Clock, FileStorage, Mailer, PaymentGateway, PushNotifier, VideoProvider } from './core/ports';
import { systemClock } from './infrastructure/clock';
import { createDb, type Db } from './infrastructure/db';
import { ConsoleMailer, NodemailerMailer } from './infrastructure/mail/mailers';
import { FakePaymentGateway, StripePaymentGateway } from './infrastructure/payments/stripe-gateway';
import { FirebasePushNotifier, LogPushNotifier } from './infrastructure/push/push-notifiers';
import { SocketIoBroadcaster } from './infrastructure/realtime/realtime';
import { LocalDiskStorage } from './infrastructure/storage/local-disk-storage';
import { DisabledVideoProvider, LiveKitVideoProvider } from './infrastructure/video/livekit-provider';
import { PrismaBatchRepository } from './modules/batches/batch.repository';
import { BatchService } from './modules/batches/batch.service';
import { ScheduleGenerator } from './modules/batches/schedule-generator';
import { PrismaCourseRepository } from './modules/courses/course.repository';
import { CourseService } from './modules/courses/course.service';
import { PrismaAdminRepository } from './modules/admin/admin.repository';
import { AdminService } from './modules/admin/admin.service';
import { BatchAccessPolicy, PrismaBatchAccessRepository } from './modules/batches/batch-access';
import { PrismaContentRepository } from './modules/content/content.repository';
import { ContentService } from './modules/content/content.service';
import { PrismaMeRepository } from './modules/me/me.repository';
import { CalendarTokenSigner } from './modules/me/calendar-token';
import { CalendarService } from './modules/me/calendar.service';
import { MeService } from './modules/me/me.service';
import { EmailChannel } from './modules/notifications/channels/email.channel';
import { InAppChannel } from './modules/notifications/channels/in-app.channel';
import { PushChannel } from './modules/notifications/channels/push.channel';
import { RealtimeChannel } from './modules/notifications/channels/realtime.channel';
import { PrismaNotificationRepository } from './modules/notifications/notification.repository';
import { NotificationService } from './modules/notifications/notification.service';
import { PrismaBankAccountRepository, PrismaCouponRepository } from './modules/payments/catalog-admin.repository';
import { BankAccountService, CouponService } from './modules/payments/catalog-admin.service';
import { BankTransferCheckout } from './modules/payments/checkout/bank-transfer-checkout';
import { CheckoutStrategyRegistry } from './modules/payments/checkout/checkout-strategy';
import { StripeCheckout } from './modules/payments/checkout/stripe-checkout';
import { CheckoutService } from './modules/payments/checkout.service';
import { EnrollmentLifecycle } from './modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from './modules/payments/enrollment-state';
import { FinanceAdminService } from './modules/payments/finance-admin.service';
import { FxService, PrismaFxRepository } from './modules/payments/fx.service';
import { OrderQueries } from './modules/payments/order.queries';
import { PrismaPaymentsRepository } from './modules/payments/payments.repository';
import { PriceCalculator } from './modules/payments/price-calculator';
import { ReceiptUploadService } from './modules/payments/receipt-upload.service';
import { ReferenceGenerator } from './modules/payments/reference-generator';
import { PrismaStatsRepository } from './modules/stats/stats.repository';
import { StatsService } from './modules/stats/stats.service';
import { EarningsCalculator } from './modules/payouts/earnings-calculator';
import { PrismaPayoutRepository } from './modules/payouts/payout.repository';
import { PayoutService } from './modules/payouts/payout.service';
import { ClassroomState } from './modules/sessions/classroom-state';
import { JoinPolicy } from './modules/sessions/join-policy';
import { PrismaSessionRepository } from './modules/sessions/session.repository';
import { SessionService } from './modules/sessions/session.service';
import { PrismaRescheduleRequestRepository } from './modules/sessions/reschedule-request.repository';
import { RescheduleRequestService } from './modules/sessions/reschedule-request.service';

export interface Adapters {
  db: Db;
  clock: Clock;
  mailer: Mailer;
  push: PushNotifier;
  video: VideoProvider;
  payments: PaymentGateway;
  realtime: SocketIoBroadcaster;
  storage: FileStorage;
}

/** `apps/api/uploads/` regardless of the process cwd. */
const DEFAULT_UPLOADS_DIR = fileURLToPath(new URL('../uploads/', import.meta.url));

export function createAdapters(config: AppConfig): Adapters {
  return {
    db: createDb(config.DATABASE_URL),
    clock: systemClock,
    mailer: config.SMTP_HOST
      ? new NodemailerMailer({ host: config.SMTP_HOST, port: config.SMTP_PORT, user: config.SMTP_USER, pass: config.SMTP_PASS }, config.MAIL_FROM)
      : new ConsoleMailer(),
    push:
      config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY
        ? new FirebasePushNotifier({
            projectId: config.FIREBASE_PROJECT_ID,
            clientEmail: config.FIREBASE_CLIENT_EMAIL,
            privateKey: config.FIREBASE_PRIVATE_KEY,
          })
        : new LogPushNotifier(),
    video:
      config.LIVEKIT_API_KEY && config.LIVEKIT_API_SECRET && config.LIVEKIT_URL
        ? new LiveKitVideoProvider(config.LIVEKIT_URL, config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET)
        : new DisabledVideoProvider(),
    payments: config.STRIPE_SECRET_KEY
      ? new StripePaymentGateway(config.STRIPE_SECRET_KEY, config.STRIPE_WEBHOOK_SECRET)
      : new FakePaymentGateway(),
    realtime: new SocketIoBroadcaster(),
    storage: new LocalDiskStorage(config.UPLOADS_DIR ?? DEFAULT_UPLOADS_DIR, `${config.API_URL.replace(/\/$/, '')}/uploads`),
  };
}

export function createContainer(config: AppConfig, adapters: Adapters = createAdapters(config)) {
  const { db, clock, mailer, push, video, payments, realtime } = adapters;
  const invites = new InviteRegistry();
  const auth = createAuth(db, config, mailer, invites);

  // repositories
  const courseRepo = new PrismaCourseRepository(db);
  const batchRepo = new PrismaBatchRepository(db);
  const notificationRepo = new PrismaNotificationRepository(db);
  const paymentsRepo = new PrismaPaymentsRepository(db);

  // notifications: channels composed, not hard-coded (OCP)
  const notifications = new NotificationService(
    notificationRepo,
    [new InAppChannel(notificationRepo), new RealtimeChannel(realtime), new EmailChannel(mailer), new PushChannel(push, notificationRepo)],
    clock,
  );

  const access = new BatchAccessPolicy(new PrismaBatchAccessRepository(db));

  const payouts = new PayoutService(new PrismaPayoutRepository(db), new EarningsCalculator(config.TEACHER_SHARE_PERCENT), notifications, clock, {
    earningHoldDays: config.EARNING_HOLD_DAYS,
    minPayoutFils: Math.round(config.MIN_PAYOUT_AED * 100),
  });

  const rescheduleRequestRepo = new PrismaRescheduleRequestRepository(db);
  const sessions = new SessionService(
    new PrismaSessionRepository(db),
    new JoinPolicy(),
    new ClassroomState(),
    video,
    realtime,
    notifications,
    payouts,
    clock,
    rescheduleRequestRepo,
  );

  const machine = new EnrollmentStateMachine();
  const lifecycle = new EnrollmentLifecycle(paymentsRepo, machine, notifications, realtime, clock, config.WEB_URL);
  const fx = new FxService(new PrismaFxRepository(db));
  const strategies = new CheckoutStrategyRegistry([
    new StripeCheckout(payments),
    new BankTransferCheckout(paymentsRepo, notifications, config.BANK_TRANSFER_HOLD_HOURS),
  ]);
  const checkout = new CheckoutService(
    paymentsRepo,
    strategies,
    new PriceCalculator(config.VAT_PERCENT),
    fx,
    machine,
    lifecycle,
    new ReferenceGenerator(),
    notifications,
  );

  const meService = new MeService(new PrismaMeRepository(db), clock);
  const services = {
    courses: new CourseService(courseRepo),
    batches: new BatchService(batchRepo, courseRepo, new ScheduleGenerator(), access, notifications, clock),
    notifications,
    me: meService,
    calendar: new CalendarService(meService, new PrismaMeRepository(db), new CalendarTokenSigner(config.BETTER_AUTH_SECRET), clock, {
      api: config.API_URL,
      web: config.WEB_URL,
    }),
    stats: new StatsService(new PrismaStatsRepository(db), video),
    receipts: new ReceiptUploadService(adapters.storage, checkout),
    sessions,
    rescheduleRequests: new RescheduleRequestService(rescheduleRequestRepo, sessions, notifications, clock),
    payouts,
    checkout,
    finance: new FinanceAdminService(paymentsRepo, lifecycle, payments, payouts, notifications, config.BANK_TRANSFER_HOLD_HOURS),
    fx,
    bankAccounts: new BankAccountService(new PrismaBankAccountRepository(db)),
    coupons: new CouponService(new PrismaCouponRepository(db)),
    orders: new OrderQueries(db),
    content: new ContentService(new PrismaContentRepository(db), access, notifications, clock),
    admin: new AdminService(new PrismaAdminRepository(db), new BetterAuthUserProvisioner(auth, invites, config.WEB_URL), video, clock),
  };

  /** Background jobs (started by index.ts only, never in tests). */
  const jobs: Job[] = [
    { name: 'expire-stale-orders', everyMs: 5 * 60_000, run: () => checkout.expireStaleOrders() },
    { name: 'release-matured-earnings', everyMs: 60 * 60_000, run: async () => ({ released: await payouts.releaseMatured() }) },
  ];

  const platformSettings = {
    rules: {
      TEACHER_SHARE_PERCENT: config.TEACHER_SHARE_PERCENT,
      EARNING_HOLD_DAYS: config.EARNING_HOLD_DAYS,
      MIN_PAYOUT_AED: config.MIN_PAYOUT_AED,
      BANK_TRANSFER_HOLD_HOURS: config.BANK_TRANSFER_HOLD_HOURS,
      VAT_PERCENT: config.VAT_PERCENT,
    },
    integrations: {
      stripe: !!config.STRIPE_SECRET_KEY,
      livekit: !!(config.LIVEKIT_API_KEY && config.LIVEKIT_API_SECRET && config.LIVEKIT_URL),
      smtp: !!config.SMTP_HOST,
      push: !!(config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY),
    },
  };

  return { config, auth, adapters, services, jobs, platformSettings };
}

export type Container = ReturnType<typeof createContainer>;
