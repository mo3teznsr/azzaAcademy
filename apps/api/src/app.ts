import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Container } from './container';
import { errorHandler } from './http/error-handler';
import { sessionMiddleware } from './http/middleware';
import type { AppEnv } from './http/types';
import { adminRoutes } from './modules/admin/admin.routes';
import { batchRoutes } from './modules/batches/batch.routes';
import { contentRoutes } from './modules/content/content.routes';
import { courseRoutes } from './modules/courses/course.routes';
import { meRoutes } from './modules/me/me.routes';
import { adminFinanceRoutes, paymentRoutes } from './modules/payments/payments.routes';
import { adminPayoutRoutes, teacherPayoutRoutes } from './modules/payouts/payout.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
import { rescheduleRequestRoutes } from './modules/sessions/reschedule-request.routes';
import { calendarFeedRoutes } from './modules/me/calendar.routes';
import { statsRoutes } from './modules/stats/stats.routes';
import { webhookRoutes } from './modules/webhooks/webhook.routes';

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
  // Uploaded files (receipts) served from the FileStorage port; keys are unguessable.
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
    .route('/admin', adminRoutes(services.admin, container.platformSettings))
    .route('/admin', adminFinanceRoutes(services))
    .route('/admin', adminPayoutRoutes(services.payouts))
    .route('/', paymentRoutes(services))
    .route('/', contentRoutes(services.content));

  app.route('/api/v1', api);
  return app;
}

export type App = ReturnType<typeof createApp>;
