import type { CurrencyService } from '../currencies/currency.service';

/**
 * Display-only exchange rates (units of currency per 1 AED). The rates live on `Currency` now; this keeps the old
 * `GET /fx-rates` / `PUT /admin/fx-rates` shape and the checkout's `rateFor` working on top of it.
 */
export class FxService {
  constructor(private readonly currencies: Pick<CurrencyService, 'legacyRates' | 'rateFor' | 'setRate' | 'displayFor'>) {}

  rates() {
    return this.currencies.legacyRates();
  }

  /** 422 CURRENCY_UNAVAILABLE for an unknown or disabled currency. */
  rateFor(currency: string): Promise<number> {
    return this.currencies.rateFor(currency);
  }

  /** What a quote shows: the currency, its rate and decimals; AED for an unknown or disabled code (never an error). */
  displayFor(currency: string) {
    return this.currencies.displayFor(currency);
  }

  set(currency: string, ratePerAed: number) {
    return this.currencies.setRate(currency, ratePerAed);
  }
}
