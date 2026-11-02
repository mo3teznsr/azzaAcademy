'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { uploadReceiptInput } from '@azza/shared';
import type { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkoutApi, type BankAccount, type Order } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

function CopyValue({ value, label }: { value: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3">
      <div className="min-w-0">
        <span className="label-mono block text-stone">{label}</span>
        <b className="font-mono text-lg" dir="ltr">
          {value}
        </b>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Copy /> {copied ? t.common.copied : t.common.copy}
      </Button>
    </div>
  );
}

/** Bank-transfer instructions + receipt upload (pay-02 · bank transfer state). */
export function BankTransferDetails({
  order,
  bankAccount,
  reference,
  expiresAt,
  onUploaded,
}: {
  order: Pick<Order, 'id' | 'totalFils'>;
  bankAccount: (Pick<BankAccount, 'bankName' | 'iban'> & Partial<BankAccount>) | null | undefined;
  reference: string;
  expiresAt: string | null;
  onUploaded: (o: Order) => void;
}) {
  const { t, f } = useI18n();
  const money = useMoney();
  const [file, setFile] = useState<File | null>(null);
  const [useLink, setUseLink] = useState(false);
  const form = useForm<z.input<typeof uploadReceiptInput>>({ resolver: zodResolver(uploadReceiptInput), defaultValues: { receiptUrl: '' } });
  const upload = useMutation({
    mutationFn: (v: { file: File } | { url: string }) =>
      'file' in v ? checkoutApi.uploadReceiptFile(order.id, v.file) : checkoutApi.uploadReceipt(order.id, v.url),
    onSuccess: onUploaded,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-2xl font-extrabold">{t.checkout.bankTitle}</h3>
      {bankAccount && (
        <div className="rounded-2xl border border-line p-4">
          <b className="block text-lg">{bankAccount.bankName}</b>
          <span className="text-sm text-muted-foreground">
            {bankAccount.accountName}
            {bankAccount.branch ? ` · ${bankAccount.branch}` : ''}
          </span>
          <div className="mt-2 font-mono text-sm" dir="ltr">
            IBAN {bankAccount.iban}
            {bankAccount.swift ? ` · SWIFT ${bankAccount.swift}` : ''} · AED
          </div>
          {bankAccount.instructions && <p className="mt-2 text-sm text-muted-foreground">{bankAccount.instructions}</p>}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <CopyValue label={t.checkout.exactAmount} value={money.aed(order.totalFils)} />
        <CopyValue label={t.checkout.reference} value={reference} />
      </div>
      {expiresAt && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t.checkout.heldUntil}: </span>
          <b>{f.dateTime(expiresAt)}</b>
        </p>
      )}
      <form
        className="flex flex-col gap-3 rounded-2xl border border-dashed border-line-2 p-4"
        onSubmit={(e) => {
          if (!useLink) {
            e.preventDefault();
            if (file) upload.mutate({ file });
            else toast.error(t.checkout.receiptMissing);
            return;
          }
          void form.handleSubmit((v) => upload.mutate({ url: v.receiptUrl }))(e);
        }}
        noValidate
      >
        <Label htmlFor="receipt" className="font-semibold">
          {t.checkout.uploadReceipt}
        </Label>
        {useLink ? (
          <Input id="receipt" type="url" dir="ltr" placeholder="https://" {...form.register('receiptUrl')} aria-invalid={!!form.formState.errors.receiptUrl} />
        ) : (
          <Input id="receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/heic" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        )}
        <span className="text-[13px] text-muted-foreground">
          {useLink ? t.checkout.receiptHint : t.checkout.receiptFileHint}{' '}
          <button type="button" className="link-sun" onClick={() => setUseLink((v) => !v)}>
            {useLink ? t.checkout.receiptUseFile : t.checkout.receiptUseLink}
          </button>
        </span>
        <Button type="submit" disabled={upload.isPending}>
          {upload.isPending ? t.common.saving : t.checkout.madeTransfer}
        </Button>
      </form>
      <p className="text-[13px] text-muted-foreground">{t.checkout.bankWarning}</p>
    </div>
  );
}
