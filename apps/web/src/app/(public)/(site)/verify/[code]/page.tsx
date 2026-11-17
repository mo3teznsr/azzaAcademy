import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { ogLocale } from '@/lib/site';
import { VerifyPage } from '@/features/certificates/verify-page';
import { OG_SIZE, certificateCourse, fetchCertificate } from '@/features/certificates/certificate-og';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const [{ code }, locale] = await Promise.all([params, getLocale()]);
  const t = locale === 'ar' ? ar : en;
  const c = await fetchCertificate(code);
  const title = `${t.verify.title} · ${code.toUpperCase()}`;
  const shareTitle = c ? `${c.holderName} · ${certificateCourse(c, locale)}` : title;
  const description = c ? `${t.verify.valid}. ${t.verify.validBody}` : t.verify.notFoundBody;
  const image = { url: `/verify/${encodeURIComponent(code)}/og?lang=${locale}`, ...OG_SIZE, alt: shareTitle };
  return {
    title,
    description,
    // Out of search results (a certificate is a person's record), but link previews still fetch the image:
    // preview bots read Open Graph regardless of noindex, and robots.txt leaves /verify open.
    robots: { index: false, follow: false, 'max-image-preview': 'large' },
    openGraph: { type: 'website', title: shareTitle, description, locale: ogLocale(locale), images: [image] },
    twitter: { card: 'summary_large_image', title: shareTitle, description, images: [image] },
  };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <VerifyPage code={code} />;
}
