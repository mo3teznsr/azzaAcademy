import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { CertificateOgImage, OG_SIZE, fetchCertificate, formatIssued, loadBrandFont, ogText } from '@/features/certificates/certificate-og';

/**
 * `GET /verify/[code]/og?lang=ar|en`: the certificate's link preview image.
 *
 * A route handler rather than the `opengraph-image` file: that file cannot see the page language, and its
 * response is cached by URL, so one language would be served to everyone. Here the language is in the URL
 * the page's metadata points to, so each language is its own cacheable image.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const locale = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ar';
  const c = await fetchCertificate(code);
  const issued = formatIssued(c, locale);
  const text = ogText(c, locale, issued);
  const fonts = (await Promise.all([loadBrandFont(text, 400), loadBrandFont(text, 800)])).filter((f) => f !== null);
  return new ImageResponse(<CertificateOgImage c={c} locale={locale} issued={issued} />, {
    ...OG_SIZE,
    ...(fonts.length && { fonts }),
    // An unknown code may be issued later (or the API was down): don't let a "not found" card stick.
    headers: { 'Cache-Control': c ? 'public, max-age=86400, s-maxage=86400' : 'public, max-age=300' },
  });
}
