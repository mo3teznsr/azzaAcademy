import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import { pageAlternates } from '@/lib/site';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { getTeachingTerms } from '@/lib/api/server';
import { TeachPage } from '@/features/instructors/teach-page';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = locale === 'ar' ? ar : en;
  return { title: t.instructors.apply.kicker, description: t.instructors.apply.body, alternates: pageAlternates(locale, '/teach') };
}

/** The shares and payout rules are rendered on the server from the admin settings, so they are in the HTML and never stale. */
export default async function Page() {
  return <TeachPage initialTerms={(await getTeachingTerms()) ?? undefined} />;
}
