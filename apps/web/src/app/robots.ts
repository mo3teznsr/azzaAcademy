import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Public pages are open to crawlers; signed-in areas, checkout and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/studio', '/learn', '/checkout', '/orders', '/settings', '/messages', '/support', '/live', '/library', '/schedule', '/saved', '/plans', '/assignments', '/quizzes', '/certificates', '/announcements', '/account', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
