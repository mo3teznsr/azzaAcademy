import type { Fils } from './money';

/**
 * iOS seats are sold as CONSUMABLE In-App Purchase products, one per price point (not per course):
 * a batch listed at AED 880 maps to `com.futuretech.azza.seat.aed880`. The mobile app mirrors this rule
 * (lib/features/checkout/domain/apple_iap.dart) — keep them in sync.
 */
export const APPLE_SEAT_PRODUCT_PREFIX = 'com.futuretech.azza.seat.aed';

/** Product id for a list price in fils, or `null` when the price is not a whole number of dirhams. */
export function appleSeatProductId(priceFils: Fils): string | null {
  if (!Number.isInteger(priceFils) || priceFils <= 0 || priceFils % 100 !== 0) return null;
  return `${APPLE_SEAT_PRODUCT_PREFIX}${priceFils / 100}`;
}

/** Inverse of {@link appleSeatProductId}: the list price in fils, or `null` for a foreign id. */
export function priceFilsOfAppleSeatProduct(productId: string): Fils | null {
  if (!productId.startsWith(APPLE_SEAT_PRODUCT_PREFIX)) return null;
  const aed = productId.slice(APPLE_SEAT_PRODUCT_PREFIX.length);
  return /^[1-9]\d*$/.test(aed) ? Number(aed) * 100 : null;
}
