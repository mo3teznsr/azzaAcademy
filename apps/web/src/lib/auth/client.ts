'use client';

import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { API_URL } from '@/lib/api/client';

/** better-auth client — cookies, cross-origin to the API. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: 'include' },
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: 'string', required: false, input: false },
        locale: { type: 'string', required: false },
        timezone: { type: 'string', required: false },
        displayCurrency: { type: 'string', required: false },
        phone: { type: 'string', required: false },
      },
    }),
  ],
});

export type AuthSession = typeof authClient.$Infer.Session;
export type AuthUser = AuthSession['user'];
