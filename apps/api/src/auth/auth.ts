import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { bearer } from 'better-auth/plugins';
import { isValidPhone, toE164 } from '@azza/shared';
import type { AppConfig } from '../core/config';
import type { Mailer } from '../core/ports';
import type { Db } from '../infrastructure/db';
import { appEmails, authEmails } from '../modules/notifications/email-templates';
import type { InviteRegistry } from './user-provisioner';

/**
 * Sign-up over HTTP needs a valid mobile number, stored in E.164. An input that is not already E.164 is read as a UAE
 * national number (the default country). Server-side calls (seed, scripts) have no request and are not checked, which is
 * why the `phone` field itself stays optional.
 */
export function signUpPhone(body: unknown): string {
  const raw = (body as { phone?: unknown } | null)?.phone;
  if (typeof raw !== 'string' || !raw.trim()) throw new APIError('BAD_REQUEST', { message: 'Enter your mobile number', code: 'PHONE_REQUIRED' });
  const e164 = toE164('AE', raw);
  if (!isValidPhone(e164)) throw new APIError('BAD_REQUEST', { message: 'That phone number does not look right', code: 'PHONE_INVALID' });
  return e164;
}

/** Which display currencies can be chosen (the enabled ones); omitted, any code passes. */
export interface CurrencyCheck {
  isSelectable(code: string): Promise<boolean>;
}

/**
 * better-auth `before` hook for the user-writing endpoints, so they cannot bypass our validation:
 * - `POST /sign-up/email` (HTTP only): `phone` required and stored in E.164; an unavailable `displayCurrency` becomes AED.
 * - `POST /update-user`: `phone`, when sent, must be valid (stored in E.164; `null`/`''` clears it); `displayCurrency`,
 *   when sent, must be an enabled currency (400 `CURRENCY_UNAVAILABLE`).
 */
export function createUserHooks(currencies?: CurrencyCheck) {
  return createAuthMiddleware(async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    if (ctx.path === '/sign-up/email') {
      if (!ctx.request) return;
      const next: Record<string, unknown> = { ...body, phone: signUpPhone(body) };
      if (body.displayCurrency !== undefined) {
        const code = typeof body.displayCurrency === 'string' ? body.displayCurrency.trim().toUpperCase() : '';
        next.displayCurrency = code && (await isSelectable(currencies, code)) ? code : 'AED';
      }
      return { context: { body: next } };
    }
    if (ctx.path === '/update-user') {
      const next: Record<string, unknown> = { ...body };
      if (body.phone !== undefined) {
        next.phone = updatePhone(body.phone);
        // better-auth merges hook context with defu, which ignores null; set the clear on the body itself too.
        if (next.phone === null && ctx.body && typeof ctx.body === 'object') (ctx.body as Record<string, unknown>).phone = null;
      }
      if (body.displayCurrency !== undefined) {
        const code = typeof body.displayCurrency === 'string' ? body.displayCurrency.trim().toUpperCase() : '';
        if (!code || !(await isSelectable(currencies, code))) {
          throw new APIError('BAD_REQUEST', { message: `${code || 'That'} is not an available currency`, code: 'CURRENCY_UNAVAILABLE' });
        }
        next.displayCurrency = code;
      }
      return { context: { body: next } };
    }
  });
}

/** The hook without a currency check (tests, scripts). */
export const signUpPhoneHook = createUserHooks();

function isSelectable(currencies: CurrencyCheck | undefined, code: string) {
  if (!/^[A-Z]{3}$/.test(code)) return Promise.resolve(false);
  return currencies ? currencies.isSelectable(code) : Promise.resolve(true);
}

/** `/update-user` phone: `null` or `''` clears; anything else must be valid and is stored in E.164. */
function updatePhone(raw: unknown): string | null {
  if (raw === null || (typeof raw === 'string' && !raw.trim())) return null;
  if (typeof raw !== 'string') throw new APIError('BAD_REQUEST', { message: 'That phone number does not look right', code: 'PHONE_INVALID' });
  const e164 = toE164('AE', raw);
  if (!isValidPhone(e164)) throw new APIError('BAD_REQUEST', { message: 'That phone number does not look right', code: 'PHONE_INVALID' });
  return e164;
}

export function createAuth(db: Db, config: AppConfig, mailer: Mailer, invites?: InviteRegistry, currencies?: CurrencyCheck) {
  return betterAuth({
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: config.trustedOrigins,
    // The web app (azza.academy) and API (api.azza.academy) are different hosts; the web
    // proxy reads the session cookie, so it must be scoped to the shared parent domain.
    advanced: {
      ...(config.COOKIE_DOMAIN ? { crossSubDomainCookies: { enabled: true, domain: config.COOKIE_DOMAIN } } : {}),
      // Behind a proxy, rate limits must key on the visitor's IP, read only from the header the
      // proxy overwrites (never from client-supplied X-Forwarded-For).
      ...(config.CLIENT_IP_HEADER ? { ipAddress: { ipAddressHeaders: [config.CLIENT_IP_HEADER.toLowerCase()] } } : {}),
    },
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
    hooks: { before: createUserHooks(currencies) },
    // Mobile (Flutter) sends `Authorization: Bearer <token>`; web uses cookies.
    plugins: [bearer()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthUser = Auth['$Infer']['Session']['user'];
export type AuthSessionData = Auth['$Infer']['Session']['session'];
