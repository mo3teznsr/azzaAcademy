import { http } from './client';
import type { SiteSettings } from './types';

export const siteApi = {
  /** Public, cached for a minute by the API: contact details and social links. */
  settings: () => http.get<SiteSettings>('/api/v1/site-settings'),
};
