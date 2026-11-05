import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { LegalDocument } from '@/features/legal/legal-document';

// LEGAL REVIEW REQUIRED: draft copy (dictionaries `legal.privacy`) — a lawyer must approve it before launch.

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getLocale()) === 'ar' ? ar : en;
  return { title: t.legal.privacy.title, description: t.legal.privacy.intro };
}

export default function Page() {
  return <LegalDocument kind="privacy" />;
}
