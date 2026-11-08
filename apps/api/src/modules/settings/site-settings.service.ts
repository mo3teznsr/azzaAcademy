import { SOCIAL_NETWORKS, type AdminSettings, type ContactSettingsInput, type RuleSettings, type RuleSettingsInput, type SiteSettings, type SocialLinks } from '@azza/shared';
import type { CutSettings } from './settings.repository';
import { EMPTY_SITE_SETTINGS, type SiteSettingsRepository, type SiteSettingsRow } from './site-settings.repository';

/** Effective business rules, read at use time (DB override, else the env default). */
export interface RuleValues {
  vatPercent: number;
  earningHoldDays: number;
  minPayoutAed: number;
  bankTransferHoldHours: number;
}

export type Integrations = AdminSettings['integrations'];

export interface SiteSettingsDeps {
  /** The env values: the fallback whenever a DB value is null. */
  defaults: RuleValues;
  integrations: Integrations;
  /** Default teacher cuts, for the legacy TEACHER_SHARE_PERCENT key. */
  cuts: () => Promise<CutSettings>;
  /** Called (fire-and-forget) after the effective VAT changed: Stripe prices of recorded courses are VAT-inclusive. */
  onVatChanged?: (vatPercent: number) => Promise<unknown>;
  log?: (message: string, error?: unknown) => void;
  /** Milliseconds; tests pass a fake. */
  now?: () => number;
  ttlMs?: number;
}

const CONTACT_KEYS = ['contactEmail', 'contactPhone', 'whatsappNumber', 'addressEn', 'addressAr'] as const;
const RULE_KEYS = ['vatPercent', 'earningHoldDays', 'minPayoutAed', 'bankTransferHoldHours'] as const;

const toEnvKeys = (r: RuleValues): RuleSettings => ({
  VAT_PERCENT: r.vatPercent,
  EARNING_HOLD_DAYS: r.earningHoldDays,
  MIN_PAYOUT_AED: r.minPayoutAed,
  BANK_TRANSFER_HOLD_HOURS: r.bankTransferHoldHours,
});

/** Only the links that are set (non-empty strings of a known network). */
function setSocials(socials: SocialLinks): SocialLinks {
  const out: SocialLinks = {};
  for (const n of SOCIAL_NETWORKS) {
    const v = socials[n];
    if (typeof v === 'string' && v) out[n] = v;
  }
  return out;
}

/**
 * Admin-editable business rules, contact details and social links (the PlatformSettings row). Secrets stay in env.
 *
 * The row is cached in memory for `ttlMs` (30 s); every update replaces the cache at once. `rules()` is the read for
 * money paths: once the cache is older than the TTL it reloads from the database *before* answering, so a value used to
 * price, hold or pay is never more than ~30 s old on any instance (and current at once on the instance that saved it).
 * Checkout quotes, transfer holds (seats and plans), transfer reviews, earnings accrual and payout runs all await it.
 *
 * `ruleSnapshot()` is the synchronous read for the few places that cannot await (the PriceCalculator inside the payment
 * gateway and the App Store sync). It returns the cached values and triggers a reload when stale; the container's
 * `refresh-site-settings` job calls `rules()` every 10 s, so the snapshot is at most ~40 s old. `warm()` loads it at boot.
 */
export class SiteSettingsService {
  private cached: SiteSettingsRow | null = null;
  private loadedAt = -Infinity;
  private inflight: Promise<SiteSettingsRow> | null = null;
  /** Bumped by every write, so a read that started before it cannot put the older row back in the cache. */
  private version = 0;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly log: (message: string, error?: unknown) => void;

  constructor(
    private readonly repo: SiteSettingsRepository,
    private readonly deps: SiteSettingsDeps,
  ) {
    this.now = deps.now ?? Date.now;
    this.ttlMs = deps.ttlMs ?? 30_000;
    this.log = deps.log ?? ((m, e) => (e ? console.error(m, e) : console.info(m)));
  }

  /** Loads the settings into the cache (boot). Never throws: the env defaults stay in use until a load succeeds. */
  async warm(): Promise<void> {
    try {
      await this.row();
    } catch (e) {
      this.log('[settings] could not load the site settings; using the env defaults', e);
    }
  }

