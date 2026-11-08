'use client';

import { Button } from '@/components/ui/button';
import { isAppleProvider, type MySubscription } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { usePlanActions } from './manage-plan';

/**
 * A calm line above a recorded course when the plan needs a look: the last payment failed (Update card),
 * or the plan is set to end (Ends {date} · Resume). Nothing for any other status.
 */
export function PlanBanner({ subscription }: { subscription: MySubscription | null | undefined }) {
  if (!subscription || (subscription.status !== 'PAST_DUE' && subscription.status !== 'CANCELLING')) return null;
  return <Banner subscription={subscription} />;
}

function Banner({ subscription }: { subscription: MySubscription }) {
  const { t, fill } = useI18n();
  const a = usePlanActions(subscription);
  const pastDue = subscription.status === 'PAST_DUE';
  // Only card plans are ours to change; Apple and transfer rows have their own flows.
  const card = subscription.provider === 'STRIPE';
  const text = pastDue ? t.recorded.pastDue : a.end ? fill(t.recorded.ends, { date: a.end }) : t.recorded.cancelBodyNoDate;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-peach px-4 py-3 text-ink">
      <p className="min-w-0 flex-1 basis-60 text-sm font-semibold">
        {text}
      </p>
      {card && (
        <Button
          variant="ink"
          disabled={pastDue ? a.portal.isPending : a.resume.isPending}
          onClick={() => (pastDue ? a.portal.mutate() : a.resume.mutate())}
        >
          {pastDue ? t.recorded.updateCard : t.recorded.resume}
        </Button>
      )}
      {!card && isAppleProvider(subscription.provider) && <span className="text-[13px]">{t.recorded.manageApple}</span>}
    </div>
  );
}
