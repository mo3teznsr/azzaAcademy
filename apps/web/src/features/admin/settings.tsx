'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@/components/brand/status-chip';
import { LocaleSwitcher } from '@/components/brand/switchers';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { adminApi, API_URL, type PlatformSettings } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';

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
