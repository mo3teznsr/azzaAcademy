import 'package:flutter/foundation.dart';

/// iOS sells seats only through Apple In-App Purchase (App Store guideline 3.1.1): card and bank transfer are
/// never offered there. Honours `debugDefaultTargetPlatformOverride` so widget tests can flip it.
bool get usesAppStorePayments => !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

/// One CONSUMABLE product per price point (not per course): AED 880 → `com.futuretech.azza.seat.aed880`.
/// Mirrors `appleSeatProductId` in packages/shared/src/apple-iap.ts — keep them in sync.
const appleSeatProductPrefix = 'com.futuretech.azza.seat.aed';

/// `null` when the list price is not a whole number of dirhams (no App Store product can exist for it).
String? appleSeatProductId(int priceFils) {
  if (priceFils <= 0 || priceFils % 100 != 0) return null;
  return '$appleSeatProductPrefix${priceFils ~/ 100}';
}

/// Auto-renewable products of recorded courses: `com.futuretech.azza.rec.<courseSlug>.monthly|yearly`, one
/// subscription group per course. Mirrors `appleRecordedProductId` in packages/shared/src/subscriptions.ts.
const appleRecordedProductPrefix = 'com.futuretech.azza.rec.';

/// Whether [productId] is a recorded-course plan (settled through `/subscriptions/apple/verify`, not as a seat order).
bool isAppleSubscriptionProduct(String productId) => productId.startsWith(appleRecordedProductPrefix);

/// A StoreKit product as the App Store prices it for the user's storefront.
@immutable
class StoreProduct {
  const StoreProduct({required this.id, required this.title, required this.price});
  final String id;
  final String title;

  /// Localized, tax-inclusive price string from StoreKit (e.g. `AED 924.99`) — the only price to show for IAP.
  final String price;
}

enum StorePurchaseStatus { pending, purchased, restored, cancelled, error }

/// One StoreKit 2 transaction update.
@immutable
class StorePurchase {
  const StorePurchase({
    required this.productId,
    required this.status,
    this.transactionId,
    this.signedTransaction = '',
    this.appAccountToken,
    this.errorMessage,
    this.needsFinish = false,
    this.handle,
  });

  final String productId;
  final StorePurchaseStatus status;
  final String? transactionId;

  /// StoreKit 2 JWS (`Transaction.jwsRepresentation`) — sent to `POST /payments/apple/verify`.
  final String signedTransaction;
  final String? appAccountToken;
  final String? errorMessage;

  /// The transaction must be finished (`completePurchase`) once handled.
  final bool needsFinish;

  /// The plugin object behind this update, handed back to the gateway to finish it.
  final Object? handle;
}
