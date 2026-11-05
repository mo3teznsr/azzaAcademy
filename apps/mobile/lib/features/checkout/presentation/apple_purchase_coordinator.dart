import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/app_exception.dart';
import '../data/app_store_gateway.dart';
import '../data/apple_iap_repository.dart';
import '../domain/apple_iap.dart';
import '../domain/checkout_models.dart';

enum ApplePurchasePhase { pending, confirming, paid, cancelled, failed, retryLater, rejected }

/// What happened to an App Store purchase, for the screen showing it (matched by [productId]).
@immutable
class ApplePurchaseEvent {
  const ApplePurchaseEvent(this.productId, this.phase, {this.order, this.message});
  final String productId;
  final ApplePurchasePhase phase;
  final Order? order;
  final String? message;
}

/// Owns the StoreKit transaction stream for the whole app (iOS only):
/// purchased → `POST /payments/apple/verify` → finish the transaction only after the server confirmed.
/// On start it also re-posts transactions left unfinished by a killed app, so a paid seat is never lost.
class AppleIapCoordinator {
  AppleIapCoordinator(this._store, this._repo, {bool? enabled}) : _enabled = enabled ?? usesAppStorePayments;

  final AppStoreGateway _store;
  final AppleIapRepository _repo;
  final bool _enabled;
  final _events = StreamController<ApplePurchaseEvent>.broadcast();
  final _inFlight = <String>{};
  final _orderByToken = <String, String>{};
  StreamSubscription<List<StorePurchase>>? _sub;
  Future<void>? _restore;

  Stream<ApplePurchaseEvent> get events => _events.stream;

  /// Idempotent. Call once a student is signed in (verification needs the session).
  Future<void> start() {
    if (!_enabled) return Future.value();
    _sub ??= _store.purchases.listen((list) async {
      for (final p in list) {
        await _handle(p);
      }
    }, onError: (Object _) {});
    return _restore ??= _restoreUnfinished();
  }

  Future<void> _restoreUnfinished() async {
    try {
      for (final p in await _store.unfinished()) {
        await _settle(p);
      }
    } catch (e) {
      debugPrint('[iap] restore failed: $e');
      _restore = null; // try again on the next start()
    }
  }

  /// Opens the App Store sheet for an APPLE_IAP order; the outcome arrives on [events].
  Future<void> buy(Order order) async {
    final productId = order.appleProductId;
    final token = order.appleAppAccountToken;
    if (productId == null || token == null) throw const AppException('APPLE_PRODUCT_UNAVAILABLE', 'This order is not paid through the App Store.');
    await start();
    _orderByToken[token.toLowerCase()] = order.id;
    await _store.buy(productId, appAccountToken: token);
  }

  Future<void> _handle(StorePurchase p) async {
    switch (p.status) {
      case StorePurchaseStatus.pending:
        _emit(p, ApplePurchasePhase.pending); // Ask to Buy / SCA: the approval arrives later on the stream
      case StorePurchaseStatus.cancelled:
        if (p.needsFinish) await _finish(p);
        _emit(p, ApplePurchasePhase.cancelled);
      case StorePurchaseStatus.error:
        if (p.needsFinish) await _finish(p);
        _emit(p, ApplePurchasePhase.failed, message: p.errorMessage);
      case StorePurchaseStatus.purchased:
      case StorePurchaseStatus.restored:
        await _settle(p);
    }
  }

  Future<void> _settle(StorePurchase p) async {
    final key = p.transactionId ?? p.signedTransaction;
    if (p.signedTransaction.isEmpty || !_inFlight.add(key)) return; // the stream and the restore can both deliver it
    _emit(p, ApplePurchasePhase.confirming);
    try {
      final order = await _repo.verify(orderId: _orderByToken[p.appAccountToken?.toLowerCase()], signedTransaction: p.signedTransaction);
      await _finish(p);
      _emit(p, ApplePurchasePhase.paid, order: order);
    } catch (e) {
      final err = AppException.from(e);
      final details = err.details;
      if (details is Map && details['finishTransaction'] == true) {
        // Retrying can never succeed, and an unfinished consumable blocks buying this price point again.
        await _finish(p);
        _emit(p, ApplePurchasePhase.rejected, message: err.message);
      } else {
        _inFlight.remove(key); // kept unfinished: retried on the next start / stream delivery
        _emit(p, ApplePurchasePhase.retryLater, message: err.message);
      }
    }
  }

  Future<void> _finish(StorePurchase p) async {
    try {
      await _store.finish(p);
    } catch (e) {
      debugPrint('[iap] finish failed: $e');
    }
  }

  void _emit(StorePurchase p, ApplePurchasePhase phase, {Order? order, String? message}) {
    if (!_events.isClosed) _events.add(ApplePurchaseEvent(p.productId, phase, order: order, message: message));
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    await _events.close();
  }
}

final appleIapCoordinatorProvider = Provider<AppleIapCoordinator>((ref) {
  final c = AppleIapCoordinator(ref.watch(appStoreGatewayProvider), ref.watch(appleIapRepositoryProvider));
  ref.onDispose(c.dispose);
  return c;
});
