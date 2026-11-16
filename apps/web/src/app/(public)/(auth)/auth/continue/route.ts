import { NextResponse, type NextRequest } from 'next/server';
import { landingFor } from '@/lib/auth/roles';
import { lookupSession } from '@/lib/auth/session.server';

/**
 * Landing after "Continue with Google / Apple": the API has just set the session cookie and sends the browser here. Same rule as
 * the email sign-in: `next` when the user's role may open it, else their home. No session (cookie blocked, flow abandoned) goes
 * back to sign-in, keeping `next`.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next');
  const session = await lookupSession(request.headers.get('cookie'));
  if (session.status === 'anonymous') {
    const url = new URL('/sign-in', request.url);
    if (next) url.searchParams.set('next', next);
    url.searchParams.set('error', 'no_session');
    return NextResponse.redirect(url);
  }
  // API unreachable: the target page shows its own error state, as the proxy does.
  const role = session.status === 'ok' ? session.user.role : null;
  return NextResponse.redirect(new URL(landingFor(next, role), request.url));
}
