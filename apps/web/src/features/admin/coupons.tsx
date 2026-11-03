'use client';

import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aedToFils, couponInput, percentOf, type CouponInput, type UpdateCouponInput } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Chip, type ChipTone } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, batchesApi, coursesApi } from '@/lib/api';
import type { Coupon, CouponStatus } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

const STATUS_TONE: Record<CouponStatus, ChipTone> = {
  ACTIVE: 'sage',
  SCHEDULED: 'sky',
  PAUSED: 'dashed',
  EXHAUSTED: 'peach',
  EXPIRED: 'strike',
};

/** Coupon days are stored at 00:00 UTC — format them in UTC so they never shift a day. */
const UTC = 'UTC';
const toDay = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
const TOGGLE_ITEM = 'h-10 rounded-full border border-line px-4 text-sm data-[state=on]:border-ivory data-[state=on]:bg-ivory data-[state=on]:text-ink';

export function Coupons() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.admin.coupons, queryFn: adminApi.coupons });
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const [usageOf, setUsageOf] = useState<Coupon | null>(null);

  return (
    <>
      <PageTitle
        kicker={t.admin.coupons.kicker}
        title={t.admin.coupons.title}
        aside={
          <Button variant="ink" onClick={() => setEditing('new')}>
            {t.admin.coupons.new}
          </Button>
        }
      />
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={4} height={56} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.length === 0 ? (
          <EmptyState title={t.admin.coupons.empty} />
        ) : (
          <CouponTable coupons={q.data} onEdit={setEditing} onUsage={setUsageOf} />
        )}
      </Panel>
      {editing && <CouponDialog key={editing === 'new' ? 'new' : editing.id} coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <UsageSheet coupon={usageOf} onClose={() => setUsageOf(null)} />
    </>
  );
}

