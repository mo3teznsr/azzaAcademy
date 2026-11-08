import type {
  AppStoreCatalog,
  LocalizationInput,
  PricePoint,
  PricePointKind,
  SubscriptionPeriod,
} from '../../src/modules/appstore-sync/appstore-sync.port';

/** In-memory App Store Connect. `calls` records every mutating call by method name. */
export class InMemoryAppStoreCatalog implements AppStoreCatalog {
  calls: string[] = [];
  iaps = new Map<string, { id: string; name: string }>();
  groups = new Map<string, { id: string }>();
  subs = new Map<string, { id: string; groupId: string; name: string; period: SubscriptionPeriod; groupLevel: number }>();
  localizations = new Map<string, LocalizationInput[]>();
  prices = new Map<string, string>();
  preserveFlags: boolean[] = [];
  private seq = 0;

  constructor(public points: PricePoint[] = defaultPricePoints()) {}

  count(method: string) {
    return this.calls.filter((c) => c === method).length;
  }
  private id(prefix: string) {
    return `${prefix}${++this.seq}`;
  }

  async findIapByProductId(productId: string) {
    const r = this.iaps.get(productId);
    return r ? { id: r.id, state: 'MISSING_METADATA' } : null;
  }
  async createConsumable(a: { productId: string; name: string; reviewNote: string }) {
    this.calls.push('createConsumable');
    const id = this.id('iap');
    this.iaps.set(a.productId, { id, name: a.name });
    return { id };
  }
  async setIapLocalizations(id: string, l: LocalizationInput[]) {
    this.calls.push('setIapLocalizations');
    this.localizations.set(id, l);
  }
  async uaePricePoints(_id: string, _kind: PricePointKind) {
    return this.points;
  }
  async currentIapPrice(id: string) {
    return this.prices.get(id) ?? null;
  }
  async currentSubscriptionPrice(id: string) {
    return this.prices.get(id) ?? null;
  }
  async setIapPrice(id: string, pp: string) {
    this.calls.push('setIapPrice');
    this.prices.set(id, pp);
  }
  async findSubscriptionGroup(name: string) {
    return this.groups.get(name) ?? null;
  }
  async createSubscriptionGroup(name: string) {
    this.calls.push('createSubscriptionGroup');
    const g = { id: this.id('grp') };
    this.groups.set(name, g);
    return g;
  }
  async findSubscriptionByProductId(productId: string) {
    const s = this.subs.get(productId);
    return s ? { id: s.id, state: 'MISSING_METADATA' } : null;
  }
  async createSubscription(a: { groupId: string; productId: string; name: string; period: SubscriptionPeriod; groupLevel: number }) {
    this.calls.push('createSubscription');
    const id = this.id('sub');
    this.subs.set(a.productId, { id, groupId: a.groupId, name: a.name, period: a.period, groupLevel: a.groupLevel });
    return { id };
  }
  async setSubscriptionLocalizations(id: string, l: LocalizationInput[]) {
    this.calls.push('setSubscriptionLocalizations');
    this.localizations.set(id, l);
  }
  async setSubscriptionPrice(id: string, pp: string) {
    this.calls.push('setSubscriptionPrice');
    this.preserveFlags.push(true);
    this.prices.set(id, pp);
  }
}

/** A coarse AED ladder around the prices the tests use (ids are the price in dirhams). */
export function defaultPricePoints(): PricePoint[] {
  return [
    9.99, 14.99, 19.99, 24.99, 29.99, 34.99, 39.99, 44.99, 49.99, 54.99, 59.99, 64.99, 69.99, 74.99, 79.99, 84.99,
    89.99, 94.99, 99.99, 109.99, 119.99, 129.99, 149.99, 199.99, 249.99, 299.99, 349.99, 399.99, 449.99, 459.99,
    472.99, 499.99, 549.99, 599.99, 649.99, 699.99, 749.99, 799.99, 849.99, 899.99, 949.99, 999.99,
  ].map((p) => ({ id: `pp-${p}`, customerPrice: p }));
}
