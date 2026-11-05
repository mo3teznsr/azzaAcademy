import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import type { AppConfig } from '../core/config';
import type { Mailer } from '../core/ports';
import type { Db } from '../infrastructure/db';
import { appEmails, authEmails } from '../modules/notifications/email-templates';
import type { InviteRegistry } from './user-provisioner';

export function createAuth(db: Db, config: AppConfig, mailer: Mailer, invites?: InviteRegistry) {
  return betterAuth({
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: config.trustedOrigins,
    // The web app (azza.academy) and API (api.azza.academy) are different hosts; the web
    // proxy reads the session cookie, so it must be scoped to the shared parent domain.
    ...(config.COOKIE_DOMAIN ? { advanced: { crossSubDomainCookies: { enabled: true, domain: config.COOKIE_DOMAIN } } } : {}),
    database: prismaAdapter(db, { provider: 'postgresql' }),
    // Our Prisma model for login sessions is AuthSession (LiveSession is the class).
    session: { modelName: 'authSession', expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'STUDENT', input: false },
        locale: { type: 'string', required: false, defaultValue: 'en' },
        timezone: { type: 'string', required: false, defaultValue: 'Asia/Dubai' },
        displayCurrency: { type: 'string', required: false, defaultValue: 'AED' },
        phone: { type: 'string', required: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        const role = (user as { role?: string }).role ?? 'STUDENT';
        const body = invites?.consume(user.email) ? appEmails.invite(user.name, role, url) : authEmails.resetPassword(user.name, url);
        void mailer.send({ to: user.email, ...body });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        void mailer.send({ to: user.email, ...authEmails.verifyEmail(user.name, url) });
      },
    },
    // Mobile (Flutter) sends `Authorization: Bearer <token>`; web uses cookies.
    plugins: [bearer()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthUser = Auth['$Infer']['Session']['user'];
export type AuthSessionData = Auth['$Infer']['Session']['session'];
