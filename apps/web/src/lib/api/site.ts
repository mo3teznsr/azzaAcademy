import { http } from './client';
import type { SiteSettings, TeachingTerms } from './types';

export const siteApi = {
  /** Public, cached for a minute by the API: contact details and social links. */
  settings: () => http.get<SiteSettings>('/api/v1/site-settings'),
  /** Public, cached for a minute: teacher cuts, payout hold and minimum, VAT. */
  teachingTerms: () => http.get<TeachingTerms>('/api/v1/teaching-terms'),
};