function CouponTable({ coupons, onEdit, onUsage }: { coupons: Coupon[]; onEdit: (c: Coupon) => void; onUsage: (c: Coupon) => void }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (c: Coupon) => adminApi.updateCoupon(c.id, { active: !c.active }),
    onSuccess: (c) => {
      toast.success(c.active ? t.admin.coupons.resumed : t.admin.coupons.paused);
      void qc.invalidateQueries({ queryKey: qk.admin.coupons });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.admin.coupons.code}</TableHead>
          <TableHead>{t.admin.coupons.discount}</TableHead>
          <TableHead>{t.admin.coupons.scope}</TableHead>
          <TableHead className="min-w-36">{t.admin.coupons.used}</TableHead>
          <TableHead>{t.admin.coupons.expiry}</TableHead>
          <TableHead>{t.common.status}</TableHead>
          <TableHead className="text-end">{t.admin.coupons.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coupons.map((c) => {
          const rules = [
            c.minOrderFils ? fill(t.admin.coupons.minShort, { amount: money.aed(c.minOrderFils) }) : null,
            c.perUserLimit ? fill(t.admin.coupons.perUserShort, { n: f.number(c.perUserLimit) }) : null,
          ].filter(Boolean);
          const finished = c.status === 'EXPIRED' || c.status === 'EXHAUSTED';
          return (
            <TableRow key={c.id}>
              <TableCell className="font-mono font-semibold" dir="ltr">
                {c.code}
              </TableCell>
              <TableCell>
                <span className="block font-semibold">{c.percentOff ? `−${f.number(c.percentOff)}%` : c.amountOffFils ? `− ${money.aed(c.amountOffFils)}` : '—'}</span>
                {rules.length > 0 && <span className="block text-xs text-muted-foreground">{rules.join(' · ')}</span>}
              </TableCell>
              <TableCell>
                <ScopeLabel coupon={c} />
              </TableCell>
              <TableCell>
                <UsesBar used={c.redemptions} limit={c.maxRedemptions} />
              </TableCell>
              <TableCell>
                <span className="block">{c.expiresOn ? f.dayMonth(c.expiresOn, UTC) : t.admin.coupons.noExpiry}</span>
                {c.status === 'SCHEDULED' && c.startsOn && (
                  <span className="block text-xs text-muted-foreground">{fill(t.admin.coupons.fromDate, { date: f.dayMonth(c.startsOn, UTC) })}</span>
                )}
              </TableCell>
              <TableCell>
                <Chip tone={STATUS_TONE[c.status]}>{t.admin.coupons.status[c.status]}</Chip>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => onUsage(c)}>
                    {t.admin.coupons.usage}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(c)}>
                    {t.common.edit}
                  </Button>
                  {!finished && (
                    <Button size="sm" variant="outline" disabled={toggle.isPending && toggle.variables?.id === c.id} onClick={() => toggle.mutate(c)}>
                      {c.active ? t.admin.coupons.pause : t.admin.coupons.resume}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ScopeLabel({ coupon: c }: { coupon: Coupon }) {
  const { t, pick } = useI18n();
  if (c.batch) {
    return (
      <span>
        <span className="font-mono text-xs" dir="ltr">
          {c.batch.code}
        </span>{' '}
        · {pick(c.batch.course.titleEn, c.batch.course.titleAr).text}
      </span>
    );
  }
  if (c.course) return <span>{pick(c.course.titleEn, c.course.titleAr).text}</span>;
  return <span className="text-muted-foreground">{t.admin.coupons.scopeAll}</span>;
}

function UsesBar({ used, limit }: { used: number; limit: number | null }) {
  const { t, f, fill } = useI18n();
  const label = limit ? fill(t.admin.coupons.uses, { used: f.number(used), limit: f.number(limit) }) : fill(t.admin.coupons.usesUnlimited, { used: f.number(used) });
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm tabular-nums">{label}</span>
      {limit ? <Progress value={Math.min(100, (used / limit) * 100)} aria-label={label} className="h-1.5 max-w-32" /> : null}
    </div>
  );
}

// ───────────────────────── Create / edit ─────────────────────────

type Kind = 'percent' | 'amount';
type Scope = 'all' | 'course' | 'batch';

interface Draft {
  code: string;
  kind: Kind;
  value: string;
  scope: Scope;
  courseId: string;
  batchId: string;
  maxRedemptions: string;
  perUserLimit: string;
  minOrderAed: string;
  startsOn: string;
  expiresOn: string;
  stackable: boolean;
  active: boolean;
}

const fromCoupon = (c: Coupon | null): Draft => ({
  code: c?.code ?? '',
  kind: c?.amountOffFils ? 'amount' : 'percent',
  value: c?.percentOff ? String(c.percentOff) : c?.amountOffFils ? String(c.amountOffFils / 100) : '',
  scope: c?.batchId ? 'batch' : c?.courseId ? 'course' : 'all',
  courseId: c?.courseId ?? '',
  batchId: c?.batchId ?? '',
  maxRedemptions: c?.maxRedemptions ? String(c.maxRedemptions) : '',
  perUserLimit: c?.perUserLimit ? String(c.perUserLimit) : '',
  minOrderAed: c?.minOrderFils ? String(c.minOrderFils / 100) : '',
  startsOn: toDay(c?.startsOn ?? null),
  expiresOn: toDay(c?.expiresOn ?? null),
  stackable: c?.stackable ?? false,
  active: c?.active ?? true,
});

function toCreate(d: Draft): CouponInput {
  return {
    code: d.code.trim().toUpperCase(),
    percentOff: d.kind === 'percent' ? num(d.value) : undefined,
    amountOffAed: d.kind === 'amount' ? num(d.value) : undefined,
    maxRedemptions: num(d.maxRedemptions),
    perUserLimit: num(d.perUserLimit),
    minOrderAed: num(d.minOrderAed),
    startsOn: d.startsOn || undefined,
    expiresOn: d.expiresOn || undefined,
    courseId: d.scope === 'course' ? d.courseId || undefined : undefined,
    batchId: d.scope === 'batch' ? d.batchId || undefined : undefined,
    stackable: d.stackable,
    active: d.active,
  };
}

/** PATCH sends every rule so cleared fields become `null`. */
function toUpdate(d: Draft): UpdateCouponInput {
  const c = toCreate(d);
  return {
    percentOff: c.percentOff ?? null,
    amountOffAed: c.amountOffAed ?? null,
    maxRedemptions: c.maxRedemptions ?? null,
    perUserLimit: c.perUserLimit ?? null,
    minOrderAed: c.minOrderAed ?? null,
    startsOn: c.startsOn ?? null,
    expiresOn: c.expiresOn ?? null,
    courseId: c.courseId ?? null,
    batchId: c.batchId ?? null,
    stackable: c.stackable,
    active: c.active,
  };
}

type FieldKey = 'code' | 'maxRedemptions' | 'perUserLimit' | 'minOrderAed' | 'startsOn' | 'expiresOn';

function CouponDialog({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const uid = useId();
  const [d, setD] = useState<Draft>(() => fromCoupon(coupon));
  const [errors, setErrors] = useState<Partial<Record<keyof CouponInput, string>>>({});
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const courses = useQuery({ queryKey: qk.courses({ pageSize: 100 }), queryFn: () => coursesApi.list({ pageSize: 100 }) });
  const batches = useQuery({ queryKey: qk.batches({ pageSize: 100 }), queryFn: () => batchesApi.list({ pageSize: 100 }), enabled: d.scope === 'batch' });

  const m = useMutation({
    mutationFn: () => (coupon ? adminApi.updateCoupon(coupon.id, toUpdate(d)) : adminApi.createCoupon(toCreate(d))),
    onSuccess: () => {
      toast.success(coupon ? t.admin.coupons.saved : t.admin.coupons.created);
      void qc.invalidateQueries({ queryKey: qk.admin.coupons });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = couponInput.safeParse(toCreate(d));
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof CouponInput;
        next[k] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    m.mutate();
  };

  const id = (k: string) => `${uid}-${k}`;
  const field = (k: FieldKey, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id(k)}>{label}</Label>
      <Input
        id={id(k)}
        value={d[k]}
        onChange={(e) => set(k, e.target.value)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? id(`${k}-err`) : undefined}
        {...props}
      />
      {errors[k] && (
        <span id={id(`${k}-err`)} className="text-[13px] text-destructive">
          {errors[k]}
        </span>
      )}
    </div>
  );
  const valueKey = d.kind === 'percent' ? 'percentOff' : 'amountOffAed';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{coupon ? t.admin.coupons.edit : t.admin.coupons.new}</DialogTitle>
          <DialogDescription>{t.admin.coupons.limitsHint}</DialogDescription>
        </DialogHeader>
        <form id={id('form')} className="grid gap-5 sm:grid-cols-2" onSubmit={submit} noValidate>
          <div className="sm:col-span-2">
            {field('code', t.admin.coupons.code, {
              dir: 'ltr',
              className: 'font-mono uppercase',
              disabled: !!coupon,
              autoComplete: 'off',
              onChange: (e) => set('code', e.target.value.toUpperCase()),
            })}
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">{t.admin.coupons.discount}</legend>
            <ToggleGroup type="single" value={d.kind} onValueChange={(v) => v && set('kind', v as Kind)} className="flex justify-start gap-2">
              <ToggleGroupItem value="percent" className={TOGGLE_ITEM}>
                {t.admin.coupons.typePercent}
              </ToggleGroupItem>
              <ToggleGroupItem value="amount" className={TOGGLE_ITEM}>
                {t.admin.coupons.typeAmount}
              </ToggleGroupItem>
            </ToggleGroup>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id('value')}>{d.kind === 'percent' ? t.admin.coupons.percentOff : t.admin.coupons.amountOff}</Label>
            <Input
              id={id('value')}
              type="number"
              inputMode="decimal"
              min={d.kind === 'percent' ? 1 : 0.01}
              max={d.kind === 'percent' ? 100 : undefined}
              step={d.kind === 'percent' ? 1 : 0.01}
              value={d.value}
              onChange={(e) => set('value', e.target.value)}
              aria-invalid={!!errors[valueKey]}
              aria-describedby={errors[valueKey] ? id('value-err') : undefined}
            />
            {errors[valueKey] && (
              <span id={id('value-err')} className="text-[13px] text-destructive">
                {errors[valueKey]}
              </span>
            )}
          </div>

          <fieldset className="flex flex-col gap-3 sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">{t.admin.coupons.scope}</legend>
            <ToggleGroup type="single" value={d.scope} onValueChange={(v) => v && set('scope', v as Scope)} className="flex flex-wrap justify-start gap-2">
              <ToggleGroupItem value="all" className={TOGGLE_ITEM}>
                {t.admin.coupons.scopeAll}
              </ToggleGroupItem>
              <ToggleGroupItem value="course" className={TOGGLE_ITEM}>
                {t.admin.coupons.scopeCourse}
              </ToggleGroupItem>
              <ToggleGroupItem value="batch" className={TOGGLE_ITEM}>
                {t.admin.coupons.scopeBatch}
              </ToggleGroupItem>
            </ToggleGroup>
            {d.scope === 'course' && (
              <ScopeSelect
                label={t.admin.coupons.course}
                value={d.courseId}
                onChange={(v) => set('courseId', v)}
                options={(courses.data?.items ?? []).map((c) => ({ value: c.id, label: c.titleEn }))}
              />
            )}
            {d.scope === 'batch' && (
              <ScopeSelect
                label={t.admin.coupons.batch}
                value={d.batchId}
                onChange={(v) => set('batchId', v)}
                options={(batches.data?.items ?? []).map((b) => ({ value: b.id, label: `${b.code} · ${b.course.titleEn}` }))}
              />
            )}
          </fieldset>

          {field('maxRedemptions', t.admin.coupons.max, { type: 'number', min: 1, inputMode: 'numeric' })}
          {field('perUserLimit', t.admin.coupons.perUser, { type: 'number', min: 1, inputMode: 'numeric' })}
          {field('minOrderAed', t.admin.coupons.minOrder, { type: 'number', min: 0.01, step: 0.01, inputMode: 'decimal' })}
          <div className="hidden sm:block" aria-hidden />
          {field('startsOn', t.admin.coupons.starts, { type: 'date', dir: 'ltr' })}
          {field('expiresOn', t.admin.coupons.expires, { type: 'date', dir: 'ltr' })}

          <div className="flex items-start gap-3 sm:col-span-2">
            <Switch id={id('stackable')} checked={d.stackable} onCheckedChange={(v) => set('stackable', v)} />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={id('stackable')}>{t.admin.coupons.stackable}</Label>
              <span className="text-xs text-muted-foreground">{t.admin.coupons.stackableHint}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch id={id('active')} checked={d.active} onCheckedChange={(v) => set('active', v)} />
            <Label htmlFor={id('active')}>{t.admin.coupons.activeToggle}</Label>
          </div>

          <PreviewLine draft={d} courses={courses.data?.items ?? []} batches={batches.data?.items ?? []} />
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={id('form')} variant="ink" disabled={m.isPending}>
            {m.isPending ? t.common.saving : coupon ? t.common.save : t.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  const { t } = useI18n();
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full rounded-full sm:w-96" aria-label={label}>
        <SelectValue placeholder={t.admin.coupons.choose} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type CourseOption = { id: string; titleEn: string; titleAr: string | null; priceFils: number };
type BatchOption = { id: string; code: string; priceFils: number | null; course: { titleEn: string; titleAr: string | null; priceFils: number } };

/** "AED 880 → AED 792" on the scoped course/batch (or the first course as a sample), before VAT. */
function PreviewLine({ draft: d, courses, batches }: { draft: Draft; courses: CourseOption[]; batches: BatchOption[] }) {
  const { t, fill, pick } = useI18n();
  const money = useMoney();
  const base = useMemo(() => {
    if (d.scope === 'batch') {
      const b = batches.find((x) => x.id === d.batchId);
      return b ? { fils: b.priceFils ?? b.course.priceFils, on: `${b.code} · ${pick(b.course.titleEn, b.course.titleAr).text}` } : null;
    }
    const c = d.scope === 'course' ? courses.find((x) => x.id === d.courseId) : courses[0];
    return c ? { fils: c.priceFils, on: pick(c.titleEn, c.titleAr).text } : null;
  }, [d.scope, d.batchId, d.courseId, courses, batches, pick]);

  const value = num(d.value);
  if (!base || !value || value <= 0) return null;
  const off = d.kind === 'percent' ? percentOf(base.fils, Math.min(100, value)) : Math.min(aedToFils(value), base.fils);
  const min = num(d.minOrderAed);
  const belowMin = min !== undefined && base.fils < aedToFils(min);

  return (
    <output aria-live="polite" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border border-dashed border-line px-4 py-3 sm:col-span-2">
      <span className="label-mono text-muted-foreground">{t.admin.coupons.preview}</span>
      <span className="font-display text-lg font-bold tabular-nums" dir="ltr">
        <span className={belowMin ? undefined : 'text-muted-foreground line-through decoration-1'}>{money.aed(base.fils)}</span>
        {!belowMin && <> → {money.aed(base.fils - off)}</>}
      </span>
      <span className="text-sm text-muted-foreground">{belowMin ? t.admin.coupons.previewBelowMin : fill(t.admin.coupons.previewOn, { course: base.on })}</span>
    </output>
  );
}

// ───────────────────────── Usage ─────────────────────────

function UsageSheet({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const { t, f, fill, pick } = useI18n();
  const money = useMoney();
  const q = useQuery({ queryKey: qk.admin.couponUsage(coupon?.id ?? ''), queryFn: () => adminApi.couponUsage(coupon!.id), enabled: !!coupon });
  return (
    <Sheet open={!!coupon} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{coupon ? fill(t.admin.coupons.usageTitle, { code: coupon.code }) : t.admin.coupons.usage}</SheetTitle>
          {q.data && (
            <SheetDescription>
              {t.admin.coupons.totalDiscount}: <b className="text-foreground">{money.aed(q.data.totalDiscountFils)}</b>
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="px-4 pb-6">
          {coupon && <UsesBar used={coupon.redemptions} limit={coupon.maxRedemptions} />}
          <div className="mt-4">
            {!coupon || q.isPending ? (
              <LoadingBlock rows={3} height={40} />
            ) : q.isError ? (
              <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
            ) : q.data.items.length === 0 ? (
              <EmptyState title={t.admin.coupons.usageEmpty} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.coupons.student}</TableHead>
                    <TableHead>{t.admin.coupons.batch}</TableHead>
                    <TableHead>{t.admin.coupons.date}</TableHead>
                    <TableHead className="text-end">{t.admin.coupons.discount}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className="block font-medium">{r.student.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground" dir="ltr">
                          {r.order.reference}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs" dir="ltr">
                          {r.batch.code}
                        </span>
                        <span className="block text-xs text-muted-foreground">{pick(r.batch.courseTitleEn, r.batch.courseTitleAr).text}</span>
                      </TableCell>
                      <TableCell>{f.dayMonth(r.createdAt)}</TableCell>
                      <TableCell className="text-end tabular-nums">− {money.aed(r.discountFils)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
