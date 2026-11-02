import { describe, expect, test } from 'bun:test';
import { MemoryFileStorage } from '../src/infrastructure/storage/local-disk-storage';
import { receiptExtension, MAX_RECEIPT_BYTES } from '../src/modules/payments/receipt-file';
import { ReceiptUploadService } from '../src/modules/payments/receipt-upload.service';
import { StatsService } from '../src/modules/stats/stats.service';

describe('receipt file rules', () => {
  test('accepts PDFs and images', () => {
    expect(receiptExtension({ type: 'application/pdf', size: 10 })).toBe('pdf');
    expect(receiptExtension({ type: 'image/JPEG', size: 10 })).toBe('jpg');
  });
  test('rejects other types, empty and oversized files', () => {
    expect(() => receiptExtension({ type: 'text/html', size: 10 })).toThrow(expect.objectContaining({ code: 'RECEIPT_FILE_INVALID', details: expect.objectContaining({ reason: 'TYPE' }) }));
    expect(() => receiptExtension({ type: 'image/png', size: 0 })).toThrow(expect.objectContaining({ details: expect.objectContaining({ reason: 'EMPTY' }) }));
    expect(() => receiptExtension({ type: 'image/png', size: MAX_RECEIPT_BYTES + 1 })).toThrow(expect.objectContaining({ details: expect.objectContaining({ reason: 'TOO_LARGE' }) }));
  });
});

describe('ReceiptUploadService', () => {
  const file = (type = 'application/pdf') => ({ type, size: 3, bytes: async () => new Uint8Array([1, 2, 3]) });

  test('stores the file and attaches its URL to the order', async () => {
    const storage = new MemoryFileStorage();
    const calls: string[] = [];
    const svc = new ReceiptUploadService(storage, {
      assertReceiptUploadable: async () => ({}) as never,
      uploadReceipt: async (_o, _u, url) => (calls.push(url), { receiptUrl: url }) as never,
    });
    await svc.upload('o1', 'sara', file());
    expect(storage.files.size).toBe(1);
    expect(calls[0]).toMatch(/^http:\/\/files\.test\/receipts\/[0-9a-f]{32}\.pdf$/);
  });

  test('does not store anything when the order refuses a receipt', async () => {
    const storage = new MemoryFileStorage();
    const svc = new ReceiptUploadService(storage, {
      assertReceiptUploadable: async () => {
        throw new Error('ORDER_NOT_AWAITING_RECEIPT');
      },
      uploadReceipt: async () => ({}) as never,
    });
    await expect(svc.upload('o1', 'sara', file())).rejects.toThrow('ORDER_NOT_AWAITING_RECEIPT');
    await expect(svc.upload('o1', 'sara', file('text/plain'))).rejects.toMatchObject({ code: 'RECEIPT_FILE_INVALID' });
    expect(storage.files.size).toBe(0);
  });
});

describe('StatsService.liveNow', () => {
  test('counts LIVE sessions and people in their rooms, cached briefly', async () => {
    let t = 0;
    let listed = 0;
    const svc = new StatsService(
      { liveRoomNames: async () => [{ roomName: 'b07-s05' }] },
      { listRooms: async () => (listed++, [{ name: 'b07-s05', numParticipants: 19, createdAt: null, recording: true }, { name: 'orphan', numParticipants: 4, createdAt: null, recording: false }]) },
      () => t,
    );
    expect(await svc.liveNow()).toEqual({ liveSessions: 1, participants: 19 });
    t = 1000;
    await svc.liveNow();
    expect(listed).toBe(1);
  });
});
