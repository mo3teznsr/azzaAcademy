import { describe, expect, test } from 'bun:test';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { AppStoreConnectClient } from '../src/infrastructure/appstore/app-store-connect-client';
import { AppStoreSyncService, fitDisplayName, nearestPricePoint } from '../src/modules/appstore-sync/appstore-sync.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { InMemoryAppStoreCatalog } from './fakes/in-memory-appstore';

const prices = new PriceCalculator(5);
const make = () => {
  const catalog = new InMemoryAppStoreCatalog();
  return { catalog, svc: new AppStoreSyncService(catalog, prices) };
};

describe('nearestPricePoint', () => {
  const pts = [
    { id: 'a', customerPrice: 459.99 },
    { id: 'b', customerPrice: 472.99 },
  ];
  test('picks 472.99 over 459.99 for a 472.50 target', () => {
    expect(nearestPricePoint(pts, 47_250)?.id).toBe('b');
  });
  test('ties go to the lower point', () => {
    expect(nearestPricePoint([{ id: 'hi', customerPrice: 11 }, { id: 'lo', customerPrice: 9 }], 1000)?.id).toBe('lo');
  });
  test('empty list gives null', () => {
    expect(nearestPricePoint([], 100)).toBeNull();
  });
});

describe('syncSeatPrice', () => {
  test('creates a missing consumable once; a second run makes no create call', async () => {
    const { catalog, svc } = make();
    const r1 = await svc.syncSeatPrice(45_000); // AED 450 -> 472.50 incl. VAT
    expect(r1.status).toBe('SYNCED');
    expect(catalog.count('createConsumable')).toBe(1);
    expect(catalog.iaps.has('com.futuretech.azza.seat.aed450')).toBe(true);
    const id = catalog.iaps.get('com.futuretech.azza.seat.aed450')!.id;
    expect(catalog.prices.get(id)).toBe('pp-472.99');
    expect(catalog.localizations.get(id)?.map((l) => l.name)).toEqual(['Class seat', 'مقعد في صفّ']);
    const r2 = await svc.syncSeatPrice(45_000);
    expect(r2.status).toBe('SYNCED');
    expect(catalog.count('createConsumable')).toBe(1);
  });

  test('a non-whole-dirham price is skipped with a reason', async () => {
    const { catalog, svc } = make();
    const r = await svc.syncSeatPrice(45_050);
    expect(r.status).toBe('SKIPPED');
    expect(r.detail).toContain('whole');
    expect(catalog.calls).toEqual([]);
  });

  test('an unchanged price is not re-posted, a changed target price re-prices without re-creating', async () => {
    const { catalog, svc } = make();
    await svc.syncSeatPrice(45_000);
    await svc.syncSeatPrice(45_000);
    expect(catalog.count('createConsumable')).toBe(1);
    expect(catalog.count('setIapPrice')).toBe(1); // unchanged price: no second call
    // the price point list changes under a new target: same product re-priced
    catalog.points = [{ id: 'new', customerPrice: 472.5 }];
    await svc.syncSeatPrice(45_000);
    expect(catalog.count('createConsumable')).toBe(1);
    const id = catalog.iaps.get('com.futuretech.azza.seat.aed450')!.id;
    expect(catalog.prices.get(id)).toBe('new');
  });

  test('failures are reported, not thrown', async () => {
    const { catalog, svc } = make();
    catalog.createConsumable = async () => {
      throw new Error('boom');
    };
    expect(await svc.syncSeatPrice(10_000)).toEqual({ status: 'FAILED', detail: 'boom' });
  });
});

describe('syncRecordedCourse', () => {
  const course = { slug: 'tajweed', titleEn: 'Tajweed', titleAr: 'التجويد', monthlyPriceFils: 9_000, yearlyPriceFils: 90_000 };

  test('creates one group and two subscriptions with ONE_MONTH / ONE_YEAR', async () => {
    const { catalog, svc } = make();
    const r = await svc.syncRecordedCourse(course);
    expect(r.status).toBe('SYNCED');
    expect(r.monthly).toBe('com.futuretech.azza.rec.tajweed.monthly');
    expect(r.yearly).toBe('com.futuretech.azza.rec.tajweed.yearly');
    expect([...catalog.groups.keys()]).toEqual(['rec.tajweed']);
    expect(catalog.count('createSubscriptionGroup')).toBe(1);
    expect(catalog.count('createSubscription')).toBe(2);
    const m = catalog.subs.get(r.monthly!)!;
    const y = catalog.subs.get(r.yearly!)!;
    expect(m.period).toBe('ONE_MONTH');
    expect(y.period).toBe('ONE_YEAR');
    expect(y.groupLevel).toBe(1);
    expect(m.groupLevel).toBe(2);
    expect(m.name).toBe('Tajweed · Monthly');
    expect(catalog.localizations.get(m.id)?.[1]?.name).toBe('التجويد · شهري');
    expect(catalog.localizations.get(y.id)?.[1]?.name).toBe('التجويد · سنوي');
    // 90 AED -> 94.50 incl. VAT -> 94.99; 900 AED -> 945 -> 949.99
    expect(catalog.prices.get(m.id)).toBe('pp-94.99');
    expect(catalog.prices.get(y.id)).toBe('pp-949.99');
  });

  test('is idempotent: a second run creates nothing', async () => {
    const { catalog, svc } = make();
    await svc.syncRecordedCourse(course);
    await svc.syncRecordedCourse({ ...course, monthlyPriceFils: 12_000 });
    expect(catalog.count('createSubscriptionGroup')).toBe(1);
    expect(catalog.count('createSubscription')).toBe(2);
    expect(catalog.count('setSubscriptionPrice')).toBe(3); // yearly unchanged, monthly changed
  });

  test('falls back to the English title when there is no Arabic one', async () => {
    const { catalog, svc } = make();
    const r = await svc.syncRecordedCourse({ ...course, titleAr: null });
    const m = catalog.subs.get(r.monthly!)!;
    expect(catalog.localizations.get(m.id)?.[1]?.name).toBe('Tajweed · شهري');
  });
});