  /** Effective rules: from the cache while fresh, else reloaded from the database first (money paths await this). */
  async rules(): Promise<RuleValues> {
    return this.effective(await this.row());
  }

  /** Synchronous effective rules: the cached values (env defaults before the first load); refreshes in the background when stale. */
  ruleSnapshot(): RuleValues {
    if (this.isStale()) void this.row().catch((e) => this.log('[settings] background refresh failed', e));
    return this.effective(this.cached ?? EMPTY_SITE_SETTINGS);
  }

  async adminView(): Promise<AdminSettings> {
    const row = await this.row();
    const cuts = await this.deps.cuts();
    return {
      rules: { ...toEnvKeys(this.effective(row)), TEACHER_SHARE_PERCENT: cuts.liveCutPercent },
      ruleDefaults: toEnvKeys(this.deps.defaults),
      integrations: this.deps.integrations,
      contact: pickContact(row),
      socials: setSocials(row.socials),
    };
  }

  /** `GET /site-settings` (public). */
  async siteSettings(): Promise<SiteSettings> {
    const row = await this.row();
    return { ...pickContact(row), socials: setSocials(row.socials) };
  }

  async updateRules(input: RuleSettingsInput): Promise<AdminSettings> {
    const before = await this.rules();
    const data: Partial<SiteSettingsRow> = {};
    for (const key of RULE_KEYS) if (input[key] !== undefined) data[key] = input[key];
    if (Object.keys(data).length) this.written(await this.repo.save(data));
    const after = await this.rules();
    if (after.vatPercent !== before.vatPercent && this.deps.onVatChanged) {
      this.log(`[settings] VAT changed ${before.vatPercent}% → ${after.vatPercent}%; re-syncing recorded-course Stripe prices`);
      void this.deps.onVatChanged(after.vatPercent).then(
        (r) => this.log(`[settings] Stripe price re-sync finished: ${JSON.stringify(r)}`),
        (e) => this.log('[settings] Stripe price re-sync failed', e),
      );
    }
    return this.adminView();
  }

  async updateContact(input: ContactSettingsInput): Promise<AdminSettings> {
    const data: Partial<SiteSettingsRow> = {};
    for (const key of CONTACT_KEYS) if (input[key] !== undefined) data[key] = input[key] ?? null;
    if (input.socials) {
      const current = (await this.row()).socials;
      const merged: SocialLinks = { ...setSocials(current) };
      for (const n of SOCIAL_NETWORKS) {
        const v = input.socials[n];
        if (v === undefined) continue;
        if (v === null) delete merged[n];
        else merged[n] = v;
      }
      data.socials = merged;
    }
    if (Object.keys(data).length) this.written(await this.repo.save(data));
    return this.adminView();
  }

  private effective(row: SiteSettingsRow): RuleValues {
    const d = this.deps.defaults;
    return {
      vatPercent: row.vatPercent ?? d.vatPercent,
      earningHoldDays: row.earningHoldDays ?? d.earningHoldDays,
      minPayoutAed: row.minPayoutAed ?? d.minPayoutAed,
      bankTransferHoldHours: row.bankTransferHoldHours ?? d.bankTransferHoldHours,
    };
  }

  private isStale() {
    return this.now() - this.loadedAt >= this.ttlMs;
  }

  private store(row: SiteSettingsRow) {
    this.cached = row;
    this.loadedAt = this.now();
  }

  private written(row: SiteSettingsRow) {
    this.version++;
    this.inflight = null;
    this.store(row);
  }

  private async row(): Promise<SiteSettingsRow> {
    if (this.cached && !this.isStale()) return this.cached;
    const version = this.version;
    this.inflight ??= this.repo
      .get()
      .then((row) => {
        if (version !== this.version && this.cached) return this.cached;
        const value = row ?? { ...EMPTY_SITE_SETTINGS };
        this.store(value);
        return value;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }
}

function pickContact(row: SiteSettingsRow) {
  return {
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    whatsappNumber: row.whatsappNumber,
    addressEn: row.addressEn,
    addressAr: row.addressAr,
  };
}
