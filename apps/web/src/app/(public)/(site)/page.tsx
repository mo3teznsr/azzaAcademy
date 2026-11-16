import { LandingPage } from '@/features/landing/landing-page';
import { SITE_URL, jsonLd } from '@/lib/site';

/** schema.org `EducationalOrganization` for the home page (name, address and logo in search results). */
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Azza',
  alternateName: 'عازة',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  areaServed: 'AE',
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ORGANIZATION) }} />
      <LandingPage />
    </>
  );
}
