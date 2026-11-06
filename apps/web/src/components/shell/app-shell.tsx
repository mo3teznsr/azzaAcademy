'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Menu, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/signal-mark';
import { LocaleSwitcher, CurrencySwitcher } from '@/components/brand/switchers';
import { ThemeMenu } from '@/components/brand/theme-switcher';
import { Chip } from '@/components/brand/status-chip';
import { adminApi, instructorsApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { cn } from '@/lib/utils';
import { NotificationsBell } from './notifications-bell';
import { UserMenu } from './user-menu';
import type { NavGroup } from './nav-config';

type Variant = 'student' | 'teacher' | 'admin';

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LiveBadge() {
  const q = useQuery({ queryKey: qk.admin.liveRooms, queryFn: adminApi.liveRooms, refetchInterval: 30_000, retry: false });
  const n = q.data?.items.length ?? 0;
  if (!n) return null;
  return (
    <Chip tone="onair" dot className="ms-auto">
      {n}
    </Chip>
  );
}

/** Pending instructor applications (admin nav). Shares the queue's cache key, so reviewing updates it. */
function ApplicationsBadge() {
  const q = useQuery({ queryKey: qk.admin.instructorApplications('PENDING'), queryFn: () => instructorsApi.list('PENDING'), refetchInterval: 60_000, retry: false });
  const n = q.data?.length ?? 0;
  if (!n) return null;
  return (
    <Chip tone="sun" className="ms-auto">
      {n}
    </Chip>
  );
}

function SideNav({ groups, variant, onNavigate }: { groups: NavGroup[]; variant: Variant; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label={t.nav.primary} className="flex flex-col gap-5">
      {groups.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {g.label && <span className="label-mono px-3.5 pb-1 text-muted-foreground">{g.label}</span>}
          {g.items.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium no-underline transition-colors duration-200',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : variant === 'admin'
                      ? 'text-soft-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                <span className="truncate">{item.label}</span>
                {item.badge === 'live' && <LiveBadge />}
                {item.badge === 'applications' && <ApplicationsBadge />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SideFooter({ variant, t }: { variant: Variant; t: Dictionary }) {
  if (variant !== 'student') return null;
  return (
    <div className="mt-auto flex flex-col gap-2 rounded-2xl bg-sidebar-accent p-4">
      <span className="label-mono text-muted-foreground">{t.nav.helpTitle}</span>
      <span className="text-sm leading-snug">{t.nav.helpBody}</span>
      <a href="mailto:support@azza.live" className="link-sun text-sm">
        {t.nav.contactSupport}
      </a>
    </div>
  );
}

/** Area shell: sidebar (sheet on mobile) + top bar. Admin = ink sidebar on cream ground. */
export function AppShell({ variant, groups, settingsHref, children }: { variant: Variant; groups: NavGroup[]; settingsHref: string; children: ReactNode }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const isAdmin = variant === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    document.body.dataset.theme = 'cream';
    return () => {
      delete document.body.dataset.theme;
    };
  }, [isAdmin]);

  const sidebar = (
    <div className="flex h-full flex-col gap-8 px-4 py-7">
      <Logo href={groups[0]?.items[0]?.href ?? '/'} className="px-3" suffix={isAdmin ? t.nav.admin.label : undefined} />
      <SideNav groups={groups} variant={variant} onNavigate={() => setOpen(false)} />
      <SideFooter variant={variant} t={t} />
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-full focus:bg-sun focus:px-4 focus:py-2 focus:text-ink">
        {t.common.skipToContent}
      </a>
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto bg-sidebar text-sidebar-foreground lg:block',
          // Admin: ink sidebar on the cream ground. Student / teacher: follows the light / dark theme.
          isAdmin ? 'theme-ink' : 'border-e border-sidebar-border',
        )}
      >
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 px-4 pt-5 sm:px-6 lg:px-10">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" className="lg:hidden" aria-label={t.nav.openMenu}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className={cn('w-72 overflow-y-auto overscroll-contain border-sidebar-border bg-sidebar p-0 text-sidebar-foreground', isAdmin && 'theme-ink')}>
              <SheetTitle className="sr-only">{t.nav.primary}</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <label className="relative flex h-12 max-w-lg min-w-0 flex-1 items-center rounded-full border border-border bg-card px-4 text-muted-foreground">
            <span className="sr-only">{t.common.search}</span>
            <Search className="size-5 shrink-0" />
            <input
              type="search"
              placeholder={isAdmin ? t.admin.searchAll : t.common.searchSessions}
              className="ms-2.5 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher className="hidden md:flex" />
            {!isAdmin && <ThemeMenu />}
            {variant === 'student' && <CurrencySwitcher className="hidden md:flex" />}
            <NotificationsBell />
            <UserMenu settingsHref={settingsHref} />
          </div>
        </header>
        <main id="main" className="flex w-full max-w-[1360px] flex-1 flex-col gap-8 px-4 pt-6 pb-12 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
