'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

/**
 * Every customer-facing price. Shows the amount in the header's display currency ("≈ USD 327"),
 * with a small "Charged as AED 1,200.00" line, because money only ever moves in AED.
 * When the picked currency's rate failed to load, it shows AED plus a "rates unavailable" hint
 * instead of silently ignoring the switch. `fils = null` reads "No open batches".
 *
 * - `from`: prefix "from" (course "from" prices); `template` for other wording.
 * - `compact`: one line; the AED charge moves to the tooltip (cards, tables, rails).
 */
export function Price({
  fils,
  from,
  template,
  compact,
  align = 'start',
  className,
  amountClassName,
  noteClassName,
}: {
  fils: number | null | undefined;
  from?: boolean;
  /** Custom wording around the amount, with an `{amount}` placeholder (overrides `from`). */
  template?: string;
  compact?: boolean;
  align?: 'start' | 'end';
  className?: string;
  amountClassName?: string;
  noteClassName?: string;
}) {
  const { t, fill } = useI18n();
  const money = useMoney();
  if (fils === null || fils === undefined) {
    return <span className={cn('text-muted-foreground', className)}>{t.money.noOpenBatches}</span>;
  }
  const shown = money.display(fils);
  const charged = fill(t.money.chargedAs, { amount: money.aed(fils) });
  const converted = money.currency !== 'AED';
  const amount: ReactNode = (
    <bdi dir="ltr" className="whitespace-nowrap">
      {shown}
    </bdi>
  );
  const note = money.rateMissing ? t.money.ratesHint : converted ? charged : null;
  return (
    <span
      className={cn('inline-flex flex-col', align === 'end' ? 'items-end text-end' : 'items-start text-start', className)}
      title={converted ? charged : money.rateMissing ? t.money.ratesUnavailable : undefined}
    >
      <span className={amountClassName}>{template || from ? <Wording amount={amount} template={template ?? t.money.fromPrice} /> : amount}</span>
      {note && !compact && <span className={cn('text-xs font-normal text-muted-foreground', noteClassName)}>{note}</span>}
      {note && compact && money.rateMissing && <span className={cn('text-[11px] font-normal text-muted-foreground', noteClassName)}>{note}</span>}
    </span>
  );
}

/** "from {amount}" with the amount node in place, keeping word order per locale. */
function Wording({ amount, template }: { amount: ReactNode; template: string }) {
  const [before = '', after = ''] = template.split('{amount}');
  return (
    <>
      {before && <span className="font-normal text-muted-foreground">{before}</span>}
      {amount}
      {after && <span className="font-normal text-muted-foreground">{after}</span>}
    </>
  );
}