describe('fitDisplayName', () => {
  test('short titles are untouched', () => {
    expect(fitDisplayName('Tajweed', 'Monthly')).toBe('Tajweed · Monthly');
  });
  test('a long English title is cut with an ellipsis, suffix intact, within 30', () => {
    const n = fitDisplayName('Advanced Quranic Recitation and Memorisation', 'Yearly');
    expect(n.endsWith('… · Yearly')).toBe(true);
    expect([...n].length).toBeLessThanOrEqual(30);
  });
  test('a long Arabic title is cut with an ellipsis, suffix intact, within 30', () => {
    const n = fitDisplayName('أحكام التجويد المتقدمة وفن الإلقاء والترتيل للمبتدئين', 'شهري');
    expect(n.endsWith('… · شهري')).toBe(true);
    expect([...n].length).toBeLessThanOrEqual(30);
  });
  test('the service sends the truncated names', async () => {
    const { catalog, svc } = make();
    const r = await svc.syncRecordedCourse({ slug: 'l', titleEn: 'A very long course title that overflows', titleAr: 'عنوان دورة طويل جدا يتجاوز الحد المسموح به', monthlyPriceFils: 9_000, yearlyPriceFils: 90_000 });
    for (const l of catalog.localizations.get(catalog.subs.get(r.monthly!)!.id)!) expect([...l.name].length).toBeLessThanOrEqual(30);
    expect(catalog.subs.get(r.monthly!)!.name.length).toBeLessThanOrEqual(30);
  });
  test('an empty slug is skipped before any product id is built', async () => {
    const { catalog, svc } = make();
    expect((await svc.syncRecordedCourse({ slug: '', titleEn: 'x', monthlyPriceFils: 1, yearlyPriceFils: 1 })).status).toBe('SKIPPED');
    expect(catalog.calls).toEqual([]);
  });
});

describe('price change detection', () => {
  test('unchanged recorded prices make no price call on a second sync', async () => {
    const { catalog, svc } = make();
    const c = { slug: 's', titleEn: 'S', monthlyPriceFils: 9_000, yearlyPriceFils: 90_000 };
    await svc.syncRecordedCourse(c);
    await svc.syncRecordedCourse(c);
    expect(catalog.count('setSubscriptionPrice')).toBe(2);
  });
  test('a subscription price change posts once, preserving current subscribers', async () => {
    const { catalog, svc } = make();
    const c = { slug: 's', titleEn: 'S', monthlyPriceFils: 9_000, yearlyPriceFils: 90_000 };
    await svc.syncRecordedCourse(c);
    await svc.syncRecordedCourse({ ...c, monthlyPriceFils: 12_000 });
    expect(catalog.count('setSubscriptionPrice')).toBe(3);
    expect(catalog.preserveFlags.every(Boolean)).toBe(true);
  });
});

