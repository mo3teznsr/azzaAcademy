import { createPublicKey, createVerify, type KeyObject } from 'node:crypto';
import { AppError } from '../../core/errors';

/** An Amazon SNS HTTP(S) delivery (the JSON body SNS posts to a subscribed endpoint). */
export interface SnsMessage {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: '1' | '2';
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
}

/** SNS signing certificates and subscribe links are served only from `sns.<region>.amazonaws.com` over HTTPS. */
const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/;

export function isSnsUrl(value: string | undefined, opts: { pem?: boolean } = {}): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && SNS_HOST.test(u.hostname) && !u.port && (!opts.pem || u.pathname.endsWith('.pem'));
  } catch {
    return false;
  }
}

/**
 * Pure: the string SNS signs, as AWS documents it ("Verifying the signatures of Amazon SNS messages"): the listed keys in
 * byte order, each as `Key\nValue\n`; `Subject` only when present.
 */
export function snsStringToSign(m: SnsMessage): string {
  const keys =
    m.Type === 'Notification'
      ? ['Message', 'MessageId', ...(m.Subject !== undefined ? ['Subject'] : []), 'Timestamp', 'TopicArn', 'Type']
      : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
  return keys.map((k) => `${k}\n${(m as unknown as Record<string, string>)[k] ?? ''}\n`).join('');
}

export function parseSnsMessage(rawBody: string): SnsMessage {
  let m: Partial<SnsMessage>;
  try {
    m = JSON.parse(rawBody);
  } catch {
    throw new AppError('Webhook body is not JSON', 400, 'WEBHOOK_BODY');
  }
  const required = ['Type', 'MessageId', 'TopicArn', 'Message', 'Timestamp', 'SignatureVersion', 'Signature', 'SigningCertURL'] as const;
  if (!m || typeof m !== 'object' || required.some((k) => typeof m[k] !== 'string')) throw new AppError('Not an SNS message', 400, 'WEBHOOK_BODY');
  if (!['Notification', 'SubscriptionConfirmation', 'UnsubscribeConfirmation'].includes(m.Type!)) throw new AppError('Unknown SNS message type', 400, 'WEBHOOK_BODY');
  return m as SnsMessage;
}

/**
 * Verifies SNS signatures: the certificate URL must be an SNS host, the certificate (cached per URL) must verify the
 * signature (SHA1withRSA for SignatureVersion 1, SHA256withRSA for 2), and the topic must be ours.
 */
export class SnsVerifier {
  private readonly keys = new Map<string, Promise<KeyObject>>();

  constructor(
    private readonly topicArn: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private key(url: string) {
    let key = this.keys.get(url);
    if (!key) {
      key = (async () => {
        const res = await this.fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`certificate ${res.status}`);
        // A PEM certificate (or a bare public key, which `createPublicKey` reads the same way).
        return createPublicKey(await res.text());
      })();
      this.keys.set(url, key);
      key.catch(() => this.keys.delete(url));
    }
    return key;
  }

  async verify(rawBody: string): Promise<SnsMessage> {
    const m = parseSnsMessage(rawBody);
    const bad = () => new AppError('Bad webhook signature', 401, 'WEBHOOK_SIGNATURE');
    if (m.TopicArn !== this.topicArn) throw bad();
    if (!isSnsUrl(m.SigningCertURL, { pem: true })) throw bad();
    if (m.SignatureVersion !== '1' && m.SignatureVersion !== '2') throw bad();
    let key: KeyObject;
    try {
      key = await this.key(m.SigningCertURL);
    } catch {
      throw new AppError('Could not fetch the SNS signing certificate', 502, 'WEBHOOK_CERT');
    }
    const ok = createVerify(m.SignatureVersion === '1' ? 'RSA-SHA1' : 'RSA-SHA256')
      .update(snsStringToSign(m), 'utf8')
      .verify(key, m.Signature, 'base64');
    if (!ok) throw bad();
    return m;
  }

  /** Confirms a verified subscription by visiting its SubscribeURL (an SNS host only). */
  async confirm(m: SnsMessage) {
    if (m.Type !== 'SubscriptionConfirmation' || !isSnsUrl(m.SubscribeURL)) return false;
    const res = await this.fetchImpl(m.SubscribeURL!, { signal: AbortSignal.timeout(10_000) });
    return res.ok;
  }
}
