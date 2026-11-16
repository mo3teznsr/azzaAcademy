'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { taxDocumentsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

/** `/invoices`: the reader's tax invoices and credit notes, newest first. */
export function InvoicesPage() {
  const { t, f } = useI18n();
  const money = useMoney();
  const c = t.invoices;
  const q = useQuery({ queryKey: ['tax-documents', 'mine'], queryFn: taxDocumentsApi.mine });
  return (
    <>
      <PageTitle title={c.title} />
      {q.isPending ? (
        <LoadingBlock rows={3} height={64} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={c.emptyTitle} body={c.emptyBody} />
      ) : (
        <Panel>
          <ul className="flex flex-col divide-y divide-border">
            {q.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/invoices/${d.id}`} className="font-semibold">
                    {d.kind === 'INVOICE' ? c.invoice : c.creditNote} <bdi dir="ltr">{d.number}</bdi>
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">{d.description}</p>
                </div>
                <div className="text-end text-sm">
                  <b className="tabular-nums">{money.aed(d.kind === 'CREDIT_NOTE' ? -d.totalFils : d.totalFils)}</b>
                  <p className="text-muted-foreground">{f.dateLong(d.issuedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
