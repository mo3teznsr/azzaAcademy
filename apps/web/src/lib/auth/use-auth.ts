'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { Role } from '@azza/shared';
import { authClient } from './client';

/** Thin facade over better-auth's session hook with our role type. */
export function useAuth() {
  const { data, isPending, error, refetch } = authClient.useSession();
  const user = data?.user ?? null;
  return {
    user,
    role: (user?.role as Role | undefined) ?? null,
    isPending,
    error,
    refetch,
    isSignedIn: !!user,
  };
}

export function useSignOut() {
  const router = useRouter();
  const qc = useQueryClient();
  return useCallback(async () => {
    await authClient.signOut().catch(() => undefined);
    qc.clear();
    router.replace('/sign-in');
    router.refresh();
  }, [qc, router]);
}
