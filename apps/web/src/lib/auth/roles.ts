import type { Role } from '@azza/shared';

/** Where each role lands after sign-in. */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/learn',
  TEACHER: '/studio',
  ADMIN: '/admin',
};

export const homeFor = (role: string | null | undefined): string => ROLE_HOME[(role as Role) ?? 'STUDENT'] ?? '/learn';

/** Signed-in pages every role shares (messages, support, announcements). */
const SHARED_PREFIXES = ['/messages', '/support', '/announcements'];

const STUDENT_PREFIXES = ['/learn', '/schedule', '/library', '/assignments', '/checkout', '/orders', '/live', '/settings', '/certificates'];

/** Which roles may open a given path. `null` = public. */
export function rolesForPath(pathname: string): Role[] | null {
  if (SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return ['STUDENT', 'TEACHER', 'ADMIN'];
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return ['ADMIN'];
  if (pathname.startsWith('/studio/live/')) return ['TEACHER', 'ADMIN'];
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return ['TEACHER', 'ADMIN'];
  if (STUDENT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return ['STUDENT', 'ADMIN'];
  return null;
}

export const AUTH_PAGES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

/** Only allow same-origin relative redirects. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}
