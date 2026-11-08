export type PricePointKind = 'iap' | 'subscription';
export type SubscriptionPeriod = 'ONE_MONTH' | 'ONE_YEAR';
export type AppStoreLocale = 'en-US' | 'ar-SA';

export interface PricePoint {
  id: string;
  /** Customer price in AED (VAT-inclusive, as shown on the App Store). */
  customerPrice: number;
}

export interface LocalizationInput {
  locale: AppStoreLocale;
  name: string;
  description: string;
}

/** The slice of App Store Connect that the sync needs. Territory is always ARE. */
export interface AppStoreCatalog {
  findIapByProductId(productId: string): Promise<{ id: string; state: string | null } | null>;
  createConsumable(args: { productId: string; name: string; reviewNote: string }): Promise<{ id: string }>;
  setIapLocalizations(iapId: string, localizations: LocalizationInput[]): Promise<void>;
  /** UAE (ARE) price points of an in-app purchase or a subscription. */
  uaePricePoints(id: string, kind: PricePointKind): Promise<PricePoint[]>;
  setIapPrice(iapId: string, pricePointId: string): Promise<void>;
  /** Active ARE price point id of an in-app purchase, or null when none is set. */
  currentIapPrice(iapId: string): Promise<string | null>;

  findSubscriptionGroup(referenceName: string): Promise<{ id: string } | null>;
  createSubscriptionGroup(referenceName: string): Promise<{ id: string }>;
  findSubscriptionByProductId(productId: string): Promise<{ id: string; state: string | null } | null>;
  createSubscription(args: {
    groupId: string;
    productId: string;
    name: string;
    period: SubscriptionPeriod;
    groupLevel: number;
  }): Promise<{ id: string }>;
  setSubscriptionLocalizations(subscriptionId: string, localizations: LocalizationInput[]): Promise<void>;
  /** Posts with preserveCurrentPrice: true so existing subscribers keep their price. */
  setSubscriptionPrice(subscriptionId: string, pricePointId: string): Promise<void>;
  /** Active ARE price point id of a subscription, or null when none is set. */
  currentSubscriptionPrice(subscriptionId: string): Promise<string | null>;
}
