import { BASE_CURRENCY, type AdminCurrencyItem, type CurrencyInput, type CurrencyItem, type CurrencyList, type UpdateCurrencyInput } from '@azza/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { Db } from '../../infrastructure/db';

export interface CurrencyRecord {
  code: string;
  nameEn: string;
  nameAr: string;
  symbol: string | null;
  decimals: number;
  ratePerAed: number;
  enabled: boolean;
  sortOrder: number;
  updatedAt: Date;
}

export type CurrencyWrite = Partial<Omit<CurrencyRecord, 'code' | 'updatedAt'>>;

/** The seed defaults (and what the currencies migration inserts); rates are fx.service's old defaults. */
export const DEFAULT_CURRENCIES: Array<Omit<CurrencyRecord, 'updatedAt' | 'enabled'>> = [
  { code: 'AED', nameEn: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'AED', decimals: 2, ratePerAed: 1, sortOrder: 0 },
  { code: 'SAR', nameEn: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'SAR', decimals: 0, ratePerAed: 1.0211, sortOrder: 1 },
  { code: 'QAR', nameEn: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: 'QAR', decimals: 0, ratePerAed: 0.9912, sortOrder: 2 },
  { code: 'USD', nameEn: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', decimals: 0, ratePerAed: 0.2723, sortOrder: 3 },
];

export interface CurrencyRepository {
  /** Sorted by sortOrder, then code. */
  list(includeDisabled: boolean): Promise<CurrencyRecord[]>;
  find(code: string): Promise<CurrencyRecord | null>;
  create(data: Omit<CurrencyRecord, 'updatedAt'>): Promise<CurrencyRecord>;
  update(code: string, data: CurrencyWrite): Promise<CurrencyRecord>;
  /** Deletes the currency and moves its users to AED in one transaction. Returns how many users were moved. */
  deleteAndResetUsers(code: string): Promise<number>;
  /** Users who prefer `code` go back to AED. Returns how many were moved. */
  resetUsers(code: string): Promise<number>;
}

type Row = Omit<CurrencyRecord, 'ratePerAed'> & { ratePerAed: { toNumber(): number } };
const toRecord = (r: Row): CurrencyRecord => ({ ...r, ratePerAed: r.ratePerAed.toNumber() });

export class PrismaCurrencyRepository implements CurrencyRepository {
  constructor(private readonly db: Db) {}
  async list(includeDisabled: boolean) {
    const rows = await this.db.currency.findMany({ where: includeDisabled ? {} : { enabled: true }, orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
    return rows.map(toRecord);
  }
  async find(code: string) {
    const row = await this.db.currency.findUnique({ where: { code } });
    return row ? toRecord(row) : null;
  }
  async create(data: Omit<CurrencyRecord, 'updatedAt'>) {
    return toRecord(await this.db.currency.create({ data }));
  }
  async update(code: string, data: CurrencyWrite) {
    return toRecord(await this.db.currency.update({ where: { code }, data }));
  }
  async deleteAndResetUsers(code: string) {
    const [, moved] = await this.db.$transaction([
      this.db.currency.delete({ where: { code } }),
      this.db.user.updateMany({ where: { displayCurrency: code }, data: { displayCurrency: BASE_CURRENCY } }),
    ]);
    return moved.count;
  }
  async resetUsers(code: string) {
    return (await this.db.user.updateMany({ where: { displayCurrency: code }, data: { displayCurrency: BASE_CURRENCY } })).count;
  }
}

const locked = (what: string) => new BusinessRuleError(`AED is the base currency: it cannot be ${what}`, 'BASE_CURRENCY_LOCKED');

const toItem = (c: CurrencyRecord): CurrencyItem => ({
  code: c.code,
  nameEn: c.nameEn,
  nameAr: c.nameAr,
  symbol: c.symbol,
  decimals: c.decimals,
  ratePerAed: c.ratePerAed,
  sortOrder: c.sortOrder,
});
const toAdminItem = (c: CurrencyRecord): AdminCurrencyItem => ({ ...toItem(c), enabled: c.enabled, updatedAt: c.updatedAt.toISOString() });

/**
 * Admin-managed display currencies. Display only: charges, ledgers and refunds are always AED. AED is always present,
 * enabled and at rate 1. A removed or disabled currency sends its users back to AED (at removal, and at read time).
 */
export class CurrencyService {
  constructor(
    private readonly repo: CurrencyRepository,
    private readonly log: (message: string) => void = (m) => console.info(m),
  ) {}

  /** `GET /currencies`: enabled only, sorted. */
  async list(): Promise<CurrencyList> {
    return { base: BASE_CURRENCY, items: (await this.repo.list(false)).map(toItem) };
  }

  /** `GET /admin/currencies`: all of them. */
  async adminList(): Promise<{ base: 'AED'; items: AdminCurrencyItem[] }> {
    return { base: BASE_CURRENCY, items: (await this.repo.list(true)).map(toAdminItem) };
  }

  async create(input: CurrencyInput): Promise<AdminCurrencyItem> {
    if (await this.repo.find(input.code)) throw new ConflictError(`Currency ${input.code} exists`);
    const created = await this.repo.create({
      code: input.code,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      symbol: input.symbol ?? null,
      decimals: input.decimals,
      ratePerAed: input.ratePerAed,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    });
    return toAdminItem(created);
  }

  async update(code: string, input: UpdateCurrencyInput): Promise<AdminCurrencyItem> {
    const existing = await this.require(code);
    if (existing.code === BASE_CURRENCY) {
      if (input.enabled === false) throw locked('disabled');
      if (input.ratePerAed !== undefined && input.ratePerAed !== 1) throw locked('given a rate other than 1');
    }
    const data: CurrencyWrite = {};
    for (const key of ['nameEn', 'nameAr', 'symbol', 'decimals', 'ratePerAed', 'enabled', 'sortOrder'] as const) {
      if (input[key] !== undefined) (data as Record<string, unknown>)[key] = input[key];
    }
    const updated = await this.repo.update(existing.code, data);
    if (existing.enabled && !updated.enabled) {
      const moved = await this.repo.resetUsers(existing.code);
      this.log(`[currencies] ${existing.code} disabled; ${moved} user(s) moved to AED`);
    }
    return toAdminItem(updated);
  }

  async delete(code: string): Promise<{ ok: true }> {
    const existing = await this.require(code);
    if (existing.code === BASE_CURRENCY) throw locked('removed');
    // Past orders keep their own displayCurrency + fxRate snapshot; only preferences move.
    const moved = await this.repo.deleteAndResetUsers(existing.code);
    this.log(`[currencies] ${existing.code} removed; ${moved} user(s) moved to AED`);
    return { ok: true };
  }

  /** Throws 422 CURRENCY_UNAVAILABLE unless the code is AED or an existing, enabled currency. Returns it uppercased. */
  async assertSelectable(code: string): Promise<CurrencyRecord> {
    const normalized = code.trim().toUpperCase();
    const currency = await this.repo.find(normalized);
    if (normalized === BASE_CURRENCY) return currency ?? { ...DEFAULT_CURRENCIES[0]!, enabled: true, updatedAt: new Date(0) };
    if (!currency || !currency.enabled) {
      throw new BusinessRuleError(`${normalized} is not an available currency`, 'CURRENCY_UNAVAILABLE', { currency: normalized });
    }
    return currency;
  }

  /** A stored preference as it should be shown: itself when still enabled, else AED. */
  async effective(code: string | null | undefined): Promise<string> {
    if (!code || code === BASE_CURRENCY) return BASE_CURRENCY;
    const currency = await this.repo.find(code);
    return currency?.enabled ? currency.code : BASE_CURRENCY;
  }

  /** Whether a code can be chosen (AED, or an existing enabled currency). */
  async isSelectable(code: string): Promise<boolean> {
    const normalized = code.trim().toUpperCase();
    if (normalized === BASE_CURRENCY) return true;
    return !!(await this.repo.find(normalized))?.enabled;
  }

  /** What a checkout quote shows (display only): the currency with its rate and decimals, or AED when it is unknown or disabled. */
  async displayFor(code: string): Promise<{ currency: string; rate: number; decimals: number }> {
    const normalized = code.trim().toUpperCase();
    const currency = normalized === BASE_CURRENCY ? null : await this.repo.find(normalized);
    if (currency?.enabled) return { currency: currency.code, rate: currency.ratePerAed, decimals: currency.decimals };
    const base = await this.repo.find(BASE_CURRENCY);
    return { currency: BASE_CURRENCY, rate: 1, decimals: base?.decimals ?? 2 };
  }

  /** Units per 1 AED of a selectable currency (422 otherwise). */
  async rateFor(code: string): Promise<number> {
    if (code === BASE_CURRENCY) return 1;
    return (await this.assertSelectable(code)).ratePerAed;
  }

  /** The old `GET /fx-rates` shape, for older clients: every enabled non-base currency. */
  async legacyRates(): Promise<{ base: 'AED'; rates: Record<string, number>; updatedAt: Date | null }> {
    const all = await this.repo.list(false);
    const rates: Record<string, number> = {};
    let updatedAt: Date | null = null;
    for (const c of all) {
      if (c.code === BASE_CURRENCY) continue;
      rates[c.code] = c.ratePerAed;
      if (!updatedAt || c.updatedAt > updatedAt) updatedAt = c.updatedAt;
    }
    return { base: BASE_CURRENCY, rates, updatedAt };
  }

  /** The old `PUT /admin/fx-rates`: sets one rate. */
  async setRate(code: string, ratePerAed: number) {
    await this.update(code, { ratePerAed });
    return this.legacyRates();
  }

  private async require(code: string): Promise<CurrencyRecord> {
    const currency = await this.repo.find(code.trim().toUpperCase());
    if (!currency) throw new NotFoundError('Currency', code);
    return currency;
  }
}
