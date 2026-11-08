import { createPrivateKey, createSign } from 'node:crypto';
import type {
  AppStoreCatalog,
  LocalizationInput,
  PricePoint,
  PricePointKind,
  SubscriptionPeriod,
} from '../../modules/appstore-sync/appstore-sync.port';

const BASE_URL = 'https://api.appstoreconnect.apple.com';
const TERRITORY = 'ARE';
const TOKEN_LIFETIME_S = 20 * 60;
const TOKEN_REUSE_S = 15 * 60;
const MAX_RETRIES = 3;
const MAX_RETRY_AFTER_S = 60;
/** Local id linking the price schedule to its included manual price (JSON:API local id). */
const MANUAL_PRICE_LOCAL_ID = '${price1}';

export class AppStoreConnectError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AppStoreConnectError';
  }
}

export interface AppStoreConnectOptions {
  issuerId: string;
  keyId: string;
  /** PEM (PKCS#8) contents of the .p8 key, or a loader returning it. */
  privateKey: string | (() => string | Promise<string>);
  /** Numeric Apple id of the app (e.g. 6758939735). */
  appAppleId: string;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  baseDelayMs?: number;
}

type Json = Record<string, any>;
const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export class AppStoreConnectClient implements AppStoreCatalog {
  private token: { value: string; issuedAt: number } | null = null;
  private readonly doFetch: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly baseDelayMs: number;

  constructor(private readonly opts: AppStoreConnectOptions) {
    this.doFetch = opts.fetch ?? fetch;
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.baseDelayMs = opts.baseDelayMs ?? 500;
  }

  // ---- auth ----------------------------------------------------------------

  /** ES256 JWT, valid 20 minutes, reused for about 15. */
  async bearer(): Promise<string> {
    const nowS = Math.floor(this.now() / 1000);
    if (this.token && nowS - this.token.issuedAt < TOKEN_REUSE_S) return this.token.value;
    const pem = typeof this.opts.privateKey === 'function' ? await this.opts.privateKey() : this.opts.privateKey;
    const header = b64url(JSON.stringify({ alg: 'ES256', kid: this.opts.keyId, typ: 'JWT' }));
    const payload = b64url(
      JSON.stringify({ iss: this.opts.issuerId, iat: nowS, exp: nowS + TOKEN_LIFETIME_S, aud: 'appstoreconnect-v1' }),
    );
    const signer = createSign('SHA256');
    signer.update(`${header}.${payload}`);
    const sig = signer.sign({ key: createPrivateKey(pem), dsaEncoding: 'ieee-p1363' });
    const value = `${header}.${payload}.${b64url(sig)}`;
    this.token = { value, issuedAt: nowS };
    return value;
  }

  // ---- JSON:API transport ----------------------------------------------------

  async request(method: string, pathOrUrl: string, body?: unknown): Promise<Json> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
    // The bearer token only ever goes to Apple (guards against a foreign `links.next`).
    if (!url.startsWith(`${BASE_URL}/`)) throw new AppStoreConnectError(`Refusing to call non-Apple URL ${url}`, 0);
    for (let attempt = 0; ; attempt++) {
      const res = await this.doFetch(url, {
        method,
        headers: {
          authorization: `Bearer ${await this.bearer()}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        // The bearer token must never follow a redirect to another host.
        redirect: 'error',
      });
      // POSTs retry on 429 only: a 5xx may have created the resource, so surface it (the next sync finds or creates).
      const retryable = res.status === 429 || (res.status >= 500 && method !== 'POST');
      if (retryable && attempt < MAX_RETRIES) {
        // Drain the body so the connection is released before waiting.
        await res.text().catch(() => '');
        const retryAfter = Number(res.headers.get('retry-after'));
        const delay =
          retryAfter > 0 ? Math.min(retryAfter, MAX_RETRY_AFTER_S) * 1000 : this.baseDelayMs * 2 ** attempt;
        await this.sleep(delay);
        continue;
      }
      const text = await res.text();
      let json: Json = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          if (res.ok) throw new AppStoreConnectError(`App Store Connect ${method} ${url.replace(BASE_URL, '')} returned an unparsable body (${res.status})`, res.status);
          json = {};
        }
      }
      if (!res.ok) {
        const details = Array.isArray(json.errors)
          ? json.errors.map((e: Json) => e.detail ?? e.title ?? e.code).filter(Boolean).join('; ')
          : text.slice(0, 200);
        throw new AppStoreConnectError(`App Store Connect ${method} ${url.replace(BASE_URL, '')} failed (${res.status}): ${details}`, res.status);
      }
      return json;
    }
  }

  /** GET following `links.next` until exhausted. */
  async listAll(path: string): Promise<Json[]> {
    const out: Json[] = [];
    let next: string | undefined = path;
    while (next) {
      const page: Json = await this.request('GET', next);
      out.push(...(page.data ?? []));
      next = page.links?.next;
    }
    return out;
  }

  // ---- in-app purchases ----------------------------------------------------------

  async findIapByProductId(productId: string) {
    const rows = await this.listAll(
      `/v1/apps/${this.opts.appAppleId}/inAppPurchasesV2?filter[productId]=${encodeURIComponent(productId)}&limit=200`,
    );
    const hit = rows.find((r) => r.attributes?.productId === productId);
    return hit ? { id: String(hit.id), state: (hit.attributes?.state as string) ?? null } : null;
  }

  async createConsumable(args: { productId: string; name: string; reviewNote: string }) {
    const res = await this.request('POST', '/v2/inAppPurchases', {
      data: {
        type: 'inAppPurchases',
        attributes: {
          name: args.name,
          productId: args.productId,
          inAppPurchaseType: 'CONSUMABLE',
          reviewNote: args.reviewNote,
        },
        relationships: { app: { data: { type: 'apps', id: this.opts.appAppleId } } },
      },
    });
    return { id: String(res.data.id) };
  }

  async setIapLocalizations(iapId: string, localizations: LocalizationInput[]) {
    const existing = await this.listAll(`/v2/inAppPurchases/${iapId}/inAppPurchaseLocalizations?limit=200`);
    for (const l of localizations) {
      const row = existing.find((e) => e.attributes?.locale === l.locale);
      if (row) {
        await this.request('PATCH', `/v1/inAppPurchaseLocalizations/${row.id}`, {
          data: { type: 'inAppPurchaseLocalizations', id: row.id, attributes: { name: l.name, description: l.description } },
        });
      } else {
        await this.request('POST', '/v1/inAppPurchaseLocalizations', {
          data: {
            type: 'inAppPurchaseLocalizations',
            attributes: { locale: l.locale, name: l.name, description: l.description },
            relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iapId } } },
          },
        });
      }
    }
  }

  async uaePricePoints(id: string, kind: PricePointKind): Promise<PricePoint[]> {
    const path =
      kind === 'iap'
        ? `/v2/inAppPurchases/${id}/pricePoints?filter[territory]=${TERRITORY}&limit=200`
        : `/v1/subscriptions/${id}/pricePoints?filter[territory]=${TERRITORY}&limit=200`;
    const rows = await this.listAll(path);
    return rows
      .map((r) => ({ id: String(r.id), customerPrice: Number(r.attributes?.customerPrice) }))
      .filter((p) => Number.isFinite(p.customerPrice));
  }

  async setIapPrice(iapId: string, pricePointId: string) {
    await this.request('POST', '/v1/inAppPurchasePriceSchedules', {
      data: {
        type: 'inAppPurchasePriceSchedules',
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: iapId } },
          baseTerritory: { data: { type: 'territories', id: TERRITORY } },
          manualPrices: { data: [{ type: 'inAppPurchasePrices', id: MANUAL_PRICE_LOCAL_ID }] },
        },
      },
      included: [
        {
          type: 'inAppPurchasePrices',
          id: MANUAL_PRICE_LOCAL_ID,
          attributes: { startDate: null },
          relationships: {
            inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iapId } },
            inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: pricePointId } },
          },
        },
      ],
    });
  }

  async currentIapPrice(iapId: string): Promise<string | null> {
    let scheduleId: string;
    try {
      const sched = await this.request('GET', `/v2/inAppPurchases/${iapId}/iapPriceSchedule`);
      if (!sched.data?.id) return null;
      scheduleId = String(sched.data.id);
    } catch (e) {
      if (e instanceof AppStoreConnectError && e.status === 404) return null;
      throw e;
    }
    const rows = await this.listAll(
      `/v1/inAppPurchasePriceSchedules/${scheduleId}/manualPrices?filter[territory]=${TERRITORY}&include=inAppPurchasePricePoint&limit=200`,
    );
    return activePricePointId(rows, 'inAppPurchasePricePoint', this.now());
  }

  async currentSubscriptionPrice(subscriptionId: string): Promise<string | null> {
    const rows = await this.listAll(
      `/v1/subscriptions/${subscriptionId}/prices?filter[territory]=${TERRITORY}&include=subscriptionPricePoint&limit=200`,
    );
    return activePricePointId(rows, 'subscriptionPricePoint', this.now());
  }

  // ---- subscriptions -----------------------------------------------------------------

  async findSubscriptionGroup(referenceName: string) {
    const rows = await this.listAll(
      `/v1/apps/${this.opts.appAppleId}/subscriptionGroups?filter[referenceName]=${encodeURIComponent(referenceName)}&limit=200`,
    );
    const hit = rows.find((r) => r.attributes?.referenceName === referenceName);
    return hit ? { id: String(hit.id) } : null;
  }

  async createSubscriptionGroup(referenceName: string) {
    const res = await this.request('POST', '/v1/subscriptionGroups', {
      data: {
        type: 'subscriptionGroups',
        attributes: { referenceName },
        relationships: { app: { data: { type: 'apps', id: this.opts.appAppleId } } },
      },
    });
    return { id: String(res.data.id) };
  }

  async findSubscriptionByProductId(productId: string) {
    const groups = await this.listAll(`/v1/apps/${this.opts.appAppleId}/subscriptionGroups?limit=200`);
    for (const g of groups) {
      const subs = await this.listAll(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=200`);
      const hit = subs.find((s) => s.attributes?.productId === productId);
      if (hit) return { id: String(hit.id), state: (hit.attributes?.state as string) ?? null };
    }
    return null;
  }

  async createSubscription(args: {
    groupId: string;
    productId: string;
    name: string;
    period: SubscriptionPeriod;
    groupLevel: number;
  }) {
    const res = await this.request('POST', '/v1/subscriptions', {
      data: {
        type: 'subscriptions',
        attributes: {
          name: args.name,
          productId: args.productId,
          subscriptionPeriod: args.period,
          groupLevel: args.groupLevel,
        },
        relationships: { group: { data: { type: 'subscriptionGroups', id: args.groupId } } },
      },
    });
    return { id: String(res.data.id) };
  }

  async setSubscriptionLocalizations(subscriptionId: string, localizations: LocalizationInput[]) {
    const existing = await this.listAll(`/v1/subscriptions/${subscriptionId}/subscriptionLocalizations?limit=200`);
    for (const l of localizations) {
      const row = existing.find((e) => e.attributes?.locale === l.locale);
      if (row) {
        await this.request('PATCH', `/v1/subscriptionLocalizations/${row.id}`, {
          data: { type: 'subscriptionLocalizations', id: row.id, attributes: { name: l.name, description: l.description } },
        });
      } else {
        await this.request('POST', '/v1/subscriptionLocalizations', {
          data: {
            type: 'subscriptionLocalizations',
            attributes: { locale: l.locale, name: l.name, description: l.description },
            relationships: { subscription: { data: { type: 'subscriptions', id: subscriptionId } } },
          },
        });
      }
    }
  }

  async setSubscriptionPrice(subscriptionId: string, pricePointId: string) {
    await this.request('POST', '/v1/subscriptionPrices', {
      data: {
        type: 'subscriptionPrices',
        attributes: { startDate: null, preserveCurrentPrice: true },
        relationships: {
          subscription: { data: { type: 'subscriptions', id: subscriptionId } },
          subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pricePointId } },
        },
      },
    });
  }
}

/** Price point of the entry in effect now: the latest startDate that is null or not in the future. */
function activePricePointId(rows: Json[], relationship: string, nowMs: number): string | null {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  let best: { start: string; id: string } | null = null;
  for (const r of rows) {
    const start: string = r.attributes?.startDate ?? '';
    const id = r.relationships?.[relationship]?.data?.id;
    if (!id || start > today) continue;
    if (!best || start >= best.start) best = { start, id: String(id) };
  }
  return best?.id ?? null;
}
