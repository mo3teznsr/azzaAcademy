import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { PushMessage, PushNotifier } from '../../core/ports';

const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

export class FirebasePushNotifier implements PushNotifier {
  private readonly app: App;

  constructor(creds: { projectId: string; clientEmail: string; privateKey: string }) {
    this.app =
      getApps()[0] ??
      initializeApp({
        credential: cert({ ...creds, privateKey: creds.privateKey.replace(/\\n/g, '\n') }),
      });
  }

  async send({ tokens, title, body, data }: PushMessage) {
    if (tokens.length === 0) return { invalidTokens: [] };
    const res = await getMessaging(this.app).sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });
    const invalidTokens = res.responses.flatMap((r, i) =>
      !r.success && r.error && STALE_TOKEN_CODES.has(r.error.code) ? [tokens[i]!] : [],
    );
    return { invalidTokens };
  }
}

export class LogPushNotifier implements PushNotifier {
  async send({ tokens, title }: PushMessage) {
    if (tokens.length) console.info(`[push] ${tokens.length} device(s) · ${title}`);
    return { invalidTokens: [] };
  }
}
