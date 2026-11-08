import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { fileURLToPath } from 'node:url';
import type { Container } from './container';
import { errorHandler } from './http/error-handler';
import { sessionMiddleware } from './http/middleware';
import type { AppEnv } from './http/types';
import { adminAppStoreRoutes } from './modules/appstore-sync/appstore-sync.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { adminMediaRoutes } from './modules/admin/course-media.routes';
import { batchRoutes } from './modules/batches/batch.routes';
import { certificateRoutes } from './modules/certificates/certificate.routes';
import { contentRoutes } from './modules/content/content.routes';
import { lessonRoutes } from './modules/lessons/lesson.routes';
import { quizRoutes } from './modules/quizzes/quiz.routes';
import { adminCourseRoutes, courseRoutes } from './modules/courses/course.routes';
import { adminCategoryImageRoutes, categoryRoutes } from './modules/categories/category.routes';
import { engagementRoutes } from './modules/reviews/review.routes';
import { instructorApplicationRoutes } from './modules/instructors/instructor-application.routes';
import { meRoutes } from './modules/me/me.routes';
import { adminFinanceRoutes, paymentRoutes } from './modules/payments/payments.routes';
import { adminPayoutRoutes, teacherPayoutRoutes } from './modules/payouts/payout.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
import { rescheduleRequestRoutes } from './modules/sessions/reschedule-request.routes';
import { calendarFeedRoutes } from './modules/me/calendar.routes';
import { adminSettingsRoutes, siteSettingsRoutes } from './modules/settings/settings.routes';
import { adminCurrencyRoutes, currencyRoutes } from './modules/currencies/currency.routes';
import { adminReportRoutes } from './modules/reports/report.routes';
import { statsRoutes } from './modules/stats/stats.routes';
import { teacherRoutes } from './modules/teachers/teacher.routes';
import { webhookRoutes } from './modules/webhooks/webhook.routes';
import { announcementRoutes } from './modules/announcements/announcement.routes';
import { conversationRoutes } from './modules/conversations/conversation.routes';
import { supportRoutes } from './modules/support/support.routes';
import { adminSubscriptionRoutes, teacherSubscriberRoutes } from './modules/subscriptions/subscription-admin.routes';
import { subscriptionRoutes } from './modules/subscriptions/subscription.routes';

/** `apps/api/public/media/` regardless of the process cwd. */
const MEDIA_ROOT = fileURLToPath(new URL('../public/media/', import.meta.url));

export function createApp(container: Container) {
  const { auth, config, services, adapters } = container;
  const app = new Hono<AppEnv>();

  if (config.NODE_ENV !== 'test') app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: config.trustedOrigins,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
      credentials: true,
      maxAge: 600,
    }),
  );
  app.onError(errorHandler);

  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
  // Webhooks are registered before the session middleware: they authenticate by signature, not by user.
  app.route(
    '/api/webhooks',
    webhookRoutes({
      payments: adapters.payments,
      video: adapters.video,
      checkout: services.checkout,
      subscriptions: services.subscriptions,
      sessions: services.sessions,
      appleIap: services.appleIap,
    }),
  );
  // Public, token-signed ICS feed (calendar apps send no cookies).
  app.route('/api/calendar', calendarFeedRoutes(services.calendar));
  app.use('/api/*', sessionMiddleware(auth));

  app.get('/health', (c) => c.json({ ok: true }));
  // Bundled art (course covers, teacher portraits) shipped with the API; paths are stored as `/media/...`.
  app.get('/media/*', serveStatic({ root: MEDIA_ROOT, rewriteRequestPath: (p) => p.slice('/media'.length) }), (c) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'File not found' } }, 404),
  );
  // Uploaded files served from the FileStorage port; keys are unguessable. With S3 the URLs point at
  // CloudFront instead — this route only keeps older local `/uploads/...` links working.
  app.get('/uploads/*', async (c) => {
    const file = await adapters.storage.read(c.req.path.slice('/uploads/'.length));
    if (!file) return c.json({ error: { code: 'NOT_FOUND', message: 'File not found' } }, 404);
    const headers = { 'Content-Type': file.contentType, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    // Single byte ranges, so browsers (Safari in particular) can play and seek uploaded intro videos.
    const range = byteRange(c.req.header('Range'), file.bytes.length);
    if (range === 'invalid') return c.body(null, 416, { 'Content-Range': `bytes */${file.bytes.length}` });
    if (range) {
      const [start, end] = range;
      return c.body(file.bytes.slice(start, end + 1) as Uint8Array<ArrayBuffer>, 206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${file.bytes.length}` });
    }
    return c.body(new Uint8Array(file.bytes) as Uint8Array<ArrayBuffer>, 200, headers);
  });

  const api = new Hono<AppEnv>()
    .route('/', engagementRoutes(services.reviews, services.savedCourses))
    .route('/courses', courseRoutes(services.courses))
    .route('/categories', categoryRoutes(services.categories))
    .route('/instructor-applications', instructorApplicationRoutes(services.instructorApplications))
    .route('/batches', batchRoutes(services.batches))
    .route('/me', meRoutes(services.me, services.notifications, services.calendar))
    .route('/stats', statsRoutes(services.stats))
    .route('/sessions', sessionRoutes(services.sessions))
    .route('/reschedule-requests', rescheduleRequestRoutes(services.rescheduleRequests))
    // First: it answers admins too, which the TEACHER-only payout guard below would refuse.
    .route('/teacher', teacherSubscriberRoutes(services.subscriptions))
    .route('/teacher', teacherPayoutRoutes(services.payouts))
    .route('/teachers', teacherRoutes(services.teachers))
    .route('/admin', adminRoutes(services.admin, services.siteSettings))
    .route('/admin', adminMediaRoutes(services.courseMedia))
    .route('/admin', adminSettingsRoutes(services.settings, services.siteSettings))
    .route('/admin', adminCurrencyRoutes(services.currencies))
    .route('/admin', adminCategoryImageRoutes(services.categories))
    .route('/admin', adminCourseRoutes(services.courses))
    .route('/admin', adminAppStoreRoutes(services.appStoreSync))
    .route('/admin', adminSubscriptionRoutes(services.subscriptions))
    // Teachers upload covers and intro videos for the courses they propose.
    .route('/courses', adminMediaRoutes(services.courseMedia, ['TEACHER', 'ADMIN']))
    .route('/admin', adminFinanceRoutes(services))
    .route('/admin', adminPayoutRoutes(services.payouts))
    .route('/admin', adminReportRoutes(services.reports))
    .route('/', siteSettingsRoutes(services.siteSettings))
    .route('/', currencyRoutes(services.currencies))
    .route('/', paymentRoutes(services))
    .route('/', contentRoutes(services.content))
    .route('/', lessonRoutes(services.lessons))
    .route('/', quizRoutes(services.quizzes))
    .route('/', subscriptionRoutes(services.subscriptions, services.receipts))
    .route('/', certificateRoutes(services.certificates))
    .route('/', announcementRoutes(services.announcements))
    .route('/', conversationRoutes(services.conversations))
    .route('/support', supportRoutes(services.support));

  app.route('/api/v1', api);
  return app;
}

export type App = ReturnType<typeof createApp>;

/** Parses a single `bytes=start-end` Range header: `null` = serve the whole file, `'invalid'` = 416. */
export function byteRange(header: string | undefined, size: number): [number, number] | null | 'invalid' {
  const m = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start: number;
  let end: number;
  if (m[1] === '') {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start <= end && start < size ? [start, end] : 'invalid';
}
