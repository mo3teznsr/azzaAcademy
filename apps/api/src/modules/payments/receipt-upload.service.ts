import type { FileStorage } from '../../core/ports';
import type { CheckoutService } from './checkout.service';
import { receiptExtension } from './receipt-file';

/** Receipt FILE upload: validate → check the order accepts a receipt → store → attach the URL (same path as `receiptUrl`). */
export class ReceiptUploadService {
  constructor(
    private readonly storage: FileStorage,
    private readonly checkout: Pick<CheckoutService, 'assertReceiptUploadable' | 'uploadReceipt'>,
  ) {}

  async upload(orderId: string, userId: string, file: { type: string; size: number; bytes: () => Promise<Uint8Array> }) {
    const extension = receiptExtension(file);
    await this.checkout.assertReceiptUploadable(orderId, userId);
    const stored = await this.storage.save({ folder: 'receipts', extension, contentType: file.type, bytes: await file.bytes() });
    return this.checkout.uploadReceipt(orderId, userId, stored.url);
  }
}
