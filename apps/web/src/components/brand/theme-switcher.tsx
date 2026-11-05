'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/lib/i18n/provider';
import { THEME_PREFERENCES, isThemePreference, type ThemePreference } from '@/lib/theme/config';
import { useTheme } from '@/lib/theme/provider';
import { cn } from '@/lib/utils';

const ICONS: Record<ThemePreference, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

/** Header control: icon button showing the current preference, System / Light / Dark radio menu. */
export function ThemeMenu({ className }: { className?: string }) {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();
  const Icon = ICONS[preference];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={`${t.common.theme.label}: ${t.common.theme[preference]}`} className={cn('bg-card', className)}>
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        <DropdownMenuLabel className="label-mono text-muted-foreground">{t.common.theme.label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={(v) => isThemePreference(v) && setPreference(v)}>
          {THEME_PREFERENCES.map((p) => {
            const ItemIcon = ICONS[p];
            return (
              <DropdownMenuRadioItem key={p} value={p} className="min-h-10">
                <ItemIcon /> {t.common.theme[p]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Settings control: System / Light / Dark segmented switch (same shape as the language switch). */
export function ThemeSegmented({ className, labelledBy }: { className?: string; labelledBy?: string }) {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();
  return (
    <ToggleGroup
      type="single"
      value={preference}
      onValueChange={(v) => isThemePreference(v) && setPreference(v)}
      aria-label={labelledBy ? undefined : t.common.theme.label}
      aria-labelledby={labelledBy}
      className={cn('rounded-full border border-border p-0.5', className)}
    >
      {THEME_PREFERENCES.map((p) => {
        const Icon = ICONS[p];
        return (
          <ToggleGroupItem key={p} value={p} className="h-10 gap-1.5 rounded-full px-4 text-sm font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Icon aria-hidden /> {t.common.theme[p]}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
