'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StatementMatchKind } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip, type ChipTone } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, type StatementLine, type StatementTransfer } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

const TONE: Record<StatementMatchKind, ChipTone> = { EXACT: 'sage', AMOUNT_DIFFERS: 'peach', SUGGESTED: 'sky', UNMATCHED: 'outline', DUPLICATE: 'dashed' };

/** One imported statement: each credit with its proposed transfer; confirm exact matches in one click, decide the rest. */
export function StatementReview({ importId }: { importId: string }) {
  const { t, f, fill } = useI18n();
  const s = t.admin.statements;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.admin.statement(importId), queryFn: () => adminApi.statementImport(importId) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.admin.statements });
    void qc.invalidateQueries({ queryKey: ['admin', 'transfers'] });
  };
  const bulk = useMutation({
    mutationFn: () => adminApi.confirmExactLines(importId),
    onSuccess: (r) => {
      (r.failed ? toast.warning : toast.success)(fill(s.bulkDone, { n: r.confirmed, f: r.failed }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exact = (q.data?.lines ?? []).filter((l) => l.status === 'OPEN' && l.match === 'EXACT').length;

  return (
    <>
      <PageTitle
        kicker={s.title}
        title={q.data ? `${q.data.bankName} · ${q.data.fileName}` : s.title}
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/transfers/statements">{s.history}</Link>
            </Button>
            <Button disabled={!exact || bulk.isPending} onClick={() => bulk.mutate()}>
              {fill(s.confirmExact, { n: exact })}
            </Button>
          </div>
        }
      />
      {q.data && <p className="text-sm text-muted-foreground">{f.dateTime(q.data.createdAt)} · {fill(s.imported, { n: q.data.newCount, d: q.data.duplicateCount })}</p>}
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={5} height={52} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.lines.length === 0 ? (
          <EmptyState title={s.noLines} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{s.colPosted}</TableHead>
                <TableHead>{s.colLineAmount}</TableHead>
                <TableHead>{s.colLineText}</TableHead>
                <TableHead>{s.colMatch}</TableHead>
                <TableHead>{s.colAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.lines.map((l) => (
                <LineRow key={l.id} line={l} importId={importId} onDone={refresh} />
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

function TransferLabel({ transfer }: { transfer: StatementTransfer }) {
  const { t } = useI18n();
  const money = useMoney();
  return (
    <span className="grid gap-0.5">
      <span className="font-mono text-xs" dir="ltr">
        {transfer.reference}
      </span>
      <span className="text-xs text-muted-foreground">
        {transfer.kind === 'SEAT' ? t.admin.statements.seat : t.admin.statements.plan} · {transfer.userName} · {money.aed(transfer.totalFils)}
      </span>
    </span>
  );
}

function LineRow({ line, importId, onDone }: { line: StatementLine; importId: string; onDone: () => void }) {
  const { t, f, fill } = useI18n();
  const s = t.admin.statements;
  const money = useMoney();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<string>('');
  const after = () => {
    void qc.invalidateQueries({ queryKey: qk.admin.statement(importId) });
    onDone();
  };
  const confirm = useMutation({
    mutationFn: (target?: { kind: 'SEAT' | 'PLAN'; id: string }) => adminApi.confirmStatementLine(line.id, target),
    onSuccess: (r) => {
      if (r.outcome === 'AMOUNT_MISMATCH') toast.warning(s.outcomeMismatch);
      after();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const ignore = useMutation({ mutationFn: () => adminApi.ignoreStatementLine(line.id), onSuccess: after, onError: (e: Error) => toast.error(e.message) });
  const busy = confirm.isPending || ignore.isPending;
  const choice = line.suggestions.find((x) => `${x.kind}:${x.id}` === picked);

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{f.date(line.postedOn, 'UTC')}</TableCell>
      <TableCell className="whitespace-nowrap font-semibold">{money.aed(line.amountFils)}</TableCell>
      <TableCell className="max-w-80 text-xs" dir="auto">
        {line.description}
      </TableCell>
      <TableCell>
        <div className="grid gap-1.5">
          {line.status === 'OPEN' && line.match && <Chip tone={TONE[line.match]}>{s.kinds[line.match]}</Chip>}
          {line.transfer && <TransferLabel transfer={line.transfer} />}
          {line.status === 'OPEN' && line.match === 'AMOUNT_DIFFERS' && line.transfer && (
            <span className="text-xs text-destructive">{fill(s.expected, { amount: money.aed(line.transfer.totalFils) })}</span>
          )}
          {line.status === 'OPEN' && line.suggestions.length > 0 && (
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger className="h-8 w-56">
                <SelectValue placeholder={s.pick} />
              </SelectTrigger>
              <SelectContent>
                {line.suggestions.map((x) => (
                  <SelectItem key={`${x.kind}:${x.id}`} value={`${x.kind}:${x.id}`}>
                    {x.reference} · {x.userName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </TableCell>
      <TableCell>
        {line.status === 'CONFIRMED' ? (
          <div className="grid gap-1">
            <Chip tone={line.outcome === 'AMOUNT_MISMATCH' ? 'peach' : 'sage'}>{s.done}</Chip>
            {line.outcome === 'AMOUNT_MISMATCH' && <span className="text-xs text-muted-foreground">{s.outcomeMismatch}</span>}
          </div>
        ) : line.status === 'IGNORED' ? (
          <Chip tone="strike">{s.ignored}</Chip>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {choice ? (
              <Button size="sm" disabled={busy} onClick={() => confirm.mutate({ kind: choice.kind, id: choice.id })}>
                {fill(s.confirmPick, { ref: choice.reference })}
              </Button>
            ) : (
              (line.match === 'EXACT' || line.match === 'AMOUNT_DIFFERS') && (
                <Button size="sm" disabled={busy} onClick={() => confirm.mutate(undefined)}>
                  {s.confirm}
                </Button>
              )
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => ignore.mutate()}>
              {s.ignore}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
