import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getLocale } from '@/lib/i18n/server';
import { pageAlternates } from '@/lib/site';
import { publicGet, seedCategories, serverQueryClient } from '@/lib/api/server';
import type { DirectoryTeacher } from '@/lib/api/instructors';
import type { Items } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { InstructorsDirectory } from '@/features/instructors/directory';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = locale === 'ar' ? ar : en;
  return { title: t.instructors.directory.kicker, description: t.instructors.directory.body, alternates: pageAlternates(locale, '/teachers') };
}

export default async function Page() {
  // Teacher names and subjects in the HTML (the directory reads the list, unwrapped, under this key).
  const queryClient = serverQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: qk.teachersDirectory, queryFn: () => publicGet<Items<DirectoryTeacher>>('/api/v1/teachers').then((r) => r.items) }),
    seedCategories(queryClient),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InstructorsDirectory />
    </HydrationBoundary>
  );
}
