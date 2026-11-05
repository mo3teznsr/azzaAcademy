import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart' show SK2PurchaseDetails;
import 'package:in_app_purchase_storekit/store_kit_2_wrappers.dart';

import '../../../core/network/app_exception.dart';
import '../domain/apple_iap.dart';

/// Port over StoreKit 2 (`in_app_purchase`) so screens and the purchase coordinator are testable without it.
abstract class AppStoreGateway {
  Future<bool> available();

  /// `null` when the product does not exist in App Store Connect (or is not cleared for sale).
  Future<StoreProduct?> product(String productId);

  /// Starts the App Store sheet; the outcome arrives on [purchases].
  Future<void> buy(String productId, {required String appAccountToken});
  Stream<List<StorePurchase>> get purchases;

  /// Transactions bought but never finished (app killed before the server confirmed).
  Future<List<StorePurchase>> unfinished();
  Future<void> finish(StorePurchase purchase);
}

class InAppPurchaseGateway implements AppStoreGateway {
  InAppPurchase get _iap => InAppPurchase.instance;
  final _details = <String, ProductDetails>{};

  @override
  Future<bool> available() => _iap.isAvailable();

  @override
  Future<StoreProduct?> product(String productId) async {
    final res = await _iap.queryProductDetails({productId});
    final d = res.productDetails.where((p) => p.id == productId).firstOrNull;
    if (d == null) return null;
    _details[productId] = d;
    return StoreProduct(id: d.id, title: d.title, price: d.price);
  }

  @override
  Future<void> buy(String productId, {required String appAccountToken}) async {
    final d = _details[productId];
    if (d == null) throw const AppException('APPLE_PRODUCT_UNAVAILABLE', 'This product is not available in the App Store.');
    // StoreKit 2 stores `applicationUserName` as the transaction's appAccountToken (must be a UUID).
    await _iap.buyConsumable(purchaseParam: PurchaseParam(productDetails: d, applicationUserName: appAccountToken));
  }

  @override
  Stream<List<StorePurchase>> get purchases => _iap.purchaseStream.map((list) => list.map(_fromDetails).toList());

  @override
  Future<List<StorePurchase>> unfinished() async {
    final txs = await SK2Transaction.unfinishedTransactions();
    return [
      for (final t in txs)
        if ((t.receiptData ?? '').isNotEmpty)
          StorePurchase(
            productId: t.productId,
            status: StorePurchaseStatus.restored,
            transactionId: t.id,
            signedTransaction: t.receiptData!,
            appAccountToken: t.appAccountToken,
            needsFinish: true,
          ),
    ];
  }

  @override
  Future<void> finish(StorePurchase purchase) async {
    final handle = purchase.handle;
    if (handle is PurchaseDetails) return _iap.completePurchase(handle);
    final id = int.tryParse(purchase.transactionId ?? '');
    if (id != null) await SK2Transaction.finish(id);
  }

  static StorePurchase _fromDetails(PurchaseDetails d) => StorePurchase(
        productId: d.productID,
        status: switch (d.status) {
          PurchaseStatus.pending => StorePurchaseStatus.pending,
          PurchaseStatus.purchased => StorePurchaseStatus.purchased,
          PurchaseStatus.restored => StorePurchaseStatus.restored,
          PurchaseStatus.canceled => StorePurchaseStatus.cancelled,
          PurchaseStatus.error => StorePurchaseStatus.error,
        },
        transactionId: d.purchaseID,
        signedTransaction: d.verificationData.serverVerificationData,
        appAccountToken: d is SK2PurchaseDetails ? d.appAccountToken : null,
        errorMessage: d.error?.message,
        needsFinish: d.pendingCompletePurchase,
        handle: d,
      );
}

final appStoreGatewayProvider = Provider<AppStoreGateway>((ref) => InAppPurchaseGateway());

/// The StoreKit product for an id; `null` = not sold in the App Store.
final appStoreProductProvider = FutureProvider.autoDispose.family<StoreProduct?, String>(
  (ref, productId) => ref.watch(appStoreGatewayProvider).product(productId),
);
