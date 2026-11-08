'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cutSettingsInput } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/brand/status-chip';
import { LocaleSwitcher } from '@/components/brand/switchers';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { adminApi, API_URL, type PlatformSettings } from '@/lib/api';
import { SYNC_TONE } from './recorded-panels';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { useProposalError } from './proposal-review';

export function AdminSettings() {
  const { t } = useI18n();
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/auth/get-session`, { credentials: 'include' });
      return res.ok;
    },
    retry: false,
  });
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings });
  const unit: Record<keyof PlatformSettings['rules'], string> = {
    TEACHER_SHARE_PERCENT: '%',
    EARNING_HOLD_DAYS: ' d',
    MIN_PAYOUT_AED: ' AED',
    BANK_TRANSFER_HOLD_HOURS: ' h',
    VAT_PERCENT: '%',
  };
  return (
    <>
      <PageTitle title={t.admin.settingsPage.title} />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel>
          <SectionHeader title={t.admin.settingsPage.platform} size="sm" />
          <p className="text-sm text-muted-foreground">{t.admin.settingsPage.platformNote}</p>
          <dl className="flex flex-col">
            {t.admin.settingsPage.rules.map((r) => (
              <div key={r.v} className="flex items-center justify-between border-t border-border py-3 text-sm">
                <dt>{r.k}</dt>
                <dd className="flex items-center gap-3" dir="ltr">
                  <span className="font-mono text-xs text-muted-foreground">{r.v}</span>
                  <b className="tabular-nums">
                    {settings.data ? `${settings.data.rules[r.v as keyof PlatformSettings['rules']]}${unit[r.v as keyof PlatformSettings['rules']]}` : '…'}
                  </b>
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
        <CutsCard />
        <AppStoreCard />
        <Panel>
          <SectionHeader title={t.admin.settingsPage.livekit} size="sm" />
          <p className="text-sm text-muted-foreground">{t.admin.settingsPage.livekitNote}</p>
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span>
              {t.admin.settingsPage.apiUrl} · <span className="font-mono text-xs" dir="ltr">{API_URL}</span>
            </span>
            {health.isPending ? <Chip>…</Chip> : health.data ? <Chip tone="sage">{t.admin.settingsPage.reachable}</Chip> : <Chip tone="danger">{t.admin.settingsPage.unreachable}</Chip>}
          </div>
          {settings.data &&
            (['livekit', 'stripe', 'smtp', 'push'] as const).map((k) => (
              <div key={k} className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-mono text-xs uppercase" dir="ltr">
                  {k}
                </span>
                {settings.data.integrations[k] ? <Chip tone="sage">{t.admin.settingsPage.configured}</Chip> : <Chip tone="dashed">{t.admin.settingsPage.devFallback}</Chip>}
              </div>
            ))}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span>{t.common.language}</span>
            <LocaleSwitcher />
          </div>
        </Panel>
        <Panel>
          <SectionHeader title={t.admin.settingsPage.shortcuts} size="sm" />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="link-sun" href="/admin/bank-accounts">{t.nav.admin.bankAccounts}</Link>
            <Link className="link-sun" href="/admin/currencies">{t.nav.admin.currencies}</Link>
            <Link className="link-sun" href="/admin/coupons">{t.nav.admin.coupons}</Link>
            <Link className="link-sun" href="/admin/translations">{t.nav.admin.translations}</Link>
          </div>
        </Panel>
      </div>
    </>
  );
}

function CutsCard() {
  const { t } = useI18n();
  const c = t.recordedOps.cuts;
  const errorText = useProposalError();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.admin.cuts, queryFn: adminApi.cuts });
  const [live, setLive] = useState('');
  const [recorded, setRecorded] = useState('');
  useEffect(() => {
    if (!q.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the inputs once the saved values arrive
    setLive(String(q.data.liveCutPercent));
    setRecorded(String(q.data.recordedCutPercent));
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => {
      const parsed = cutSettingsInput.safeParse({ liveCutPercent: Number(live), recordedCutPercent: Number(recorded) });
      if (!parsed.success || live === '' || recorded === '') throw new Error(c.invalid);
      return adminApi.saveCuts(parsed.data);
    },
    onSuccess: (d) => {
      toast.success(c.saved);
      qc.setQueryData(qk.admin.cuts, d);
    },
    onError: (e) => toast.error(e.message === c.invalid ? c.invalid : errorText(e)),
  });
  return (
    <Panel>
      <SectionHeader title={c.title} size="sm" />
      <p className="text-sm text-muted-foreground">{c.intro}</p>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save.mutate())} noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cut-live">{c.live}</Label>
          <Input id="cut-live" type="number" min={0} max={100} step={1} inputMode="numeric" dir="ltr" value={live} onChange={(e) => setLive(e.target.value)} disabled={q.isPending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cut-rec">{c.recorded}</Label>
          <Input id="cut-rec" type="number" min={0} max={100} step={1} inputMode="numeric" dir="ltr" value={recorded} onChange={(e) => setRecorded(e.target.value)} disabled={q.isPending} />
        </div>
        <p className="text-[13px] text-muted-foreground sm:col-span-2">{c.note}</p>
        <Button type="submit" variant="ink" className="self-start" disabled={save.isPending || q.isPending}>
          {c.save}
        </Button>
      </form>
    </Panel>
  );
}

function AppStoreCard() {
  const { t, f, fill, pick } = useI18n();
  const a = t.recordedOps.appStore;
  const money = useMoney();
  const errorText = useProposalError();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.admin.appStore, queryFn: adminApi.appStoreStatus });
  const sync = useMutation({
    mutationFn: adminApi.syncAppStore,
    onSuccess: () => {
      toast.success(a.started);
      // The sync runs in the background; look again after a few seconds.
      setTimeout(() => void qc.invalidateQueries({ queryKey: qk.admin.appStore }), 4000);
      setTimeout(() => void qc.invalidateQueries({ queryKey: qk.admin.appStore }), 10000);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const stamp = (d: string | null) => (d ? f.dateLong(d) : a.neverSynced);
  return (
    <Panel className="xl:col-span-2">
      <SectionHeader
        title={a.title}
        size="sm"
        aside={
          <Button type="button" variant="ink" disabled={sync.isPending || !q.data?.configured} onClick={() => sync.mutate()}>
            {sync.isPending ? a.syncing : a.sync}
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">{a.intro}</p>
      {q.isPending ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-destructive">{a.loadFailed}</p>
      ) : !q.data.configured ? (
        <p role="note" className="rounded-[14px] bg-peach p-3.5 text-sm text-ink">{a.notConfigured}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <section aria-labelledby="as-seats" className="flex flex-col gap-2">
            <b id="as-seats" className="text-sm">{a.seats}</b>
            {q.data.seats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{a.noneSeats}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {q.data.seats.map((s) => (
                  <li key={s.productId} className="flex flex-col gap-1 rounded-[14px] border border-border p-3 text-sm">
                    <span className="flex items-center justify-between gap-3">
                      <b>{money.aed(s.priceFils)}</b>
                      <Chip tone={SYNC_TONE[s.status]}>{a.status[s.status]}</Chip>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">{s.productId}</span>
                    {s.status === 'FAILED' && s.detail && <span className="text-[13px] text-destructive">{s.detail}</span>}
                    <span className="text-xs text-muted-foreground">{fill(a.lastSynced, { d: stamp(s.syncedAt) })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="as-courses" className="flex flex-col gap-2">
            <b id="as-courses" className="text-sm">{a.courses}</b>
            {q.data.courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{a.noneCourses}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {q.data.courses.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1 rounded-[14px] border border-border p-3 text-sm">
                    <span className="flex items-center justify-between gap-3">
                      <b className="min-w-0 truncate">{pick(c.titleEn, c.titleAr).text}</b>
                      {c.status ? <Chip tone={SYNC_TONE[c.status]}>{a.status[c.status]}</Chip> : <Chip tone="dashed">{a.neverSynced}</Chip>}
                    </span>
                    {c.status === 'FAILED' && c.detail && <span className="text-[13px] text-destructive">{c.detail}</span>}
                    <span className="text-xs text-muted-foreground">{fill(a.lastSynced, { d: stamp(c.syncedAt) })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Panel>
  );
}
