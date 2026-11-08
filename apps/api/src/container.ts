// Composition root: the only place that knows concrete classes. Everything else
// receives its dependencies through constructors (DIP), so tests swap adapters freely.

import { createAuth } from './auth/auth';
import { BetterAuthUserProvisioner, InviteRegistry } from './auth/user-provisioner';
import { msUntilUtcHour, type Job } from './jobs/scheduler';
import type { AppConfig } from './core/config';
import { fileURLToPath } from 'node:url';
import type { AppleSignedDataVerifier, Clock, FileStorage, Mailer, PaymentGateway, PushNotifier, VideoProvider } from './core/ports';
import { systemClock } from './infrastructure/clock';
import { createDb, type Db } from './infrastructure/db';
import { ConsoleMailer, NodemailerMailer } from './infrastructure/mail/mailers';
import { AppStoreSignedDataVerifier } from './infrastructure/payments/apple-store-verifier';
import { FakePaymentGateway, StripePaymentGateway } from './infrastructure/payments/stripe-gateway';
import { FirebasePushNotifier, LogPushNotifier } from './infrastructure/push/push-notifiers';
import { SocketIoBroadcaster } from './infrastructure/realtime/realtime';
import { LocalDiskStorage } from './infrastructure/storage/local-disk-storage';
import { S3FileStorage } from './infrastructure/storage/s3-storage';
import { DisabledVideoProvider, LiveKitVideoProvider } from './infrastructure/video/livekit-provider';
import { AppStoreConnectClient } from './infrastructure/appstore/app-store-connect-client';
import { AppStoreSyncService } from './modules/appstore-sync/appstore-sync.service';
import type { AppStoreCatalog } from './modules/appstore-sync/appstore-sync.port';
import { AppStoreSyncCoordinator, DisabledAppStoreSync, PrismaAppleSyncStore, type AppStoreSyncer } from './modules/appstore-sync/appstore-sync.coordinator';
import { PrismaBatchRepository } from './modules/batches/batch.repository';
import { BatchService } from './modules/batches/batch.service';
import { ScheduleGenerator } from './modules/batches/schedule-generator';
import { PrismaCourseRepository } from './modules/courses/course.repository';
import { CourseService } from './modules/courses/course.service';
import { CategoryService, PrismaCategoryRepository } from './modules/categories/category.service';
import { PrismaReviewRepository } from './modules/reviews/review.repository';
import { ReviewService } from './modules/reviews/review.service';
import { SavedCourseService } from './modules/reviews/saved-course.service';
import { InstructorApplicationService } from './modules/instructors/instructor-application.service';
import { PrismaApplicationRepository } from './modules/instructors/instructor-application.repository';
import { PrismaAdminRepository } from './modules/admin/admin.repository';
import { AdminService } from './modules/admin/admin.service';
import { CourseMediaService } from './modules/admin/course-media.service';
import { BatchAccessPolicy, PrismaBatchAccessRepository } from './modules/batches/batch-access';
import { PrismaContentRepository } from './modules/content/content.repository';
import { PrismaLessonRepository } from './modules/lessons/lesson.repository';
import { LessonService } from './modules/lessons/lesson.service';
import { PrismaQuizRepository } from './modules/quizzes/quiz.repository';
import { QuizService } from './modules/quizzes/quiz.service';
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
import { AppleIapService } from './modules/payments/apple/apple-iap.service';
import { AppleIapCheckout } from './modules/payments/checkout/apple-iap-checkout';
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
import { CertificateCodeGenerator } from './modules/certificates/certificate-code';
import { PrismaCertificateRepository } from './modules/certificates/certificate.repository';
import { CertificateService } from './modules/certificates/certificate.service';
import { WaitlistQueries } from './modules/payments/waitlist.queries';
import { PrismaReportRepository } from './modules/reports/report.repository';
import { ReportService } from './modules/reports/report.service';
import { PrismaTeacherRepository } from './modules/teachers/teacher.repository';
import { TeacherService } from './modules/teachers/teacher.service';
import { PrismaStatsRepository } from './modules/stats/stats.repository';
import { StatsService } from './modules/stats/stats.service';
import { PrismaSettingsRepository } from './modules/settings/settings.repository';
import { SettingsService } from './modules/settings/settings.service';
import { EarningsCalculator } from './modules/payouts/earnings-calculator';
import { PrismaPayoutRepository } from './modules/payouts/payout.repository';
import { PayoutService } from './modules/payouts/payout.service';
import { ClassroomState } from './modules/sessions/classroom-state';
import { JoinPolicy } from './modules/sessions/join-policy';
import { DemoReviewers } from './modules/sessions/demo-reviewers';
import { PrismaSessionRepository } from './modules/sessions/session.repository';
import { SessionService } from './modules/sessions/session.service';
import { PrismaRescheduleRequestRepository } from './modules/sessions/reschedule-request.repository';
import { RescheduleRequestService } from './modules/sessions/reschedule-request.service';
import { PrismaAnnouncementRepository } from './modules/announcements/announcement.repository';
import { AnnouncementService } from './modules/announcements/announcement.service';
import { PrismaConversationRepository } from './modules/conversations/conversation.repository';
import { ConversationService } from './modules/conversations/conversation.service';
import { PrismaSupportRepository } from './modules/support/support.repository';
import { SupportService } from './modules/support/support.service';
import { PrismaSubscriptionRepository } from './modules/subscriptions/subscription.repository';
import { SubscriptionService } from './modules/subscriptions/subscription.service';
import { SubscriptionTransferQueries } from './modules/subscriptions/transfer-queries';

