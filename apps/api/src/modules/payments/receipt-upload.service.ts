import { BusinessRuleError } from '../../core/errors';
import type { FileStorage } from '../../core/ports';
import type { SubscriptionService } from '../subscriptions/subscription.service';
import type { CheckoutService } from './checkout.service';
import { receiptExtension } from './receipt-file';

/** Receipt FILE upload: validate → check the order accepts a receipt → store → attach the URL (same path as `receiptUrl`). */
export class ReceiptUploadService {
  constructor(
    private readonly storage: FileStorage,
    private readonly checkout: Pick<CheckoutService, 'assertReceiptUploadable' | 'uploadReceipt'>,
    private readonly subscriptions?: Pick<SubscriptionService, 'assertTransferReceiptUploadable' | 'uploadTransferReceipt'>,
  ) {}

  async upload(orderId: string, userId: string, file: { type: string; size: number; bytes: () => Promise<Uint8Array> }) {
    const extension = receiptExtension(file);
    await this.checkout.assertReceiptUploadable(orderId, userId);
    const stored = await this.storage.save({ folder: 'receipts', extension, contentType: file.type, bytes: await file.bytes() });
    return this.checkout.uploadReceipt(orderId, userId, stored.url);
  }

  /** Same file rules for the receipt of a plan paid by transfer. */
  async uploadForSubscriptionPayment(paymentId: string, userId: string, file: { type: string; size: number; bytes: () => Promise<Uint8Array> }) {
    if (!this.subscriptions) throw new BusinessRuleError('Plans are not paid by transfer here', 'METHOD_UNAVAILABLE');
    const extension = receiptExtension(file);
    await this.subscriptions.assertTransferReceiptUploadable(paymentId, userId);
    const stored = await this.storage.save({ folder: 'receipts', extension, contentType: file.type, bytes: await file.bytes() });
    return this.subscriptions.uploadTransferReceipt(paymentId, userId, stored.url);
  }
}
