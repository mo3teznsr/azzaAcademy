import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';
import { fileURLToPath } from 'node:url';
import type { Container } from './container';
import { errorHandler } from './http/error-handler';
import { sessionMiddleware } from './http/middleware';
import type { AppEnv } from './http/types';
import { adminRoutes } from './modules/admin/admin.routes';
import { batchRoutes } from './modules/batches/batch.routes';
import { certificateRoutes } from './modules/certificates/certificate.routes';
import { contentRoutes } from './modules/content/content.routes';
import { courseRoutes } from './modules/courses/course.routes';
import { meRoutes } from './modules/me/me.routes';
import { adminFinanceRoutes, paymentRoutes } from './modules/payments/payments.routes';
import { adminPayoutRoutes, teacherPayoutRoutes } from './modules/payouts/payout.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
import { rescheduleRequestRoutes } from './modules/sessions/reschedule-request.routes';
import { calendarFeedRoutes } from './modules/me/calendar.routes';
import { adminReportRoutes } from './modules/reports/report.routes';
import { statsRoutes } from './modules/stats/stats.routes';
import { teacherRoutes } from './modules/teachers/teacher.routes';
import { webhookRoutes } from './modules/webhooks/webhook.routes';

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
    webhookRoutes({ payments: adapters.payments, video: adapters.video, checkout: services.checkout, sessions: services.sessions }),
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
    return c.body(new Uint8Array(file.bytes) as Uint8Array<ArrayBuffer>, 200, { 'Content-Type': file.contentType, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
  });

  const api = new Hono<AppEnv>()
    .route('/courses', courseRoutes(services.courses))
    .route('/batches', batchRoutes(services.batches))
    .route('/me', meRoutes(services.me, services.notifications, services.calendar))
    .route('/stats', statsRoutes(services.stats))
    .route('/sessions', sessionRoutes(services.sessions))
    .route('/reschedule-requests', rescheduleRequestRoutes(services.rescheduleRequests))
    .route('/teacher', teacherPayoutRoutes(services.payouts))
    .route('/teachers', teacherRoutes(services.teachers))
    .route('/admin', adminRoutes(services.admin, container.platformSettings))
    .route('/admin', adminFinanceRoutes(services))
    .route('/admin', adminPayoutRoutes(services.payouts))
    .route('/admin', adminReportRoutes(services.reports))
    .route('/', paymentRoutes(services))
    .route('/', contentRoutes(services.content))
    .route('/', certificateRoutes(services.certificates));

  app.route('/api/v1', api);
  return app;
}

export type App = ReturnType<typeof createApp>;
