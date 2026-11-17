'use client';

import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Panel, StatTile } from '@/components/brand/section';
import { Chip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import type { OrgReport } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';

const pct = (r: number) => `${Math.round(r * 100)}%`;

/** Per-learner attendance, completion and certificates for one organization, with its CSV. */
export function OrgReportView({ queryKey, load, csvUrl }: { queryKey: readonly unknown[]; load: () => Promise<OrgReport>; csvUrl: string }) {
  const { t } = useI18n();
  const c = t.organizations;
  const q = useQuery({ queryKey, queryFn: load });
  if (q.isPending) return <LoadingBlock rows={3} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const { summary, rows } = q.data;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{c.reportTitle}</h2>
        <Button asChild variant="outline" size="sm">
          <a href={csvUrl}>
            <Download aria-hidden /> {c.csv}
          </a>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label={c.learners} value={summary.learners} />
        <StatTile label={c.attendance} value={pct(summary.attendanceRate)} />
        <StatTile label={c.completion} value={pct(summary.completionRate)} />
        <StatTile label={c.certificates} value={summary.certificates} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={c.noRows} />
      ) : (
        <Panel className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.learner}</TableHead>
                <TableHead>{c.course}</TableHead>
                <TableHead className="text-end">{c.progress}</TableHead>
                <TableHead className="text-end">{c.attendance}</TableHead>
                <TableHead>{c.completion}</TableHead>
                <TableHead>{c.certificates}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.learnerId}-${r.packReference}`}>
                  <TableCell>
                    <bdi className="font-medium">{r.name}</bdi>
                    <div className="text-xs text-muted-foreground" dir="ltr">{r.email}</div>
                  </TableCell>
                  <TableCell>
                    <bdi>{r.title}</bdi>
                    {r.code && <span dir="ltr" className="ms-2 font-mono text-xs text-muted-foreground">{r.code}</span>}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {r.done}/{r.total}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{r.attendanceRate === null ? '—' : pct(r.attendanceRate)}</TableCell>
                  <TableCell>
                    <Chip tone={r.completed ? 'sage' : 'outline'}>{r.completed ? c.completed : c.inProgress}</Chip>
                  </TableCell>
                  <TableCell>
                    {r.certificateCode ? (
                      <a href={`/verify/${encodeURIComponent(r.certificateCode)}`} dir="ltr" className="font-mono text-xs underline">
                        {r.certificateCode}
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}
