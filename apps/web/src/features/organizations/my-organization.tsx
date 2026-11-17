'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageTitle, Panel } from '@/components/brand/section';
import { Chip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { organizationApi, type Organization } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { OrgReportView } from './org-report-view';
import { PACK_TONE, SeatPackPanel } from './seat-pack-panel';

/** `/organization`: for an organization's managers. Their seat packs, who is on each seat, the learner report and invoices. */
export function MyOrganization() {
  const { t } = useI18n();
  const c = t.organizations;
  const mine = useQuery({ queryKey: ['org', 'mine'], queryFn: organizationApi.mine });
  const [picked, setPicked] = useState<string | null>(null);
  if (mine.isPending) return <LoadingBlock rows={3} />;
  if (mine.isError) return <ErrorState error={mine.error} onRetry={() => void mine.refetch()} />;
  if (mine.data.length === 0) return <EmptyState title={c.mineEmpty} body={c.mineEmptyBody} />;
  const org = mine.data.find((o) => o.id === picked) ?? mine.data[0]!;
  return (
    <>
      <PageTitle
        kicker={c.mineTitle}
        title={<bdi>{org.name}</bdi>}
        aside={
          mine.data.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {mine.data.map((o) => (
                <Button key={o.id} size="sm" variant={o.id === org.id ? 'ink' : 'outline'} onClick={() => setPicked(o.id)}>
                  <bdi>{o.name}</bdi>
                </Button>
              ))}
            </div>
          )
        }
      />
      <OrganizationBody key={org.id} org={org} />
    </>
  );
}

function OrganizationBody({ org }: { org: Organization }) {
  const { t, f } = useI18n();
  const c = t.organizations;
  const money = useMoney();
  const detail = useQuery({ queryKey: ['org', org.id, 'detail'], queryFn: () => organizationApi.get(org.id) });
  const invoices = useQuery({ queryKey: ['org', org.id, 'invoices'], queryFn: () => organizationApi.taxDocuments(org.id) });
  const [packId, setPackId] = useState<string | null>(null);
  if (detail.isPending) return <LoadingBlock rows={3} />;
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;
  const packs = detail.data.packs;
  const current = packs.find((p) => p.id === packId) ?? packs.find((p) => p.status !== 'CANCELLED') ?? packs[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{c.packs}</h2>
        {packs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.noSeats}</p>
        ) : (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={c.packs}>
            {packs.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === current?.id}
                onClick={() => setPackId(p.id)}
                className="flex flex-col items-start gap-1 rounded-xl border border-border px-4 py-3 text-start transition-colors hover:border-green-deep aria-selected:border-ink aria-selected:bg-accent"
              >
                <span className="font-medium"><bdi>{p.title}</bdi></span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">{p.used}/{p.seats}</span>
                  <Chip tone={PACK_TONE[p.status]}>{c.status[p.status]}</Chip>
                </span>
              </button>
            ))}
          </div>
        )}
        {current && (
          <SeatPackPanel
            key={current.id}
            source={{
              key: ['org', org.id, 'pack', current.id],
              load: () => organizationApi.pack(org.id, current.id),
              assign: (input) => organizationApi.assign(org.id, current.id, input),
              revoke: (id) => organizationApi.revoke(org.id, id),
            }}
          />
        )}
      </section>

      <OrgReportView queryKey={['org', org.id, 'report']} load={() => organizationApi.report(org.id)} csvUrl={organizationApi.reportCsvUrl(org.id)} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{c.invoices}</h2>
        {invoices.isPending ? (
          <LoadingBlock rows={2} height={40} />
        ) : invoices.isError || invoices.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.noInvoices}</p>
        ) : (
          <Panel>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.invoices.number}</TableHead>
                  <TableHead>{t.invoices.issued}</TableHead>
                  <TableHead className="text-end">{t.invoices.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link href={`/invoices/${d.id}`} dir="ltr" className="font-mono">
                        {d.number}
                      </Link>
                    </TableCell>
                    <TableCell>{f.dateLong(d.issuedAt)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money.aed(d.kind === 'CREDIT_NOTE' ? -d.totalFils : d.totalFils)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </section>
    </div>
  );
}
