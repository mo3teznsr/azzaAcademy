import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { DeleteAccountPage } from '@/features/legal/delete-account-page';

// LEGAL REVIEW REQUIRED: draft copy (dictionaries `legal.deletion`) — a lawyer must approve it before launch.
// Public URL submitted to Google Play as the account-deletion page; it must work signed out.

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getLocale()) === 'ar' ? ar : en;
  return { title: t.legal.deletion.title, description: t.legal.deletion.intro };
}

export default function Page() {
  return <DeleteAccountPage />;
}
