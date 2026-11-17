'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { aedToFils, allAccessPlanInput, appleAllAccessProductId, filsToAed } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/brand/status-chip';
import { Panel, SectionHeader } from '@/components/brand/section';
import { allAccessApi, allAccessQueryKeys, ApiError, type AdminAllAccessPlan } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useProposalError } from './proposal-review';

/** Admin settings: the all-access plan's prices (before VAT) and its on/off switch. */
export function AllAccessCard() {
  const { t, f } = useI18n();
  const c = t.allAccess.admin;
  const errorText = useProposalError();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: allAccessQueryKeys.admin, queryFn: allAccessApi.adminPlan });
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (!q.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the inputs once the saved values arrive
    setMonthly(q.data.monthlyPriceFils == null ? '' : String(filsToAed(q.data.monthlyPriceFils)));
    setYearly(q.data.yearlyPriceFils == null ? '' : String(filsToAed(q.data.yearlyPriceFils)));
    setEnabled(q.data.enabled);
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => {
      const toFils = (v: string) => (v.trim() === '' ? null : aedToFils(Number(v)));
      const parsed = allAccessPlanInput.safeParse({ enabled, monthlyPriceFils: toFils(monthly), yearlyPriceFils: toFils(yearly) });
      if (!parsed.success) throw new Error(c.invalid);
      return allAccessApi.save(parsed.data);
    },
    onSuccess: (d) => {
      toast.success(c.saved);
      qc.setQueryData(allAccessQueryKeys.admin, d);
      void qc.invalidateQueries({ queryKey: allAccessQueryKeys.plan });
    },
    onError: (e) => toast.error(e.message === c.invalid ? c.invalid : errorText(e)),
  });
  return (
    <Panel>
      <SectionHeader title={c.title} size="sm" />
      <p className="text-sm text-muted-foreground">{c.intro}</p>
      {q.data && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{f.plural(q.data.courseCount, t.allAccess.courses)}</span>
          {q.data.cardReady ? <Chip tone="sage">{c.cardReady}</Chip> : <Chip tone="dashed">{c.cardNotReady}</Chip>}
        </div>
      )}
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save.mutate())} noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aa-monthly">{c.monthly}</Label>
          <Input id="aa-monthly" type="number" min={1} step="0.01" inputMode="decimal" dir="ltr" value={monthly} onChange={(e) => setMonthly(e.target.value)} disabled={q.isPending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aa-yearly">{c.yearly}</Label>
          <Input id="aa-yearly" type="number" min={1} step="0.01" inputMode="decimal" dir="ltr" value={yearly} onChange={(e) => setYearly(e.target.value)} disabled={q.isPending} />
        </div>
        <div className="flex items-start gap-3 sm:col-span-2">
          <Switch id="aa-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={q.isPending} />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="aa-enabled">{c.enabled}</Label>
            <span className="text-[13px] text-muted-foreground">{c.enabledHint}</span>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground sm:col-span-2">{c.pay}</p>
        <Button type="submit" variant="ink" className="self-start" disabled={save.isPending || q.isPending}>
          {c.save}
        </Button>
      </form>
      {q.data && <AllAccessAppleProducts plan={q.data} />}
    </Panel>
  );
}

/**
 * The plan's App Store products (iOS), like a recorded course's: made by hand in App Store Connect in their own
 * subscription group, then entered here. Empty = not sold in the iPhone app.
 */
function AllAccessAppleProducts({ plan }: { plan: AdminAllAccessPlan }) {
  const { t, fill } = useI18n();
  const c = t.allAccess.admin;
  const errorText = useProposalError();
  const qc = useQueryClient();
  const expected = { monthly: appleAllAccessProductId('MONTHLY'), yearly: appleAllAccessProductId('YEARLY') };
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [mismatch, setMismatch] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed from the saved plan
    setMonthly(plan.appleProducts?.monthly ?? '');
    setYearly(plan.appleProducts?.yearly ?? '');
  }, [plan.appleProducts?.monthly, plan.appleProducts?.yearly]);
  const save = useMutation({
    mutationFn: () => allAccessApi.setAppleProducts({ monthly: monthly.trim() || null, yearly: yearly.trim() || null }),
    onSuccess: (d) => {
      setMismatch(false);
      toast.success(c.appleSaved);
      qc.setQueryData(allAccessQueryKeys.admin, d);
      void qc.invalidateQueries({ queryKey: allAccessQueryKeys.plan });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'APPLE_PRODUCT_MISMATCH') setMismatch(true);
      toast.error(errorText(e));
    },
  });
  const field = (id: string, label: string, v: string, set: (s: string) => void, exp: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} dir="ltr" placeholder={exp} value={v} onChange={(e) => set(e.target.value)} aria-invalid={mismatch && !!v && v.trim() !== exp} />
      <span className="font-mono text-[12px] text-muted-foreground" dir="ltr">
        {fill(t.recordedOps.apple.expected, { id: exp })}
      </span>
      {mismatch && !!v && v.trim() !== exp && <span className="text-[13px] text-destructive">{fill(t.recordedOps.apple.mismatch, { id: exp })}</span>}
    </div>
  );
  return (
    <div className="flex flex-col gap-4 border-t border-cream-line pt-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{c.appleTitle}</h3>
        <p className="text-sm text-muted-foreground">{c.appleIntro}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {field('aa-apple-m', c.appleMonthly, monthly, setMonthly, expected.monthly)}
        {field('aa-apple-y', c.appleYearly, yearly, setYearly, expected.yearly)}
      </div>
      <Button type="button" variant="outline" className="self-start" disabled={save.isPending} onClick={() => save.mutate()}>
        {c.appleSave}
      </Button>
    </div>
  );
}
