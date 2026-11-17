'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { taxDocumentsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

/**
 * `/invoices/:id`: a UAE tax invoice or credit note, laid out with what the FTA asks for (supplier name, address and TRN,
 * a sequential number, the date, the buyer, the description, taxable amount, VAT rate and amount, total in AED).
 * The browser's print dialog saves it as a PDF.
 */
export function InvoiceView({ id }: { id: string }) {
  const { t, f } = useI18n();
  const money = useMoney();
  const c = t.invoices;
  const q = useQuery({ queryKey: ['tax-documents', id], queryFn: () => taxDocumentsApi.get(id) });
  if (q.isPending) return <LoadingBlock rows={4} height={80} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const credit = d.kind === 'CREDIT_NOTE';
  const taxable = d.totalFils - d.vatFils;
  const rows: Array<[string, number, boolean?]> = [
    [c.amount, credit ? d.subtotalFils : d.subtotalFils],
    ...(d.discountFils ? ([[c.discount, -d.discountFils]] as Array<[string, number]>) : []),
    [c.taxable, taxable],
    [`${c.vat} (${f.number(d.vatPercent)}%)`, d.vatFils],
    [c.total, d.totalFils, true],
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/invoices" className="text-sm">{t.common.back}</Link>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer aria-hidden /> {c.print}
        </Button>
      </div>
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            <h1 className="font-display text-3xl font-extrabold">{credit ? c.creditNoteTitle : c.invoiceTitle}</h1>
            <p className="mt-1 font-mono" dir="ltr">{d.number}</p>
            {credit && d.invoice && (
              <p className="text-sm text-muted-foreground">
                {c.credits} <bdi dir="ltr">{d.invoice.number}</bdi>
              </p>
            )}
          </div>
          <dl className="text-sm">
            <dt className="label-mono text-muted-foreground">{c.issued}</dt>
            <dd className="font-semibold">{f.dateLong(d.issuedAt)}</dd>
          </dl>
        </header>
        <section className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
          <div>
            <h2 className="label-mono text-muted-foreground">{c.supplier}</h2>
            <p className="mt-1 font-semibold">{d.supplier.legalName}</p>
            {d.supplier.address && <p className="text-sm">{d.supplier.address}</p>}
            <p className="text-sm">
              {c.trn}: <bdi dir="ltr" className="font-mono">{d.supplier.trn}</bdi>
            </p>
          </div>
          <div>
            <h2 className="label-mono text-muted-foreground">{c.buyer}</h2>
            <p className="mt-1 font-semibold"><bdi>{d.buyer.name}</bdi></p>
            {d.buyer.address && <p className="text-sm">{d.buyer.address}</p>}
            <p className="text-sm" dir="ltr">{d.buyer.email}</p>
            {d.buyer.trn && (
              <p className="text-sm">
                {c.trn}: <bdi dir="ltr" className="font-mono">{d.buyer.trn}</bdi>
              </p>
            )}
          </div>
        </section>
        <section className="py-6">
          <h2 className="label-mono text-muted-foreground">{c.description}</h2>
          <p className="mt-1">{d.description}</p>
          <dl className="mt-6 grid gap-2 text-sm">
            {rows.map(([label, fils, strong]) => (
              <div key={label} className={strong ? 'flex justify-between border-t border-border pt-2 text-base font-bold' : 'flex justify-between'}>
                <dt>{label}</dt>
                <dd className="tabular-nums">{money.aed(credit ? -fils : fils)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">{c.footer}</footer>
      </article>
    </div>
  );
}
