import { http } from './client';

/** Which social sign-in providers the API has configured (each button shows only when its provider is on). */
export interface AuthProviders {
  google: boolean;
  apple: boolean;
}

export const authProvidersApi = {
  get: () => http.get<AuthProviders>('/api/v1/auth-providers'),
};
