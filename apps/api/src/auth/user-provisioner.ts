import type { Locale, Role } from '@azza/shared';
import type { Auth } from './auth';

/** Admin-created accounts: the user receives an invite email with a link to choose a password. */
export interface UserProvisioner {
  createInvited(input: { name: string; email: string; role: Role; locale: Locale }): Promise<{ id: string }>;
}

/**
 * Emails that should get the "invite" template instead of "reset password" when better-auth
 * calls sendResetPassword (the invite *is* a password-reset link under the hood).
 */
export class InviteRegistry {
  private readonly pending = new Set<string>();
  add(email: string) {
    this.pending.add(email.toLowerCase());
  }
  consume(email: string) {
    return this.pending.delete(email.toLowerCase());
  }
}

export class BetterAuthUserProvisioner implements UserProvisioner {
  constructor(
    private readonly auth: Auth,
    private readonly invites: InviteRegistry,
    private readonly webUrl: string,
  ) {}

  async createInvited(input: { name: string; email: string; role: Role; locale: Locale }) {
    const ctx = await this.auth.$context;
    const email = input.email.toLowerCase();
    const user = await ctx.internalAdapter.createUser({
      name: input.name,
      email,
      emailVerified: true,
      role: input.role,
      locale: input.locale,
    }, { method: 'admin' });
    // random password nobody knows; the invite link lets the user set their own
    const hash = await ctx.password.hash(crypto.randomUUID() + crypto.randomUUID());
    await ctx.internalAdapter.linkAccount({ providerId: 'credential', accountId: user.id, password: hash, userId: user.id });
    this.invites.add(email);
    await this.auth.api.requestPasswordReset({ body: { email, redirectTo: `${this.webUrl}/reset-password` } });
    return { id: user.id };
  }
}
