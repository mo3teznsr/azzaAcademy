import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_PAGES, homeFor, rolesForPath } from '@/lib/auth/roles';
import { lookupSession } from '@/lib/auth/session.server';
import { LOCALE_COOKIE } from '@/lib/i18n/config';
import { LOCALE_HEADER, splitLocale } from '@/lib/i18n/routing';

/**
 * Runs before every page (Next 16 "proxy", formerly middleware):
 * 1. Language URLs: `/ar/...` and `/en/...` are rewritten to the unprefixed page, with the language passed in
 *    the `x-azza-locale` request header (read by `getLocale()`) and remembered in the locale cookie.
 * 2. Optimistic role guard. The authoritative check is the API itself + the client RoleGate in each area layout.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, path } = splitLocale(pathname);

  const requestHeaders = new Headers(request.headers);
  // Only the proxy decides the URL language; never trust one sent by the client.
  requestHeaders.delete(LOCALE_HEADER);
  if (locale) requestHeaders.set(LOCALE_HEADER, locale);

  const pass = () => {
    const res = locale
      ? NextResponse.rewrite(new URL(path + search, request.url), { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
    // Later unprefixed links (sign-in, checkout…) stay in the language the visitor picked by URL.
    if (locale && request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
      res.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    }
    return res;
  };

  const roles = rolesForPath(path);
  const isAuthPage = AUTH_PAGES.includes(path);
  if (!roles && !isAuthPage) return pass();

  const session = await lookupSession(request.headers.get('cookie'));

  // API down: let the page render its own error state instead of bouncing the user.
  if (session.status === 'unreachable') return pass();

  if (isAuthPage) {
    if (session.status === 'ok' && path !== '/reset-password') {
      return NextResponse.redirect(new URL(homeFor(session.user.role), request.url));
    }
    return pass();
  }

  if (session.status === 'anonymous') {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('next', path + search);
    return NextResponse.redirect(url);
  }

  if (roles && !roles.includes(session.user.role as never)) {
    return NextResponse.redirect(new URL(homeFor(session.user.role), request.url));
  }
  return pass();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp|txt|xml)$).*)'],
};
