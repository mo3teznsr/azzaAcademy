'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

/** EN / العربية segmented switch — each option written in its own language. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <ToggleGroup
      type="single"
      value={locale}
      onValueChange={(v) => v && setLocale(v as 'en' | 'ar')}
      aria-label={t.common.language}
      className={cn('rounded-full border border-border p-0.5', className)}
    >
      <ToggleGroupItem value="en" lang="en" className="h-8 rounded-full px-3 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        EN
      </ToggleGroupItem>
      <ToggleGroupItem value="ar" lang="ar" className="h-8 rounded-full px-3 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        العربية
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function CurrencySwitcher({ className }: { className?: string }) {
  const { t } = useI18n();
  const money = useMoney();
  return (
    <Select value={money.chosen} onValueChange={(v) => money.setCurrency(v)}>
      <SelectTrigger size="sm" aria-label={t.common.currency} className={cn('rounded-full font-mono text-xs', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {money.currencies.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
