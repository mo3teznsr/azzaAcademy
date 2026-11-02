import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_PAGES, homeFor, rolesForPath } from '@/lib/auth/roles';
import { lookupSession } from '@/lib/auth/session.server';

/**
 * Optimistic role guard (Next 16 "proxy", formerly middleware).
 * The authoritative check is the API itself + the client RoleGate in each area layout.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const roles = rolesForPath(pathname);
  const isAuthPage = AUTH_PAGES.includes(pathname);
  if (!roles && !isAuthPage) return NextResponse.next();

  const session = await lookupSession(request.headers.get('cookie'));

  // API down: let the page render its own error state instead of bouncing the user.
  if (session.status === 'unreachable') return NextResponse.next();

  if (isAuthPage) {
    if (session.status === 'ok' && pathname !== '/reset-password') {
      return NextResponse.redirect(new URL(homeFor(session.user.role), request.url));
    }
    return NextResponse.next();
  }

  if (session.status === 'anonymous') {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  if (roles && !roles.includes(session.user.role as never)) {
    return NextResponse.redirect(new URL(homeFor(session.user.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp|txt)$).*)'],
};
