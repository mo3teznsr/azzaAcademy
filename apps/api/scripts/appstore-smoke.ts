/**
 * App Store Connect smoke check. NOT part of the tests.
 *
 *   bun scripts/appstore-smoke.ts [--price-aed 450]          read-only: looks up the app, the in-app purchases and
 *                                                            the UAE price points, and says what a sync would do
 *   bun scripts/appstore-smoke.ts [--price-aed 450] --apply  actually creates/prices that one seat product
 *
 * Needs ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY_PATH (or ASC_PRIVATE_KEY) and APPLE_APP_APPLE_ID in the
 * environment (apps/api/.env is loaded by bun). It never prints the key. Use it to confirm the API shapes the
 * sync relies on before trusting the nightly job.
 */
import { appleSeatProductId } from '@azza/shared';
import { resolveAppStoreConnect } from '../src/core/config';
import { AppStoreConnectClient } from '../src/infrastructure/appstore/app-store-connect-client';
import { AppStoreSyncService, nearestPricePoint } from '../src/modules/appstore-sync/appstore-sync.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const priceIdx = args.indexOf('--price-aed');
const priceAed = priceIdx >= 0 ? Number(args[priceIdx + 1]) : 450;
const priceFils = Math.round(priceAed * 100);

const appleId = process.env.APPLE_APP_APPLE_ID ? Number(process.env.APPLE_APP_APPLE_ID) : undefined;
const creds = resolveAppStoreConnect({
  ASC_ISSUER_ID: process.env.ASC_ISSUER_ID,
  ASC_KEY_ID: process.env.ASC_KEY_ID,
  ASC_PRIVATE_KEY_PATH: process.env.ASC_PRIVATE_KEY_PATH,
  ASC_PRIVATE_KEY: process.env.ASC_PRIVATE_KEY,
  APPLE_APP_APPLE_ID: appleId,
});
if (!creds) {
  console.error('Not configured: set ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY_PATH (or ASC_PRIVATE_KEY) and APPLE_APP_APPLE_ID.');
  process.exit(1);
}
const productId = appleSeatProductId(priceFils);
if (!productId) {
  console.error(`AED ${priceAed} is not a whole number of dirhams.`);
  process.exit(1);
}

const client = new AppStoreConnectClient({ issuerId: creds.issuerId, keyId: creds.keyId, privateKey: creds.privateKey, appAppleId: creds.appAppleId });
const vat = Number(process.env.VAT_PERCENT ?? 5);
const calc = new PriceCalculator(vat);

async function step<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  try {
    const out = await run();
    console.log(`ok    ${label}`);
    return out;
  } catch (e) {
    console.log(`FAIL  ${label}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

console.log(`${apply ? 'APPLY' : 'DRY RUN'}: seat product ${productId} (AED ${priceAed} before VAT, ${calc.inclusive(priceFils) / 100} with ${vat}% VAT)\n`);

const app = await step('GET /v1/apps/{id}', () => client.request('GET', `/v1/apps/${creds.appAppleId}`));
if (app) console.log(`      app: ${app.data?.attributes?.name} (${app.data?.attributes?.bundleId})`);

const iaps = await step('list in-app purchases', () => client.listAll(`/v1/apps/${creds.appAppleId}/inAppPurchasesV2?limit=200`));
if (iaps) console.log(`      ${iaps.length} in-app purchase(s): ${iaps.map((i) => i.attributes?.productId).join(', ') || 'none'}`);

const groups = await step('list subscription groups', () => client.listAll(`/v1/apps/${creds.appAppleId}/subscriptionGroups?limit=200`));
if (groups) console.log(`      ${groups.length} group(s): ${groups.map((g) => g.attributes?.referenceName).join(', ') || 'none'}`);

const existing = await step(`find ${productId}`, () => client.findIapByProductId(productId));
if (existing) {
  const points = await step('UAE price points', () => client.uaePricePoints(existing.id, 'iap'));
  if (points) {
    const near = nearestPricePoint(points, calc.inclusive(priceFils));
    console.log(`      ${points.length} point(s); nearest to the target: ${near ? `AED ${near.customerPrice} (${near.id})` : 'none'}`);
  }
  const current = await step('current price', () => client.currentIapPrice(existing.id));
  console.log(`      current price point: ${current ?? 'none'}`);
} else if (existing === null) {
  console.log('      (no such product yet: a sync would create it, then set its names and price)');
}

if (apply) {
  const result = await new AppStoreSyncService(client, calc).syncSeatPrice(priceFils);
  console.log(`\nsyncSeatPrice -> ${result.status}: ${result.detail}`);
  process.exit(result.status === 'FAILED' ? 1 : 0);
} else {
  console.log('\nNothing was created. Re-run with --apply to create and price this seat product.');
}
