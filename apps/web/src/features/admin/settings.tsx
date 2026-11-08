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
import type { AdminSettings, ContactSettingsInput, RuleSettings, RuleSettingsInput, SocialNetwork } from '@azza/shared';
import { adminApi, API_URL } from '@/lib/api';

type RuleKey = keyof RuleSettings;
type SocialKey = SocialNetwork;
import { isValidPhone } from '@azza/shared';
import { PhoneInput } from '@/components/brand/phone-input';
import { SOCIAL_KEYS } from '@/components/brand/social-icons';
import { WHATSAPP_RE } from '@/lib/site-settings';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
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
  return (
    <>
      <PageTitle title={t.admin.settingsPage.title} />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <RulesCard />
        <ContactCard />
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
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span>{t.common.language}</span>
            <LocaleSwitcher />
          </div>
        </Panel>
        <IntegrationsCard />
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

const SETTINGS_KEY = ['admin', 'settings'] as const;

type RuleDef = { key: RuleKey; field: keyof RuleSettingsInput; min: number; max: number; unit: string };
const RULES: RuleDef[] = [
  { key: 'VAT_PERCENT', field: 'vatPercent', min: 0, max: 30, unit: '%' },
  { key: 'EARNING_HOLD_DAYS', field: 'earningHoldDays', min: 0, max: 90, unit: 'd' },
  { key: 'MIN_PAYOUT_AED', field: 'minPayoutAed', min: 0, max: 100000, unit: 'AED' },
  { key: 'BANK_TRANSFER_HOLD_HOURS', field: 'bankTransferHoldHours', min: 1, max: 168, unit: 'h' },
];

function useAdminSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: adminApi.settings });
}

/** Editable business rules; each shows its env default and can go back to it (sends `null`). */
function RulesCard() {
  const { t, f, fill } = useI18n();
  const r = t.admin.settingsPage.rulesCard;
  const errorText = useProposalError();
  const qc = useQueryClient();
  const q = useAdminSettings();
  const [vals, setVals] = useState<Record<RuleKey, string>>({ VAT_PERCENT: '', EARNING_HOLD_DAYS: '', MIN_PAYOUT_AED: '', BANK_TRANSFER_HOLD_HOURS: '' });
  const [tried, setTried] = useState(false);
  const seed = (d: AdminSettings) => setVals({ VAT_PERCENT: String(d.rules.VAT_PERCENT), EARNING_HOLD_DAYS: String(d.rules.EARNING_HOLD_DAYS), MIN_PAYOUT_AED: String(d.rules.MIN_PAYOUT_AED), BANK_TRANSFER_HOLD_HOURS: String(d.rules.BANK_TRANSFER_HOLD_HOURS) });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the inputs once the saved values arrive
    if (q.data) seed(q.data);
  }, [q.data]);
  const invalid = (d: RuleDef) => {
    const n = Number(vals[d.key]);
    return vals[d.key] === '' || !Number.isInteger(n) || n < d.min || n > d.max;
  };
  const done = (d: AdminSettings) => {
    qc.setQueryData(SETTINGS_KEY, d);
    seed(d);
    toast.success(r.saved);
  };
  const save = useMutation({
    mutationFn: (input: RuleSettingsInput) => adminApi.saveRules(input),
    onSuccess: done,
    onError: (e) => toast.error(errorText(e)),
  });
  const submit = () => {
    setTried(true);
    if (!q.data || RULES.some(invalid)) return;
    const input: RuleSettingsInput = {};
    for (const d of RULES) if (Number(vals[d.key]) !== q.data.rules[d.key]) input[d.field] = Number(vals[d.key]);
    if (Object.keys(input).length === 0) return toast.success(r.saved);
    save.mutate(input);
  };
  return (
    <Panel>
      <SectionHeader title={r.title} size="sm" />
      <p className="text-sm text-muted-foreground">{r.intro}</p>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), submit())} noValidate>
        {RULES.map((d) => {
          const def = q.data?.ruleDefaults[d.key];
          const bad = tried && invalid(d);
          return (
            <div key={d.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`rule-${d.key}`}>{r.labels[d.key]}</Label>
              <InputGroup dir="ltr">
                <InputGroupInput
                  id={`rule-${d.key}`}
                  type="number"
                  inputMode="numeric"
                  min={d.min}
                  max={d.max}
                  step={1}
                  value={vals[d.key]}
                  disabled={q.isPending}
                  aria-invalid={bad || undefined}
                  aria-describedby={`rule-${d.key}-note`}
                  onChange={(e) => setVals((v) => ({ ...v, [d.key]: e.target.value }))}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{r.units[d.key]}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <span id={`rule-${d.key}-note`} className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
                <span>
                  {def === undefined ? '…' : fill(r.default, { v: `${f.number(def)} ${r.units[d.key]}` })}
                  {' · '}
                  {fill(r.range, { min: f.number(d.min), max: f.number(d.max) })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={save.isPending || def === undefined || q.data?.rules[d.key] === def}
                  onClick={() => save.mutate({ [d.field]: null })}
                >
                  {r.reset}
                </Button>
              </span>
              {bad && (
                <span role="alert" className="text-[13px] text-destructive">
                  {fill(r.invalid, { min: f.number(d.min), max: f.number(d.max) })}
                </span>
              )}
            </div>
          );
        })}
        <p className="text-[13px] text-muted-foreground sm:col-span-2">{r.note}</p>
        <Button type="submit" variant="ink" className="self-start" disabled={save.isPending || q.isPending}>
          {save.isPending ? t.common.saving : r.save}
        </Button>
      </form>
    </Panel>
  );
}

