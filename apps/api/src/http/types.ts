import type { Role } from '@azza/shared';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  locale: string;
  timezone: string;
}

export type AppEnv = {
  Variables: {
    user: CurrentUser | null;
  };
};
