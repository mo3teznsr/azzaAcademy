import { API_URL } from '@/lib/api/client';

export interface ServerSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type SessionLookup =
  | { status: 'ok'; user: ServerSessionUser }
  | { status: 'anonymous' }
  | { status: 'unreachable' };

/** Optimistic session lookup used by the proxy (forwards the browser cookie to better-auth). */
export async function lookupSession(cookieHeader: string | null): Promise<SessionLookup> {
  if (!cookieHeader || !cookieHeader.includes('session_token')) return { status: 'anonymous' };
  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie: cookieHeader, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return res.status >= 500 ? { status: 'unreachable' } : { status: 'anonymous' };
    const body = (await res.json()) as { user?: ServerSessionUser } | null;
    return body?.user ? { status: 'ok', user: body.user } : { status: 'anonymous' };
  } catch {
    return { status: 'unreachable' };
  }
}