const EMPTY_SOCIALS: Record<SocialKey, string> = { instagram: '', x: '', facebook: '', linkedin: '', youtube: '', tiktok: '', snapchat: '' };
const isHttps = (v: string) => {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Contact details and social links shown in the footer, help pages and WhatsApp buttons. */
function ContactCard() {
  const { t } = useI18n();
  const c = t.admin.settingsPage.contactCard;
  const errorText = useProposalError();
  const qc = useQueryClient();
  const q = useAdminSettings();
  const [v, setV] = useState({ contactEmail: '', contactPhone: '', whatsappNumber: '', addressEn: '', addressAr: '' });
  const [socials, setSocials] = useState(EMPTY_SOCIALS);
  const [tried, setTried] = useState(false);
  const seed = (d: AdminSettings) => {
    setV({ contactEmail: d.contact.contactEmail ?? '', contactPhone: d.contact.contactPhone ?? '', whatsappNumber: d.contact.whatsappNumber ?? '', addressEn: d.contact.addressEn ?? '', addressAr: d.contact.addressAr ?? '' });
    setSocials({ ...EMPTY_SOCIALS, ...Object.fromEntries(SOCIAL_KEYS.map((k) => [k, d.socials[k] ?? ''])) });
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the inputs once the saved values arrive
    if (q.data) seed(q.data);
  }, [q.data]);
  const errors = {
    contactEmail: v.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail.trim()) ? c.errors.email : undefined,
    whatsappNumber: v.whatsappNumber && !WHATSAPP_RE.test(v.whatsappNumber.trim()) ? c.errors.whatsapp : undefined,
    contactPhone: v.contactPhone && !isValidPhone(v.contactPhone) ? c.errors.phone : undefined,
    addressEn: v.addressEn.length > 300 ? c.errors.long : undefined,
    addressAr: v.addressAr.length > 300 ? c.errors.long : undefined,
  };
  const socialBad = (k: SocialKey) => !!socials[k].trim() && !isHttps(socials[k].trim());
  const hasErrors = Object.values(errors).some(Boolean) || SOCIAL_KEYS.some(socialBad);
  const save = useMutation({
    mutationFn: (input: ContactSettingsInput) => adminApi.saveContact(input),
    onSuccess: (d) => {
      qc.setQueryData(SETTINGS_KEY, d);
      void qc.invalidateQueries({ queryKey: ['site-settings'] });
      seed(d);
      toast.success(c.saved);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const nul = (s: string) => s.trim() || null;
  const submit = () => {
    setTried(true);
    if (hasErrors) return;
    save.mutate({
      contactEmail: nul(v.contactEmail),
      contactPhone: nul(v.contactPhone),
      whatsappNumber: nul(v.whatsappNumber),
      addressEn: nul(v.addressEn),
      addressAr: nul(v.addressAr),
      socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, nul(socials[k])])),
    });
  };
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const err = (m?: string) => tried && m;
  return (
    <Panel className="xl:col-span-2">
      <SectionHeader title={c.title} size="sm" />
      <p className="text-sm text-muted-foreground">{c.intro}</p>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), submit())} noValidate>
        <Fld id="ct-email" label={c.email} error={err(errors.contactEmail)}>
          <Input id="ct-email" type="email" dir="ltr" autoComplete="off" value={v.contactEmail} onChange={set('contactEmail')} disabled={q.isPending} aria-invalid={!!err(errors.contactEmail)} />
        </Fld>
        <Fld id="ct-phone" label={c.phone}>
          <PhoneInput id="ct-phone" value={v.contactPhone} onChange={(p) => setV((s) => ({ ...s, contactPhone: p }))} disabled={q.isPending} invalid={tried && !!errors.contactPhone} />
        </Fld>
        <Fld id="ct-wa" label={c.whatsapp} hint={c.whatsappHint} error={errors.whatsappNumber && v.whatsappNumber ? errors.whatsappNumber : undefined} className="sm:col-span-2">
          <InputGroup dir="ltr">
            <InputGroupInput id="ct-wa" inputMode="numeric" autoComplete="off" value={v.whatsappNumber} onChange={set('whatsappNumber')} disabled={q.isPending} aria-invalid={!!errors.whatsappNumber || undefined} aria-describedby="ct-wa-hint" />
          </InputGroup>
        </Fld>
        <Fld id="ct-en" label={c.addressEn} error={err(errors.addressEn)}>
          <Input id="ct-en" value={v.addressEn} onChange={set('addressEn')} disabled={q.isPending} />
        </Fld>
        <Fld id="ct-ar" label={c.addressAr} error={err(errors.addressAr)}>
          <Input id="ct-ar" dir="rtl" lang="ar" value={v.addressAr} onChange={set('addressAr')} disabled={q.isPending} />
        </Fld>
        <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="label-mono mb-3 text-muted-foreground">{c.socials}</legend>
          {SOCIAL_KEYS.map((k) => (
            <Fld key={k} id={`soc-${k}`} label={t.whatsapp.socials[k]} error={socialBad(k) && (tried || socials[k].length > 8) ? c.errors.https : undefined}>
              <Input id={`soc-${k}`} type="url" dir="ltr" autoComplete="off" placeholder="https://" value={socials[k]} onChange={(e) => setSocials((s) => ({ ...s, [k]: e.target.value }))} disabled={q.isPending} aria-invalid={socialBad(k) || undefined} />
            </Fld>
          ))}
        </fieldset>
        <Button type="submit" variant="ink" className="self-start" disabled={save.isPending || q.isPending}>
          {save.isPending ? t.common.saving : c.save}
        </Button>
      </form>
    </Panel>
  );
}

function Fld({ id, label, hint, error, children, className }: { id: string; label: string; hint?: string; error?: string | false; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ? `flex flex-col gap-1.5 ${className}` : 'flex flex-col gap-1.5'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      )}
      {error && (
        <span role="alert" className="text-[13px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

/** Secrets live in the server environment; this only says whether each one is set. */
function IntegrationsCard() {
  const { t } = useI18n();
  const i = t.admin.settingsPage.integrationsCard;
  const q = useAdminSettings();
  const keys = ['stripe', 'appleIap', 'livekit', 'smtp', 'push', 'appStoreConnect'] as const;
  return (
    <Panel>
      <SectionHeader title={i.title} size="sm" />
      <p className="text-sm text-muted-foreground">{i.note}</p>
      {q.isPending ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-destructive">{i.loadFailed}</p>
      ) : (
        keys.map((k) => (
          <div key={k} className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span>{i.names[k]}</span>
            {q.data.integrations[k] ? <Chip tone="sage">{t.admin.settingsPage.configured}</Chip> : <Chip tone="dashed">{t.admin.settingsPage.devFallback}</Chip>}
          </div>
        ))
      )}
    </Panel>
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