export interface Adapters {
  db: Db;
  clock: Clock;
  mailer: Mailer;
  push: PushNotifier;
  video: VideoProvider;
  payments: PaymentGateway;
  apple: AppleSignedDataVerifier;
  realtime: SocketIoBroadcaster;
  storage: FileStorage;
  /** App Store Connect; null when no API key is configured (the sync is then off). */
  appStore?: AppStoreCatalog | null;
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
      ? new StripePaymentGateway(config.STRIPE_SECRET_KEY, config.STRIPE_WEBHOOK_SECRET, new PriceCalculator(config.VAT_PERCENT))
      : new FakePaymentGateway(new PriceCalculator(config.VAT_PERCENT)),
    apple: new AppStoreSignedDataVerifier({
      bundleId: config.APPLE_BUNDLE_ID,
      environments: config.appleEnvironments,
      appAppleId: config.APPLE_APP_APPLE_ID,
      // OCSP revocation checks of Apple's signing certificates (network) outside dev/test.
      onlineChecks: config.NODE_ENV === 'production',
    }),
    realtime: new SocketIoBroadcaster(),
    appStore: config.appStoreConnect
      ? new AppStoreConnectClient({
          issuerId: config.appStoreConnect.issuerId,
          keyId: config.appStoreConnect.keyId,
          privateKey: config.appStoreConnect.privateKey,
          appAppleId: config.appStoreConnect.appAppleId,
        })
      : null,
    storage:
      config.S3_BUCKET && config.CLOUDFRONT_URL
        ? new S3FileStorage(config.S3_BUCKET, config.AWS_REGION, config.CLOUDFRONT_URL)
        : new LocalDiskStorage(config.UPLOADS_DIR ?? DEFAULT_UPLOADS_DIR, `${config.API_URL.replace(/\/$/, '')}/uploads`),
  };
}

