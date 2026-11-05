import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  type JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library';
import { X509Certificate } from 'node:crypto';
import type { AppleEnvironment } from '../../core/config';
import { AppError } from '../../core/errors';
import type { AppleNotification, AppleSignedDataVerifier, AppleTransaction } from '../../core/ports';
import { APPLE_ROOT_CA_G3_PEM } from './apple-root-certificates';

const invalid = (message: string) => new AppError(message, 400, 'APPLE_VERIFICATION_FAILED');

/** Reads a JWS payload WITHOUT verifying it — only to pick which environment's verifier to run. */
function peekPayload(jws: string): Record<string, unknown> {
  const part = jws.split('.')[1];
  if (!part) throw invalid('Malformed signed data');
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    throw invalid('Malformed signed data');
  }
}

/**
 * Apple's official `@apple/app-store-server-library`: x5c chain up to Apple Root CA G3 (plus Apple's
 * intermediate/leaf OIDs), ES256 signature, bundle id, environment and — for Production — the app's Apple ID.
 * One verifier per accepted environment, so Production can also accept Sandbox (App Review, TestFlight).
 */
export class AppStoreSignedDataVerifier implements AppleSignedDataVerifier {
  private readonly verifiers = new Map<AppleEnvironment, SignedDataVerifier>();

  constructor(opts: { bundleId: string; environments: AppleEnvironment[]; appAppleId?: number; onlineChecks: boolean }) {
    const roots = [new X509Certificate(APPLE_ROOT_CA_G3_PEM).raw];
    for (const env of opts.environments) {
      const environment = env === 'Production' ? Environment.PRODUCTION : Environment.SANDBOX;
      this.verifiers.set(env, new SignedDataVerifier(roots, opts.onlineChecks, environment, opts.bundleId, opts.appAppleId));
    }
  }

  private verifierFor(environment: unknown) {
    const v = this.verifiers.get(environment as AppleEnvironment);
    if (!v) throw new AppError(`App Store environment ${String(environment)} is not accepted here`, 400, 'APPLE_ENVIRONMENT_NOT_ACCEPTED');
    return { verifier: v, environment: environment as AppleEnvironment };
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof VerificationException) throw invalid(`App Store signature rejected (status ${e.status})`);
      throw e;
    }
  }

  async verifyTransaction(signedTransaction: string): Promise<AppleTransaction> {
    const { verifier, environment } = this.verifierFor(peekPayload(signedTransaction).environment);
    const tx = await this.run(() => verifier.verifyAndDecodeTransaction(signedTransaction));
    return toTransaction(tx, environment);
  }

  async verifyNotification(signedPayload: string): Promise<AppleNotification> {
    const data = peekPayload(signedPayload).data as { environment?: unknown } | undefined;
    const { verifier, environment } = this.verifierFor(data?.environment);
    const n = await this.run(() => verifier.verifyAndDecodeNotification(signedPayload));
    const signedTx = n.data?.signedTransactionInfo;
    const tx = signedTx ? await this.run(() => verifier.verifyAndDecodeTransaction(signedTx)) : null;
    return {
      notificationUUID: n.notificationUUID ?? '',
      notificationType: String(n.notificationType ?? ''),
      subtype: n.subtype ? String(n.subtype) : null,
      environment,
      transaction: tx ? toTransaction(tx, environment) : null,
    };
  }
}

function toTransaction(tx: JWSTransactionDecodedPayload, environment: AppleEnvironment): AppleTransaction {
  if (!tx.transactionId || !tx.productId) throw invalid('Transaction is missing its id or product');
  return {
    transactionId: tx.transactionId,
    originalTransactionId: tx.originalTransactionId ?? tx.transactionId,
    productId: tx.productId,
    environment,
    appAccountToken: tx.appAccountToken ?? null,
    purchaseDate: tx.purchaseDate ? new Date(tx.purchaseDate) : null,
    priceMilliunits: typeof tx.price === 'number' ? tx.price : null,
    currency: tx.currency ?? null,
    revocationDate: tx.revocationDate ? new Date(tx.revocationDate) : null,
  };
}
