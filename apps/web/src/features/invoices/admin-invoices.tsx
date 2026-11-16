'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { taxDocumentsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

/** `/admin/invoices`: tax invoices and credit notes issued in a period, with the CSV for the VAT return. */
export function AdminInvoices() {
  const { t, f } = useI18n();
  const money = useMoney();
  const c = t.invoices;
  const [range, setRange] = useState({ from: monthStart(), to: today() });
  const q = useQuery({ queryKey: ['admin', 'tax-documents', range.from, range.to], queryFn: () => taxDocumentsApi.forPeriod(range.from, range.to) });
  const totals = (q.data ?? []).reduce(
    (a, d) => {
      const sign = d.kind === 'CREDIT_NOTE' ? -1 : 1;
      return { vat: a.vat + sign * d.vatFils, total: a.total + sign * d.totalFils };
    },
    { vat: 0, total: 0 },
  );
  return (
    <>
      <PageTitle
        title={c.adminTitle}
        aside={
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-from">{t.reports.from}</Label>
              <Input id="inv-from" type="date" dir="ltr" className="h-11 w-44" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-to">{t.reports.to}</Label>
              <Input id="inv-to" type="date" dir="ltr" className="h-11 w-44" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} />
            </div>
            <Button asChild variant="outline">
              <a href={taxDocumentsApi.csvUrl(range.from, range.to)}>
                <Download aria-hidden /> {c.csv}
              </a>
            </Button>
          </div>
        }
      />
      {q.isPending ? (
        <LoadingBlock rows={4} height={48} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={c.adminEmpty} body={c.adminEmptyBody} />
      ) : (
        <Panel>
          <p className="text-sm">
            {c.vatDue}: <b className="tabular-nums">{money.aed(totals.vat)}</b> · {c.total}: <b className="tabular-nums">{money.aed(totals.total)}</b>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.number}</TableHead>
                <TableHead>{c.issued}</TableHead>
                <TableHead>{c.buyer}</TableHead>
                <TableHead className="text-end">{c.vat}</TableHead>
                <TableHead className="text-end">{c.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.map((d) => {
                const sign = d.kind === 'CREDIT_NOTE' ? -1 : 1;
                return (
                  <TableRow key={d.id}>
                    <TableCell><Link href={`/invoices/${d.id}`} dir="ltr" className="font-mono">{d.number}</Link></TableCell>
                    <TableCell>{f.dateLong(d.issuedAt)}</TableCell>
                    <TableCell><bdi>{d.buyer.name}</bdi></TableCell>
                    <TableCell className="text-end tabular-nums">{money.aed(sign * d.vatFils)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money.aed(sign * d.totalFils)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}
    </>
  );
}
