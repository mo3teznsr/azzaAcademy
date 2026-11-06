import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/checkout/data/app_store_gateway.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/apple_iap.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/checkout/presentation/apple_purchase_coordinator.dart';
import 'package:azza/features/checkout/presentation/checkout_screen.dart';
import 'package:azza/features/checkout/presentation/order_status_screen.dart';
import 'package:azza/core/providers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

const _product = 'com.futuretech.azza.seat.aed880';

void main() {
  const course = Course(id: 'pdf', slug: 'pdf', titleEn: 'Product Design Foundations', titleAr: 'أساسيات تصميم المنتجات', priceFils: 88000);
  Batch batch({int? priceFils}) => Batch(id: 'b08', code: 'B08', courseId: 'pdf', course: course, capacity: 12, priceFils: priceFils);
  const awaiting = Order(
    id: 'o1',
    reference: 'AZ-B08-11111',
    status: OrderStatus.awaitingPayment,
    method: PaymentMethod.appleIap,
    totalFils: 92400,
    appleProductId: _product,
    appleAppAccountToken: 'aaaaaaaa-0000-4000-8000-000000000001',
  );

  group('product ids', () {
    test('mirror the API: one consumable per whole-dirham price', () {
      expect(appleSeatProductId(88000), _product);
      expect(appleSeatProductId(120000), 'com.futuretech.azza.seat.aed1200');
      expect(appleSeatProductId(88050), isNull);
      expect(appleSeatProductId(0), isNull);
    });
  });

  group('checkout screen', () {
    Future<void> pump(WidgetTester tester, {Batch? b, Map<String, StoreProduct> products = const {}}) async {
      await pumpScreen(
        tester,
        const CheckoutScreen(batchId: 'b08'),
        overrides: [
          catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(batchList: [b ?? batch()])),
          checkoutRepositoryProvider.overrideWithValue(FakeCheckoutRepository(current: awaiting)),
          checkoutPageOpenerProvider.overrideWithValue((_) async => true),
          appStoreGatewayProvider.overrideWithValue(FakeAppStoreGateway(products: products)),
        ],
      );
      await settle(tester);
    }

    testWidgets('iOS offers only the App Store, priced by StoreKit', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        await pump(tester, products: {_product: const StoreProduct(id: _product, title: 'Seat', price: 'AED 924.99')});
        expect(find.byKey(const Key('method-app-store')), findsOneWidget);
        expect(find.byKey(const Key('method-card')), findsNothing);
        expect(find.byKey(const Key('method-bank')), findsNothing);
        expect(find.textContaining('Google Pay'), findsNothing);
        expect(find.textContaining('Bank transfer'), findsNothing);
        expect(find.byType(TextField), findsNothing, reason: 'no coupon field: App Store prices are fixed');
        expect(find.text('Buy · AED 924.99'), findsOneWidget);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });

    testWidgets('iOS shows a disabled "Enrol on our website" state when the price has no product', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        await pump(tester); // StoreKit knows no product for AED 880
        expect(find.byKey(const Key('enrol-on-website')), findsOneWidget);
        expect(find.byKey(const Key('method-app-store')), findsNothing);
        final button = tester.widget<FilledButton>(find.byKey(const Key('checkout-continue')));
        expect(button.onPressed, isNull);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });

    testWidgets('fractional-dirham prices never reach StoreKit on iOS', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        await pump(tester, b: batch(priceFils: 88050), products: {_product: const StoreProduct(id: _product, title: 'Seat', price: 'AED 924.99')});
        expect(find.byKey(const Key('enrol-on-website')), findsOneWidget);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });

    testWidgets('Android keeps card and bank transfer, no App Store', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      try {
        await pump(tester, products: {_product: const StoreProduct(id: _product, title: 'Seat', price: 'AED 924.99')});
        // The price summary sits on a card now, so the payment options start lower on the page.
        await tester.scrollUntilVisible(find.byKey(const Key('method-bank')), 200, scrollable: find.byType(Scrollable).first);
        expect(find.byKey(const Key('method-card')), findsOneWidget);
        expect(find.byKey(const Key('method-bank')), findsOneWidget);
        expect(find.byKey(const Key('method-app-store')), findsNothing);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });
  });

  group('order status on iOS', () {
    Future<void> pump(WidgetTester tester, Order o) async {
      await pumpScreen(tester, const OrderStatusScreen(orderId: 'o1'), overrides: [
        checkoutRepositoryProvider.overrideWithValue(FakeCheckoutRepository(current: o)),
        realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
      ]);
      await settle(tester);
    }

    testWidgets('an unpaid App Store order offers the App Store, never a receipt upload', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        await pump(tester, awaiting);
        expect(find.byKey(const Key('order-pay-app-store')), findsOneWidget);
        await pump(tester, const Order(id: 'o1', reference: 'AZ-B08-2', status: OrderStatus.awaitingReceipt, method: PaymentMethod.bankTransfer, totalFils: 92400));
        expect(find.textContaining('Upload'), findsNothing);
        expect(find.byKey(const Key('order-pay-app-store')), findsNothing);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });
  });

  group('purchase coordinator', () {
    StorePurchase purchased({String id = '2000000123'}) => StorePurchase(
          productId: _product,
          status: StorePurchaseStatus.purchased,
          transactionId: id,
          signedTransaction: 'jws-$id',
          appAccountToken: 'AAAAAAAA-0000-4000-8000-000000000001',
          needsFinish: true,
        );

    test('finishes the transaction only after the server confirmed it', () async {
      final store = FakeAppStoreGateway(products: {_product: const StoreProduct(id: _product, title: 'Seat', price: 'AED 924.99')});
      final repo = FakeAppleIapRepository(result: awaiting);
      final c = AppleIapCoordinator(store, repo, enabled: true);
      final phases = <ApplePurchasePhase>[];
      c.events.listen((e) => phases.add(e.phase));

      await c.buy(awaiting);
      expect(store.bought.single, (_product, 'aaaaaaaa-0000-4000-8000-000000000001'));
      store.emit([purchased()]);
      await pumpEventQueue();

      expect(repo.calls.single, (orderId: 'o1', signedTransaction: 'jws-2000000123'));
      expect(store.finished, hasLength(1));
      expect(phases, [ApplePurchasePhase.confirming, ApplePurchasePhase.paid]);
      await c.dispose();
    });

    test('a network failure keeps the transaction unfinished for the next launch', () async {
      final store = FakeAppStoreGateway();
      final repo = FakeAppleIapRepository(error: const AppException('NETWORK', 'offline'));
      final c = AppleIapCoordinator(store, repo, enabled: true);
      final phases = <ApplePurchasePhase>[];
      c.events.listen((e) => phases.add(e.phase));
      await c.start();
      store.emit([purchased()]);
      await pumpEventQueue();
      expect(store.finished, isEmpty);
      expect(phases.last, ApplePurchasePhase.retryLater);
      await c.dispose();
    });

    test('a final server rejection finishes the transaction so the price point can be bought again', () async {
      final store = FakeAppStoreGateway();
      final repo = FakeAppleIapRepository(
        error: const AppException('PRODUCT_MISMATCH', 'mismatch', statusCode: 409, details: {'code': 'PRODUCT_MISMATCH', 'finishTransaction': true}),
      );
      final c = AppleIapCoordinator(store, repo, enabled: true);
      final phases = <ApplePurchasePhase>[];
      c.events.listen((e) => phases.add(e.phase));
      await c.start();
      store.emit([purchased()]);
      await pumpEventQueue();
      expect(store.finished, hasLength(1));
      expect(phases.last, ApplePurchasePhase.rejected);
      await c.dispose();
    });

    test('start re-posts unfinished transactions once, even if the stream delivers them too', () async {
      final store = FakeAppStoreGateway(pendingUnfinished: [purchased(id: '77')]);
      final repo = FakeAppleIapRepository(result: awaiting);
      final c = AppleIapCoordinator(store, repo, enabled: true);
      await c.start();
      store.emit([purchased(id: '77')]);
      await pumpEventQueue();
      await c.start();
      expect(repo.calls, hasLength(1));
      expect(repo.calls.single.signedTransaction, 'jws-77');
      expect(store.finished, hasLength(1));
      await c.dispose();
    });

    test('pending (Ask to Buy) and cancelled purchases are reported, never verified', () async {
      final store = FakeAppStoreGateway();
      final repo = FakeAppleIapRepository(result: awaiting);
      final c = AppleIapCoordinator(store, repo, enabled: true);
      final phases = <ApplePurchasePhase>[];
      c.events.listen((e) => phases.add(e.phase));
      await c.start();
      store.emit([const StorePurchase(productId: _product, status: StorePurchaseStatus.pending)]);
      store.emit([const StorePurchase(productId: _product, status: StorePurchaseStatus.cancelled, needsFinish: true)]);
      await pumpEventQueue();
      expect(phases, [ApplePurchasePhase.pending, ApplePurchasePhase.cancelled]);
      expect(repo.calls, isEmpty);
      expect(store.finished, hasLength(1));
      await c.dispose();
    });

    test('does nothing off iOS', () async {
      final store = FakeAppStoreGateway(pendingUnfinished: [purchased()]);
      final repo = FakeAppleIapRepository(result: awaiting);
      await AppleIapCoordinator(store, repo, enabled: false).start();
      expect(repo.calls, isEmpty);
    });
  });
}
