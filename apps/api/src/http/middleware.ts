import type { Context, MiddlewareHandler } from 'hono';
import type { Role } from '@azza/shared';
import type { Auth } from '../auth/auth';
import { ForbiddenError, UnauthorizedError } from '../core/errors';
import type { AppEnv, CurrentUser } from './types';

/** Resolves the better-auth session (cookie or bearer) into `c.var.user`. */
export function sessionMiddleware(auth: Auth): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    const u = result?.user as (CurrentUser & { banned?: boolean }) | undefined;
    c.set('user', u && !u.banned ? { id: u.id, name: u.name, email: u.email, role: u.role, locale: u.locale, timezone: u.timezone } : null);
    await next();
  };
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) throw new UnauthorizedError();
  await next();
};

export const requireRole =
  (...roles: Role[]): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const user = c.get('user');
    if (!user) throw new UnauthorizedError();
    if (!roles.includes(user.role)) throw new ForbiddenError();
    await next();
  };

export function currentUser(c: Context<AppEnv>): CurrentUser {
  const user = c.get('user');
  if (!user) throw new UnauthorizedError();
  return user;
}
