'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@azza/shared';
import { useAuth } from '@/lib/auth/use-auth';
import { homeFor } from '@/lib/auth/roles';
import { useI18n } from '@/lib/i18n/provider';
import { SignalMark } from '@/components/brand/signal-mark';

/** Client guard for an area. The proxy does the optimistic redirect; this covers client navigation. */
export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, role, isPending, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const unreachable = !!error && !user;

  useEffect(() => {
    if (isPending || unreachable) return;
    if (!user) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    else if (role && !roles.includes(role)) router.replace(homeFor(role));
  }, [isPending, unreachable, user, role, roles, router, pathname]);

  if (isPending || (!unreachable && (!user || (role && !roles.includes(role))))) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-muted-foreground">
          <SignalMark state="starting" size={28} />
          <span className="label-mono">{t.common.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {unreachable && (
        <div role="alert" className="border-b border-danger-line bg-danger-bg px-4 py-2 text-center text-sm text-danger-fg">
          {t.common.networkError}
        </div>
      )}
      {children}
    </>
  );
}
