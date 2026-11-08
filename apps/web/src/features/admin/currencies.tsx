'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, ApiError, type AdminCurrency, type CurrencyInput } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useProposalError } from './proposal-review';
import { cn } from '@/lib/utils';

const BASE = 'AED';
const CODE_RE = /^[A-Z]{3}$/;

/** Maps currency errors to translated copy, then falls back to the shared error helper. */
function useCurrencyError() {
  const { t } = useI18n();
  const fallback = useProposalError();
  return (e: unknown): string => {
    if (e instanceof ApiError && e.code === 'BASE_CURRENCY_LOCKED') return t.admin.currencies.errors.baseLocked;
    if (e instanceof ApiError && e.status === 409) return t.admin.currencies.errors.duplicate;
    return fallback(e);
  };
}

/** Admin: display currencies. AED is the locked base; everything else is added, edited, hidden, ordered and removed here. */
export function Currencies() {
  const { t, f, fill, pick } = useI18n();
  const qc = useQueryClient();
  const errorText = useCurrencyError();
  const q = useQuery({ queryKey: qk.adminCurrencies, queryFn: adminApi.currencies });
  const [editing, setEditing] = useState<AdminCurrency | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCurrency | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.adminCurrencies });
    void qc.invalidateQueries({ queryKey: qk.currencies });
  };
  const rows = [...(q.data ?? [])].filter((c) => c.code !== BASE).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  const toggle = useMutation({
    mutationFn: (c: AdminCurrency) => adminApi.updateCurrency(c.code, { enabled: !c.enabled }),
    onSuccess: () => (toast.success(t.admin.currencies.saved), refresh()),
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: (c: AdminCurrency) => adminApi.deleteCurrency(c.code),
    onSuccess: () => (toast.success(t.admin.currencies.deleted), setDeleting(null), refresh()),
    onError: (e) => (setDeleting(null), toast.error(errorText(e))),
  });
  const move = useMutation({
    // Rewrites sortOrder as the row's position, touching only rows whose number changes.
    mutationFn: async ({ from, to }: { from: number; to: number }) => {
      const next = [...rows];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      await Promise.all(next.map((c, i) => (c.sortOrder === i + 1 ? null : adminApi.updateCurrency(c.code, { sortOrder: i + 1 }))));
    },
    onSuccess: refresh,
    onError: (e) => (toast.error(errorText(e)), refresh()),
  });

  return (
    <>
      <PageTitle
        kicker={t.admin.currencies.sub}
        title={t.admin.currencies.title}
        aside={
          <Button variant="ink" onClick={() => setEditing('new')}>
            <Plus aria-hidden /> {t.admin.currencies.add}
          </Button>
        }
      />
      <Panel className="bg-ink text-ivory in-data-[theme=cream]:bg-ink">
        <div className="flex items-center justify-between">
          <span className="label-mono text-stone">{t.admin.currencies.base}</span>
          <Chip tone="ivory">{t.admin.currencies.locked}</Chip>
        </div>
        <b className="font-display text-6xl font-extrabold">{BASE}</b>
        <p className="max-w-2xl text-sm text-stone">{t.admin.currencies.baseNote}</p>
      </Panel>
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={4} height={52} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title={t.admin.currencies.empty} action={{ label: t.admin.currencies.add, onClick: () => setEditing('new') }} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.currencies.colCurrency}</TableHead>
                <TableHead>{t.admin.currencies.colRate}</TableHead>
                <TableHead>{t.admin.currencies.colDecimals}</TableHead>
                <TableHead>{t.admin.currencies.colEnabled}</TableHead>
                <TableHead className="text-end">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c, i) => {
                const name = pick(c.nameEn, c.nameAr).text;
                return (
                  <TableRow key={c.code} className={cn(!c.enabled && 'text-muted-foreground')}>
                    <TableCell>
                      <b className="block font-mono" dir="ltr">
                        {c.code}
                        {c.symbol ? <span className="ms-2 font-sans font-normal text-muted-foreground">{c.symbol}</span> : null}
                      </b>
                      <span className="text-[13px] text-muted-foreground">{name}</span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr" className="tabular-nums">
                        {fill(t.admin.currencies.rate, { r: f.number(c.ratePerAed, { maximumFractionDigits: 6 }), c: c.code })}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{f.number(c.decimals)}</TableCell>
                    <TableCell>
                      <Switch checked={c.enabled} disabled={toggle.isPending} onCheckedChange={() => toggle.mutate(c)} aria-label={`${t.admin.currencies.colEnabled} · ${c.code}`} />
                    </TableCell>
                    <TableCell className="text-end">
                      <span className="inline-flex items-center gap-0.5">
                        <Button variant="ghost" size="icon-sm" aria-label={fill(t.admin.currencies.moveUp, { c: c.code })} disabled={i === 0 || move.isPending} onClick={() => move.mutate({ from: i, to: i - 1 })}>
                          <ArrowUp />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={fill(t.admin.currencies.moveDown, { c: c.code })} disabled={i === rows.length - 1 || move.isPending} onClick={() => move.mutate({ from: i, to: i + 1 })}>
                          <ArrowDown />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`${t.common.actions} · ${c.code}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(c)}>{t.admin.currencies.edit}</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                              {t.admin.currencies.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
      <CurrencyDialog key={editing === 'new' ? 'new' : (editing?.code ?? 'closed')} currency={editing} nextOrder={rows.length + 1} onClose={() => setEditing(null)} onSaved={refresh} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{fill(t.admin.currencies.deleteTitle, { c: deleting?.code ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.currencies.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting);
              }}
            >
              {t.admin.currencies.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CurrencyDialog({ currency, nextOrder, onClose, onSaved }: { currency: AdminCurrency | 'new' | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const errorText = useCurrencyError();
  const existing = currency && currency !== 'new' ? currency : null;
  const [code, setCode] = useState(existing?.code ?? '');
  const [nameEn, setNameEn] = useState(existing?.nameEn ?? '');
  const [nameAr, setNameAr] = useState(existing?.nameAr ?? '');
  const [symbol, setSymbol] = useState(existing?.symbol ?? '');
  const [decimals, setDecimals] = useState(String(existing?.decimals ?? 2));
  const [rate, setRate] = useState(existing ? String(existing.ratePerAed) : '');
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [tried, setTried] = useState(false);
  const c = t.admin.currencies;
  const rateNum = Number(rate);
  const errors = {
    code: !existing && !CODE_RE.test(code) ? c.errors.code : !existing && code === BASE ? c.errors.baseLocked : undefined,
    nameEn: nameEn.trim() ? undefined : c.errors.required,
    nameAr: nameAr.trim() ? undefined : c.errors.required,
    rate: rate !== '' && Number.isFinite(rateNum) && rateNum > 0 ? undefined : c.errors.rate,
  };
  const invalid = Object.values(errors).some(Boolean);
  const save = useMutation({
    mutationFn: () => {
      const body = { nameEn: nameEn.trim(), nameAr: nameAr.trim(), symbol: symbol.trim() || null, decimals: Number(decimals), ratePerAed: rateNum, enabled };
      return existing ? adminApi.updateCurrency(existing.code, body) : adminApi.createCurrency({ ...body, code, sortOrder: nextOrder } satisfies CurrencyInput);
    },
    onSuccess: () => {
      toast.success(existing ? c.saved : c.created);
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <Dialog open={!!currency} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? c.editTitle : c.createTitle}</DialogTitle>
        </DialogHeader>
        <form
          id="currency-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (!invalid) save.mutate();
          }}
        >
          <Field id="cur-code" label={c.code} hint={c.codeHint} error={tried ? errors.code : undefined}>
            <Input id="cur-code" dir="ltr" maxLength={3} disabled={!!existing} aria-invalid={tried && !!errors.code} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </Field>
          <Field id="cur-symbol" label={c.symbol} hint={c.symbolHint}>
            <Input id="cur-symbol" dir="ltr" maxLength={8} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </Field>
          <Field id="cur-en" label={c.nameEn} error={tried ? errors.nameEn : undefined}>
            <Input id="cur-en" aria-invalid={tried && !!errors.nameEn} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </Field>
          <Field id="cur-ar" label={c.nameAr} error={tried ? errors.nameAr : undefined}>
            <Input id="cur-ar" dir="rtl" lang="ar" aria-invalid={tried && !!errors.nameAr} value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </Field>
          <Field id="cur-rate" label={c.ratePerAed} hint={c.rateHint} error={tried ? errors.rate : undefined}>
            <InputGroup dir="ltr">
              <InputGroupAddon>
                <InputGroupText>1 AED =</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput id="cur-rate" type="number" inputMode="decimal" step="any" min={0} aria-invalid={tried && !!errors.rate} value={rate} onChange={(e) => setRate(e.target.value)} />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{code || '···'}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cur-decimals" className="text-[13px] text-muted-foreground">
              {c.decimals}
            </Label>
            <Select value={decimals} onValueChange={setDecimals}>
              <SelectTrigger id="cur-decimals" className="w-full" dir="ltr">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['0', '1', '2', '3'].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[13px] text-muted-foreground">{c.decimalsHint}</span>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
            {c.enabledLabel}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="currency-form" variant="ink" disabled={save.isPending}>
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="text-[13px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
