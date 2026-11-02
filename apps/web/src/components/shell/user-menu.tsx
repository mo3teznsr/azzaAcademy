'use client';

import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { useAuth, useSignOut } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';

export function UserMenu({ settingsHref }: { settingsHref: string }) {
  const { user, role } = useAuth();
  const signOut = useSignOut();
  const { t } = useI18n();
  const name = user?.name ?? '—';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full p-1 pe-3 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/60">
        <InitialsAvatar name={name} size={36} />
        <span className="hidden text-sm font-semibold sm:inline">
          <bdi>{name}</bdi>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="flex flex-col">
          <bdi className="font-semibold">{name}</bdi>
          <span className="text-xs font-normal text-muted-foreground">
            <bdi>{user?.email}</bdi> {role ? `· ${t.status.role[role]}` : ''}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <Settings /> {t.common.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut /> {t.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