export function createContainer(config: AppConfig, adapters: Adapters = createAdapters(config)) {
  const { db, clock, mailer, push, video, payments, realtime } = adapters;
  const invites = new InviteRegistry();
  const auth = createAuth(db, config, mailer, invites);

  // repositories
  const courseRepo = new PrismaCourseRepository(db);
  const categories = new CategoryService(new PrismaCategoryRepository(db));
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

  const settings = new SettingsService(new PrismaSettingsRepository(db));
  const payouts = new PayoutService(new PrismaPayoutRepository(db), new EarningsCalculator(), settings, notifications, clock, {
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
    DemoReviewers.fromCsv(config.DEMO_REVIEWER_EMAILS),
  );

  const machine = new EnrollmentStateMachine();
  const lifecycle = new EnrollmentLifecycle(paymentsRepo, machine, notifications, realtime, clock, config.WEB_URL);
  const fx = new FxService(new PrismaFxRepository(db));
  const strategies = new CheckoutStrategyRegistry([
    new StripeCheckout(payments, config.WEB_URL),
    new BankTransferCheckout(paymentsRepo, notifications, config.BANK_TRANSFER_HOLD_HOURS),
    new AppleIapCheckout(),
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

  const finance = new FinanceAdminService(paymentsRepo, lifecycle, payments, payouts, notifications, config.BANK_TRANSFER_HOLD_HOURS);

  const subscriptionRepo = new PrismaSubscriptionRepository(db);
  const subscriptions = new SubscriptionService(
    subscriptionRepo,
    payments,
    notifications,
    payouts,
    clock,
    new ReferenceGenerator(),
    new PriceCalculator(config.VAT_PERCENT),
    config.WEB_URL,
    undefined,
    adapters.apple,
    undefined,
    { repo: subscriptionRepo, bankAccounts: paymentsRepo, holdHours: config.BANK_TRANSFER_HOLD_HOURS },
    subscriptionRepo,
  );

  const appStoreSyncer: AppStoreSyncer = adapters.appStore
    ? (() => {
        const engine = new AppStoreSyncService(adapters.appStore, new PriceCalculator(config.VAT_PERCENT));
        return {
          configured: true,
          syncSeatPrice: (priceFils) => engine.syncSeatPrice(priceFils),
          syncRecordedCourse: (course) => engine.syncRecordedCourse(course),
        };
      })()
    : new DisabledAppStoreSync();
  const appStoreSync = new AppStoreSyncCoordinator(appStoreSyncer, new PrismaAppleSyncStore(db), courseRepo, clock);

  const meService = new MeService(new PrismaMeRepository(db), clock, lifecycle, adapters.storage);
  const certificates = new CertificateService(new PrismaCertificateRepository(db), new CertificateCodeGenerator());
  const services = {
    settings,
    appStoreSync,
    courses: new CourseService(courseRepo, notifications, clock, categories, payments, appStoreSync),
    categories,
    reviews: new ReviewService(new PrismaReviewRepository(db), notifications, () => clock.now()),
    savedCourses: new SavedCourseService(db),
    instructorApplications: new InstructorApplicationService(new PrismaApplicationRepository(db), notifications, () => clock.now()),
    batches: new BatchService(batchRepo, courseRepo, new ScheduleGenerator(), access, notifications, clock, appStoreSync),
    notifications,
    me: meService,
    calendar: new CalendarService(meService, new PrismaMeRepository(db), new CalendarTokenSigner(config.BETTER_AUTH_SECRET), clock, {
      api: config.API_URL,
      web: config.WEB_URL,
    }),
    stats: new StatsService(new PrismaStatsRepository(db), video),
    receipts: new ReceiptUploadService(adapters.storage, checkout, subscriptions),
    subscriptionTransfers: new SubscriptionTransferQueries(db),
    sessions,
    rescheduleRequests: new RescheduleRequestService(rescheduleRequestRepo, sessions, notifications, clock),
    payouts,
    checkout,
    subscriptions,
    finance,
    appleIap: new AppleIapService(paymentsRepo, adapters.apple, checkout, finance, subscriptions),
    fx,
    bankAccounts: new BankAccountService(new PrismaBankAccountRepository(db)),
    coupons: new CouponService(new PrismaCouponRepository(db)),
    orders: new OrderQueries(db),
    waitlist: new WaitlistQueries(db),
    certificates,
    reports: new ReportService(new PrismaReportRepository(db), clock),
    teachers: new TeacherService(new PrismaTeacherRepository(db)),
    content: new ContentService(new PrismaContentRepository(db), access, notifications, clock, adapters.storage),
    lessons: new LessonService(new PrismaLessonRepository(db), clock, (userId, courseId) => certificates.issueRecordedIfEligible(userId, courseId)),
    quizzes: new QuizService(new PrismaQuizRepository(db), access, notifications, clock, (userId, courseId) => certificates.issueRecordedIfEligible(userId, courseId)),
    courseMedia: new CourseMediaService(adapters.storage),
    announcements: new AnnouncementService(new PrismaAnnouncementRepository(db), access, notifications, config.WEB_URL),
    conversations: new ConversationService(new PrismaConversationRepository(db), realtime, notifications, clock),
    support: new SupportService(new PrismaSupportRepository(db), notifications, clock, config.WEB_URL),
    admin: new AdminService(new PrismaAdminRepository(db), new BetterAuthUserProvisioner(auth, invites, config.WEB_URL), video, clock),
  };

  /** Background jobs (started by index.ts only, never in tests). */
  const jobs: Job[] = [
    { name: 'expire-stale-orders', everyMs: 5 * 60_000, run: () => checkout.expireStaleOrders() },
    { name: 'expire-transfer-payments', everyMs: 5 * 60_000, run: () => subscriptions.expireStaleTransferPayments() },
    // Before the expiry job, so a plan ending today is still reminded.
    { name: 'remind-renewals', everyMs: 24 * 3_600_000, run: () => subscriptions.remindRenewals() },
    { name: 'expire-transfer-subscriptions', everyMs: 24 * 3_600_000, run: () => subscriptions.expireTransferSubscriptions() },
    // Sequential and slow on purpose (Apple rate limits); a no-op without an App Store Connect key. First run at 03:00 UAE (23:00 UTC), never at boot: a restart must not hit Apple.
    { name: 'sync-app-store-catalog', everyMs: 24 * 3_600_000, firstRunInMs: msUntilUtcHour(clock.now(), 23), run: () => appStoreSync.syncAppStoreCatalog() },
    { name: 'release-matured-earnings', everyMs: 60 * 60_000, run: async () => ({ released: await payouts.releaseMatured() }) },
  ];

  const platformSettings = {
    rules: {
      EARNING_HOLD_DAYS: config.EARNING_HOLD_DAYS,
      MIN_PAYOUT_AED: config.MIN_PAYOUT_AED,
      BANK_TRANSFER_HOLD_HOURS: config.BANK_TRANSFER_HOLD_HOURS,
      VAT_PERCENT: config.VAT_PERCENT,
    },
    integrations: {
      stripe: !!config.STRIPE_SECRET_KEY,
      appleIap: config.appleEnvironments.length > 0,
      livekit: !!(config.LIVEKIT_API_KEY && config.LIVEKIT_API_SECRET && config.LIVEKIT_URL),
      smtp: !!config.SMTP_HOST,
      push: !!(config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY),
    },
  };

  return { config, auth, adapters, services, jobs, platformSettings };
}

export type Container = ReturnType<typeof createContainer>;