describe('AppStoreConnectClient', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers });

  function client(responses: Response[], extra: Partial<ConstructorParameters<typeof AppStoreConnectClient>[0]> = {}) {
    const seen: { url: string; init: RequestInit }[] = [];
    const sleeps: number[] = [];
    const queue = [...responses];
    const c = new AppStoreConnectClient({
      issuerId: 'issuer-1',
      keyId: 'KEY123',
      privateKey: pem,
      appAppleId: '6758939735',
      fetch: (async (url: string, init: RequestInit) => {
        seen.push({ url, init });
        return queue.shift() ?? json(500, {});
      }) as unknown as typeof fetch,
      sleep: async (ms) => void sleeps.push(ms),
      ...extra,
    });
    return { c, seen, sleeps };
  }

  test('retries a 429 with exponential back-off, then succeeds', async () => {
    const { c, seen, sleeps } = client([json(429, {}), json(503, {}), json(200, { data: [] })]);
    expect(await c.request('GET', '/v1/apps')).toEqual({ data: [] });
    expect(seen.length).toBe(3);
    expect(sleeps).toEqual([500, 1000]);
  });

  test('a 5xx POST is not retried; Retry-After is capped at 60s', async () => {
    const a = client([json(503, { errors: [{ detail: 'down' }] })]);
    await expect(a.c.createConsumable({ productId: 'x', name: 'n', reviewNote: 'r' })).rejects.toThrow('down');
    expect(a.seen.length).toBe(1);
    const b = client([json(429, {}, { 'retry-after': '3600' }), json(200, { data: [] })]);
    await b.c.request('GET', '/v1/apps');
    expect(b.sleeps).toEqual([60_000]);
  });

  test('never sends the token to a non-Apple URL, and rejects an unparsable 2xx body', async () => {
    const a = client([]);
    await expect(a.c.request('GET', 'https://evil.example/next')).rejects.toThrow('non-Apple');
    expect(a.seen.length).toBe(0);
    const b = client([new Response('<html>', { status: 200 })]);
    await expect(b.c.request('GET', '/v1/apps')).rejects.toThrow('unparsable');
  });

  test('gives up after 3 retries and honours Retry-After', async () => {
    const r = () => json(429, { errors: [{ detail: 'slow down' }] }, { 'retry-after': '2' });
    const { c, seen, sleeps } = client([r(), r(), r(), r()]);
    await expect(c.request('GET', '/v1/apps')).rejects.toThrow('slow down');
    expect(seen.length).toBe(4);
    expect(sleeps).toEqual([2000, 2000, 2000]);
  });

  test('surfaces 4xx error details without retrying', async () => {
    const { c, seen } = client([json(409, { errors: [{ detail: 'productId already exists' }] })]);
    await expect(c.createConsumable({ productId: 'x', name: 'n', reviewNote: 'r' })).rejects.toThrow(
      'productId already exists',
    );
    expect(seen.length).toBe(1);
  });

  test('signs a verifiable ES256 JWT and caches it for ~15 minutes', async () => {
    let t = 1_700_000_000_000;
    const { c } = client([], { now: () => t });
    const jwt = await c.bearer();
    const [h, p, s] = jwt.split('.');
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString())).toMatchObject({ alg: 'ES256', kid: 'KEY123', typ: 'JWT' });
    const payload = JSON.parse(Buffer.from(p!, 'base64url').toString());
    expect(payload).toMatchObject({ iss: 'issuer-1', aud: 'appstoreconnect-v1' });
    expect(payload.exp - payload.iat).toBe(1200);
    const ok = createVerify('SHA256')
      .update(`${h}.${p}`)
      .verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s!, 'base64url'));
    expect(ok).toBe(true);
    t += 14 * 60_000;
    expect(await c.bearer()).toBe(jwt);
    t += 2 * 60_000;
    expect(await c.bearer()).not.toBe(jwt);
  });

  test('subscription price posts preserveCurrentPrice true', async () => {
    const { c, seen } = client([json(201, { data: { id: 'x' } })]);
    await c.setSubscriptionPrice('sub1', 'pp1');
    expect(JSON.parse(String(seen[0]!.init.body)).data.attributes).toEqual({ startDate: null, preserveCurrentPrice: true });
  });

  test('current subscription price picks the entry in effect', async () => {
    const row = (id: string, startDate: string | null) => ({ attributes: { startDate }, relationships: { subscriptionPricePoint: { data: { id } } } });
    const { c } = client([json(200, { data: [row('old', null), row('now', '2020-01-01'), row('future', '2999-01-01')] })]);
    expect(await c.currentSubscriptionPrice('sub1')).toBe('now');
  });

  test('current IAP price is null when there is no schedule (404)', async () => {
    const { c } = client([json(404, { errors: [{ detail: 'none' }] })]);
    expect(await c.currentIapPrice('iap1')).toBeNull();
  });

  test('follows paging and parses customerPrice strings', async () => {
    const { c, seen } = client([
      json(200, { data: [{ id: 'p1', attributes: { customerPrice: '472.99' } }], links: { next: 'https://api.appstoreconnect.apple.com/next' } }),
      json(200, { data: [{ id: 'p2', attributes: { customerPrice: '459.99' } }] }),
    ]);
    expect(await c.uaePricePoints('iap1', 'iap')).toEqual([
      { id: 'p1', customerPrice: 472.99 },
      { id: 'p2', customerPrice: 459.99 },
    ]);
    expect(seen[0]!.url).toContain('/v2/inAppPurchases/iap1/pricePoints?filter[territory]=ARE');
    expect(seen[1]!.url).toBe('https://api.appstoreconnect.apple.com/next');
  });
});
