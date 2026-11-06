'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BATCH_STATUSES, type BatchStatus } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BatchStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { batchesApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { describeRule } from '@/lib/schedule';
import { useMoney } from '@/lib/money';
import { Pager, ReviewTabs } from './courses';

export function AdminBatches() {
  const { t, f } = useI18n();
  const money = useMoney();
  const [status, setStatus] = useState<BatchStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const params = { status: status === 'all' ? undefined : status, page, pageSize: 25 };
  const q = useQuery({ queryKey: qk.batches(params), queryFn: () => batchesApi.list(params) });
  const waitingParams = { status: 'PENDING_REVIEW' as const, pageSize: 1 };
  const waiting = useQuery({ queryKey: qk.batches(waitingParams), queryFn: () => batchesApi.list(waitingParams) });
  return (
    <>
      <PageTitle
        title={t.admin.batches.title}
        aside={
          <Button asChild variant="ink">
            <Link href="/admin/batches/new">{t.admin.batches.newBatch}</Link>
          </Button>
        }
      />
      <ReviewTabs
        waiting={status === 'PENDING_REVIEW'}
        count={waiting.data?.total ?? 0}
        onChange={(w) => (setStatus(w ? 'PENDING_REVIEW' : 'all'), setPage(1))}
      />
      <Select value={status} onValueChange={(v) => (setStatus(v as BatchStatus | 'all'), setPage(1))}>
        <SelectTrigger className="w-56 rounded-full" aria-label={t.common.status}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t.common.status}: {t.common.all}
          </SelectItem>
          {BATCH_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t.status.batch[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={6} height={52} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.items.length === 0 ? (
          <EmptyState title={t.admin.batches.empty} action={{ label: t.admin.batches.newBatch, href: '/admin/batches/new' }} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.batches.colBatch}</TableHead>
                  <TableHead>{t.admin.batches.colTeacher}</TableHead>
                  <TableHead>{t.admin.batches.colSchedule}</TableHead>
                  <TableHead>{t.admin.batches.colDates}</TableHead>
                  <TableHead>{t.admin.batches.colSeats}</TableHead>
                  <TableHead>{t.batchOps.colPrice}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/admin/batches/${b.id}`} className="no-underline">
                        <b>{b.course.titleEn}</b> · <b dir="ltr">{b.code}</b>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <bdi>{b.teacher.name}</bdi>
                    </TableCell>
                    <TableCell>{describeRule(b, f)}</TableCell>
                    <TableCell>
                      {f.dayMonth(b.startsOn)} → {f.dayMonth(b.endsOn)}
                    </TableCell>
                    <TableCell>
                      {f.number(b._count?.enrollments ?? 0)} / {f.number(b.capacity)}
                    </TableCell>
                    <TableCell className="tabular-nums">{money.aed(b.priceFils)}</TableCell>
                    <TableCell>
                      <BatchStatusChip status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager page={q.data.page} pageCount={q.data.pageCount} onPage={setPage} />
          </>
        )}
      </Panel>
    </>
  );
}
