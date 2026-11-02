import { createHmac, timingSafeEqual } from 'node:crypto';

/** Signs per-user calendar feed URLs so calendar apps can subscribe without a session cookie. */
export class CalendarTokenSigner {
  constructor(private readonly secret: string) {}

  sign(userId: string): string {
    return createHmac('sha256', this.secret).update(`calendar:${userId}`).digest('hex').slice(0, 40);
  }

  verify(userId: string, token: string): boolean {
    const expected = Buffer.from(this.sign(userId));
    const given = Buffer.from(token);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
