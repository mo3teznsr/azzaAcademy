'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader, StatTile } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { referralsApi, type MyReferrals } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

export const myReferralsKey = ['referrals', 'me'] as const;

/** `/invite` (students and teachers): the reader's invite link, how many friends joined and the rewards so far. */
export function InvitePage() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: myReferralsKey, queryFn: referralsApi.mine });
  return (
    <>
      <PageTitle kicker={t.referrals.kicker} title={t.referrals.title} />
      {q.isPending ? <LoadingBlock rows={3} height={96} /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <Body data={q.data} />}
    </>
  );
}

function Body({ data }: { data: MyReferrals }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const c = t.referrals;
  const reward = data.reward.type === 'PERCENT' ? fill(c.rewardPercent, { n: data.reward.value }) : fill(c.rewardAmount, { amount: money.aed(data.reward.value) });
  const intro = data.teacherBonusFils !== null ? fill(c.introTeacher, { reward, bonus: money.aed(data.teacherBonusFils) }) : fill(c.intro, { reward });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.link);
      toast.success(c.copied);
    } catch {
      toast.error(c.copyFailed);
    }
  };
  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: c.shareTitle, text: c.shareText, url: data.link });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    await copy();
  };

  const stats = [
    { label: c.joined, value: f.number(data.joined) },
    { label: c.paid, value: f.number(data.paid) },
    data.teacherBonusFils !== null ? { label: c.bonus, value: money.aed(data.bonusFils) } : { label: c.rewarded, value: f.number(data.rewarded) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {!data.enabled && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{c.paused}</p>}

      <Panel aria-labelledby="invite-link">
        <p className="max-w-prose text-pretty">{intro}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-link-field" id="invite-link">
            {c.yourLink}
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="invite-link-field" readOnly value={data.link} dir="ltr" className="font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
            <div className="flex gap-2">
              <Button type="button" onClick={() => void copy()}>
                <Copy /> {c.copy}
              </Button>
              <Button type="button" variant="outline" onClick={() => void share()}>
                <Share2 /> {c.share}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {c.yourCode}: <bdi dir="ltr" className="font-mono font-semibold text-foreground">{data.code}</bdi>
          </p>
        </div>
      </Panel>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={<span className="tabular-nums">{s.value}</span>} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="invite-how">
          <SectionHeader title={<span id="invite-how">{c.howTitle}</span>} />
          <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm">
            <li>{c.step1}</li>
            <li>{c.step2}</li>
            <li>{c.step3}</li>
          </ol>
          <p className="text-xs text-muted-foreground">{fill(c.terms, { days: data.reward.validDays })}</p>
        </Panel>

        <Panel aria-labelledby="invite-codes">
          <SectionHeader title={<span id="invite-codes">{c.couponsTitle}</span>} />
          {data.coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.couponsEmpty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.coupons.map((coupon) => (
                <li key={coupon.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <bdi dir="ltr" className="font-mono">
                        {coupon.code}
                      </bdi>{' '}
                      · {coupon.percentOff !== null ? fill(c.rewardPercent, { n: coupon.percentOff }) : fill(c.rewardAmount, { amount: money.aed(coupon.amountOffFils ?? 0) })}
                    </p>
                    {coupon.expiresOn && <p className="text-sm text-muted-foreground">{fill(c.couponValid, { date: f.dateLong(coupon.expiresOn, 'UTC') })}</p>}
                  </div>
                  {coupon.used ? (
                    <Chip tone="dashed">
                      <Check className="size-3.5" /> {c.couponUsed}
                    </Chip>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(coupon.code).then(() => toast.success(t.common.copied), () => undefined)}>
                      <Copy /> {t.common.copy}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
