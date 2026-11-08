import type { ContactSettings, SocialLinks } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { DEFAULT_CUTS } from './settings.repository';

/** DB overrides of the business rules; null = use the env default. */
export interface RuleOverrides {
  vatPercent: number | null;
  earningHoldDays: number | null;
  minPayoutAed: number | null;
  bankTransferHoldHours: number | null;
}

export interface SiteSettingsRow extends RuleOverrides, ContactSettings {
  socials: SocialLinks;
}

export const EMPTY_SITE_SETTINGS: SiteSettingsRow = {
  vatPercent: null,
  earningHoldDays: null,
  minPayoutAed: null,
  bankTransferHoldHours: null,
  contactEmail: null,
  contactPhone: null,
  whatsappNumber: null,
  addressEn: null,
  addressAr: null,
  socials: {},
};

export interface SiteSettingsRepository {
  /** null when the settings row does not exist yet (a fresh database). */
  get(): Promise<SiteSettingsRow | null>;
  /** Writes only the given fields (creating the row with the default cuts if needed). */
  save(data: Partial<SiteSettingsRow>): Promise<SiteSettingsRow>;
}

const select = {
  vatPercent: true,
  earningHoldDays: true,
  minPayoutAed: true,
  bankTransferHoldHours: true,
  contactEmail: true,
  contactPhone: true,
  whatsappNumber: true,
  addressEn: true,
  addressAr: true,
  socials: true,
} as const;

const toRow = (r: Omit<SiteSettingsRow, 'socials'> & { socials: unknown }): SiteSettingsRow => ({
  ...r,
  socials: r.socials && typeof r.socials === 'object' && !Array.isArray(r.socials) ? (r.socials as SocialLinks) : {},
});

export class PrismaSiteSettingsRepository implements SiteSettingsRepository {
  constructor(private readonly db: Db) {}

  async get() {
    const row = await this.db.platformSettings.findUnique({ where: { id: 'default' }, select });
    return row ? toRow(row) : null;
  }

  async save(data: Partial<SiteSettingsRow>) {
    const row = await this.db.platformSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...DEFAULT_CUTS, ...data },
      update: data,
      select,
    });
    return toRow(row);
  }
}
