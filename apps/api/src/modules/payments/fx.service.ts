import { BASE_CURRENCY, type DisplayCurrency } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

export const DEFAULT_FX_RATES: Record<Exclude<DisplayCurrency, 'AED'>, number> = { SAR: 1.0211, QAR: 0.9912, USD: 0.2723 };

export interface FxRepository {
  list(): Promise<Array<{ currency: string; ratePerAed: number; updatedAt: Date }>>;
  upsert(currency: string, ratePerAed: number, source: string): Promise<void>;
}

export class PrismaFxRepository implements FxRepository {
  constructor(private readonly db: Db) {}
  async list() {
    const rows = await this.db.fxRate.findMany();
    return rows.map((r) => ({ currency: r.currency, ratePerAed: r.ratePerAed.toNumber(), updatedAt: r.updatedAt }));
  }
  async upsert(currency: string, ratePerAed: number, source: string) {
    await this.db.fxRate.upsert({ where: { currency }, create: { currency, ratePerAed, source }, update: { ratePerAed, source } });
  }
}

/** Display-only exchange rates (units of currency per 1 AED), with sane defaults when unset. */
export class FxService {
  constructor(private readonly repo: FxRepository) {}

  async rates() {
    const rows = await this.repo.list();
    const rates = { ...DEFAULT_FX_RATES };
    let updatedAt: Date | null = null;
    for (const r of rows) {
      if (r.currency in rates) rates[r.currency as keyof typeof rates] = r.ratePerAed;
      if (!updatedAt || r.updatedAt > updatedAt) updatedAt = r.updatedAt;
    }
    return { base: BASE_CURRENCY, rates, updatedAt };
  }

  async rateFor(currency: DisplayCurrency): Promise<number> {
    if (currency === BASE_CURRENCY) return 1;
    return (await this.rates()).rates[currency];
  }

  async set(currency: 'SAR' | 'QAR' | 'USD', ratePerAed: number) {
    await this.repo.upsert(currency, ratePerAed, 'manual');
    return this.rates();
  }
}
