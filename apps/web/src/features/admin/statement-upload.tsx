'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StatementMapping } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, type StatementPreview } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

const NONE = '__none__';

/** Upload a bank statement CSV, map its columns once per bank, and list past imports. */
export function BankStatements() {
  const { t, f, fill } = useI18n();
  const s = t.admin.statements;
  const router = useRouter();
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: qk.admin.bankAccounts, queryFn: adminApi.bankAccounts });
  const imports = useQuery({ queryKey: qk.admin.statements, queryFn: () => adminApi.statementImports() });

  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [mapping, setMapping] = useState<StatementMapping | null>(null);

  const read = useMutation({
    mutationFn: async (picked: File) => {
      const csv = await picked.text();
      setFile({ name: picked.name, csv });
      return adminApi.previewStatement({ bankAccountId: accountId, csv });
    },
    onSuccess: (p) => {
      setPreview(p);
      setMapping(p.mapping ?? { date: p.headers[0] ?? '', credit: null, amount: null, description: [], dateFormat: 'DMY' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importNow = useMutation({
    mutationFn: () => adminApi.importStatement({ bankAccountId: accountId, fileName: file!.name, csv: file!.csv, mapping: mapping! }),
    onSuccess: (imp) => {
      toast.success(fill(s.imported, { n: imp.newCount, d: imp.duplicateCount }));
      void qc.invalidateQueries({ queryKey: qk.admin.statements });
      router.push(`/admin/transfers/statements/${imp.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = !!file && !!mapping && !!mapping.date && !!(mapping.credit || mapping.amount) && mapping.description.length > 0;
  const columnSelect = (label: string, value: string | null | undefined, onChange: (v: string | null) => void, optional = false) => (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>{s.none}</SelectItem>}
          {preview?.headers.filter(Boolean).map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <PageTitle
        kicker={t.nav.admin.finance}
        title={s.title}
        aside={
          <Button variant="outline" asChild>
            <Link href="/admin/transfers">{s.back}</Link>
          </Button>
        }
      />
      <p className="max-w-3xl text-sm text-muted-foreground">{s.intro}</p>

      <Panel className="grid gap-5 p-5">
        <SectionHeader title={s.upload} size="sm" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>{s.account}</Label>
            <Select value={accountId} onValueChange={(v) => (setAccountId(v), setPreview(null), setFile(null))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={s.account} />
              </SelectTrigger>
              <SelectContent>
                {(accounts.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.bankName} · {a.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="statement-file">{s.file}</Label>
            <Input
              id="statement-file"
              type="file"
              accept=".csv,text/csv"
              disabled={!accountId || read.isPending}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) read.mutate(picked);
              }}
            />
          </div>
        </div>

        {preview && mapping && (
          <div className="grid gap-4">
            <div>
              <h3 className="font-semibold">{s.mapTitle}</h3>
              <p className="text-sm text-muted-foreground">{s.mapIntro}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {columnSelect(s.colDate, mapping.date, (v) => setMapping({ ...mapping, date: v ?? '' }))}
              {columnSelect(s.colCredit, mapping.credit, (v) => setMapping({ ...mapping, credit: v }), true)}
              {columnSelect(s.colAmount, mapping.amount, (v) => setMapping({ ...mapping, amount: v }), true)}
              <div className="grid gap-1.5">
                <Label>{s.dateFormat}</Label>
                <Select value={mapping.dateFormat} onValueChange={(v) => setMapping({ ...mapping, dateFormat: v as StatementMapping['dateFormat'] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['DMY', 'MDY', 'YMD'] as const).map((k) => (
                      <SelectItem key={k} value={k}>
                        {s.formats[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">{s.colDescription}</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {preview.headers.filter(Boolean).map((h) => (
                  <label key={h} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={mapping.description.includes(h)}
                      onCheckedChange={(on) =>
                        setMapping({ ...mapping, description: on ? [...mapping.description, h] : mapping.description.filter((x) => x !== h) })
                      }
                    />
                    {h}
                  </label>
                ))}
              </div>
            </fieldset>
            {preview.sample.length > 0 && (
              <div className="overflow-x-auto">
                <p className="mb-1 text-xs text-muted-foreground">{s.sample}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.headers.map((h, i) => (
                        <TableHead key={i}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sample.map((row, r) => (
                      <TableRow key={r}>
                        {row.map((cell, c) => (
                          <TableCell key={c} className="max-w-64 truncate text-xs">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div>
              <Button disabled={!ready || importNow.isPending} onClick={() => importNow.mutate()}>
                {s.importNow}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <Panel className="p-2">
        <div className="px-3 pt-3">
          <SectionHeader title={s.history} size="sm" />
        </div>
        {imports.isPending ? (
          <LoadingBlock rows={3} height={44} />
        ) : imports.isError ? (
          <ErrorState error={imports.error} onRetry={() => void imports.refetch()} />
        ) : imports.data.length === 0 ? (
          <EmptyState title={s.noImports} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{s.colFile}</TableHead>
                <TableHead>{s.account}</TableHead>
                <TableHead>{s.colWhen}</TableHead>
                <TableHead>{s.colLines}</TableHead>
                <TableHead>{s.colOpen}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.data.map((imp) => (
                <TableRow key={imp.id} className="cursor-pointer" onClick={() => router.push(`/admin/transfers/statements/${imp.id}`)}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/transfers/statements/${imp.id}`}>{imp.fileName}</Link>
                  </TableCell>
                  <TableCell>{imp.bankName}</TableCell>
                  <TableCell>{f.dateTime(imp.createdAt)}</TableCell>
                  <TableCell>{imp.newCount}</TableCell>
                  <TableCell>{imp.openCount > 0 ? <Chip tone="sun">{imp.openCount}</Chip> : <Chip tone="sage">0</Chip>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
