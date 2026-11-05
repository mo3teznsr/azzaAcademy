/**
 * Typed HTTP client for the Azza API. Single responsibility: transport + error normalisation.
 * Resource modules (courses.ts, batches.ts …) build on `request` and never call fetch directly.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/** Resolves an API-relative media path (`/media/...`, `/uploads/...`) to an absolute URL; absolute URLs pass through. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('/') ? `${API_URL}${path}` : path;
}

export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;
export type Query = Record<string, QueryValue>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork() {
    return this.status === 0;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
}

export function toQueryString(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Multipart body (file uploads); the browser sets the boundary header. */
  form?: FormData;
  query?: Query;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Return the raw Response (CSV exports). */
  raw?: boolean;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
  message?: string;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, query, signal, headers } = opts;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${toQueryString(query)}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !form ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK', 'Can’t reach the Azza API. Check your connection and try again.');
  }

  if (opts.raw) {
    if (!res.ok) throw await toApiError(res);
    return res as unknown as T;
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, 'BAD_RESPONSE', 'The server sent a response we could not read.');
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let payload: ErrorEnvelope | undefined;
  try {
    payload = (await res.json()) as ErrorEnvelope;
  } catch {
    /* non-JSON error body */
  }
  const code = payload?.error?.code ?? defaultCode(res.status);
  const message = payload?.error?.message ?? payload?.message ?? res.statusText ?? 'Request failed';
  return new ApiError(res.status, code, message, payload?.error?.details);
}

function defaultCode(status: number): string {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422 || status === 400) return 'VALIDATION';
  return 'SERVER_ERROR';
}

export const http = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};

/** Unwrap an `{ items }` envelope for screens that only need the list. */
export const items = <T>(p: Promise<{ items: T[] }>): Promise<T[]> => p.then((r) => r.items);
