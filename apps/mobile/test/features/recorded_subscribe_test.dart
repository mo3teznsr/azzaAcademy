import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/data/reviews_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/catalog/domain/course_filters.dart';
import 'package:azza/features/catalog/presentation/catalog_widgets.dart';
import 'package:azza/features/catalog/presentation/course_detail_screen.dart';
import 'package:azza/features/checkout/data/app_store_gateway.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/apple_iap.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/checkout/presentation/apple_purchase_coordinator.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/presentation/course_lessons_screen.dart';
import 'package:azza/features/subscriptions/data/subscription_repository.dart';
import 'package:azza/features/subscriptions/domain/subscription_models.dart';
import 'package:azza/features/subscriptions/presentation/subscribe_return_screen.dart';
import 'package:azza/features/subscriptions/presentation/plan_transfer_screen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

const _monthlyId = 'com.futuretech.azza.rec.photo-basics.monthly';
const _yearlyId = 'com.futuretech.azza.rec.photo-basics.yearly';

const _recorded = Course(
  id: 'rec',
  slug: 'photo-basics',
  titleEn: 'Photography Basics',
  type: CourseType.recorded,
  priceFils: 4900,
  monthlyPriceFils: 4900,
  yearlyPriceFils: 49000,
  previewLessonId: 'l1',
  appleProducts: AppleProducts(monthly: _monthlyId, yearly: _yearlyId),
);

final _bank = BankAccount(
  id: 'adcb',
  bankName: 'ADCB',
  accountName: 'Azza Learning FZ-LLC',
  iban: 'AE070331234567890123456',
  swift: 'ADCBAEAA',
);

/// Answers from a script and records every write.
class _FakeSubscriptions implements SubscriptionRepository {
  _FakeSubscriptions({this.start, this.statuses = const [], this.mineList = const []});
  SubscribeStart? start;
  List<SubscriptionLookup> statuses;
  List<MySubscription> mineList;

  final subscribed = <(String, SubscriptionPlan, SubscribeMethod)>[];
  final verified = <String>[];
  final receipts = <(String, PickedFile)>[];
  int lookups = 0;

  @override
  Future<SubscribeStart> subscribe(String courseId, SubscriptionPlan plan, SubscribeMethod method) async {
    subscribed.add((courseId, plan, method));
    return start!;
  }

  @override
  Future<SubscriptionLookup> byReference(String reference) async {
    final i = lookups++;
    return statuses[i < statuses.length ? i : statuses.length - 1];
  }

  @override
  Future<List<MySubscription>> mine() async => mineList;
  @override
  Future<void> cancel(String id) async {}
  @override
  Future<void> resume(String id) async {}
  @override
  Future<void> switchPlan(String id, SubscriptionPlan plan) async {}
  @override
  Future<String> switchToCard(String id) async => 'https://billing.test/checkout';
  @override
  Future<String> portalUrl(String id) async => 'https://billing.test/portal';
  Object? verifyError;
  @override
  Future<void> verifyApple(String signedTransaction) async {
    if (verifyError != null) throw verifyError!;
    verified.add(signedTransaction);
  }
  @override
  Future<void> submitReceipt(String paymentId, PickedFile file) async => receipts.add((paymentId, file));
}

class _FakeLessons implements LessonsRepository {
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async => CourseLessons.fromJson({
        'course': {'id': 'rec', 'slug': 'photo-basics', 'titleEn': 'Photography Basics'},
        'modules': [
          {
            'id': 'm1',
            'order': 1,
            'titleEn': 'Light',
            'lessons': [
              {'id': 'l1', 'moduleId': 'm1', 'order': 1, 'titleEn': 'Free lesson', 'bodyEn': 'Hello'},
              {'id': 'l2', 'moduleId': 'm1', 'order': 2, 'titleEn': 'Exposure', 'locked': true},
            ],
          },
        ],
      });
}

List<Override> _common({
  required _FakeSubscriptions repo,
  FakeAppStoreGateway? gateway,
  Course course = _recorded,
  Batch? batch,
  FakeReceiptPicker? picker,
  List<String>? openedUrls,
}) =>
    [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: [course], batchList: [?batch])),
      reviewsRepositoryProvider.overrideWithValue(FakeReviewsRepository()),
      fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
      subscriptionRepositoryProvider.overrideWithValue(repo),
      checkoutPageOpenerProvider.overrideWithValue((url) async {
        openedUrls?.add(url);
        return true;
      }),
      appStoreGatewayProvider.overrideWithValue(gateway ?? FakeAppStoreGateway()),
      receiptPickerProvider.overrideWithValue(picker ?? FakeReceiptPicker(null)),
      lessonsRepositoryProvider.overrideWithValue(_FakeLessons()),
    ];

Future<void> _pumpApp(WidgetTester tester, List<Override> overrides, {String at = '/courses/rec'}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(initialLocation: at, routes: [
    GoRoute(path: '/courses/:id', builder: (_, s) => CourseDetailScreen(courseId: s.pathParameters['id']!), routes: [
      GoRoute(path: 'lessons', builder: (_, s) => CourseLessonsScreen(courseId: s.pathParameters['id']!), routes: [
        GoRoute(path: ':lessonId', builder: (_, s) => Scaffold(body: Text('lesson:${s.pathParameters['lessonId']}'))),
      ]),
    ]),
    GoRoute(path: '/learn/recorded/return', builder: (_, s) => SubscribeReturnScreen(reference: s.uri.queryParameters['ref'] ?? '')),
    GoRoute(path: '/subscriptions/transfer/:paymentId', builder: (_, s) => PlanTransferScreen(start: s.extra! as TransferStart)),
  ]);
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [sharedPreferencesProvider.overrideWithValue(await testPrefs()), ...overrides],
    child: MaterialApp.router(
      routerConfig: router,
      theme: AzzaTheme.build(ThemeVariant.student),
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: localizationDelegates,
    ),
  ));
  await settle(tester, 10);
}

/// Scrolls the plan card into view, then taps.
Future<void> _tapKey(WidgetTester tester, String key) async {
  final f = find.byKey(Key(key));
  await tester.scrollUntilVisible(f, 200, scrollable: find.byType(Scrollable).first);
  await tester.ensureVisible(f);
  await settle(tester, 2);
  await tester.tap(f);
  await settle(tester);
}

Future<T> _on<T>(TargetPlatform platform, Future<T> Function() body) async {
  debugDefaultTargetPlatformOverride = platform;
  try {
    return await body();
  } finally {
    debugDefaultTargetPlatformOverride = null;
  }
}

void main() {
  group('models', () {
    test('yearly saving is whole months free versus twelve monthly payments', () {
      expect(yearlySavingMonths(4900, 49000), 2);
      expect(yearlySavingMonths(4900, 58800), 0);
      expect(yearlySavingMonths(0, 100), 0);
    });

    test('a recorded course reads its type, plan prices, preview lesson and Apple products', () {
      final c = Course.fromJson({
        'id': 'rec',
        'slug': 'photo-basics',
        'titleEn': 'Photography Basics',
        'type': 'RECORDED',
        'monthlyPriceFils': 4900,
        'yearlyPriceFils': 49000,
        'previewLessonId': 'l1',
        'appleProducts': {'monthly': _monthlyId, 'yearly': _yearlyId},
      });
      expect(c.type, CourseType.recorded);
      expect(c.isRecorded, isTrue);
      expect(c.previewLessonId, 'l1');
      expect(c.appleProducts?.forPlan(SubscriptionPlan.yearly), _yearlyId);
      expect(Course.fromJson({'id': 'x', 'slug': 'x', 'titleEn': 'X'}).type, CourseType.live);
    });

    test('the catalog filter sends the course type', () {
      const f = CourseFilters(type: CourseType.recorded);
      expect(f.toQuery()['type'], 'RECORDED');
      expect(f.activeCount, 1);
      expect(const CourseFilters().toQuery().containsKey('type'), isFalse);
    });

    test('subscribe answers parse per method', () {
      final stripe = SubscribeStart.parse(SubscribeMethod.stripe, {'checkoutUrl': 'https://pay.test/c', 'reference': 'r1'});
      expect((stripe as StripeStart).checkoutUrl, 'https://pay.test/c');
      final apple = SubscribeStart.parse(SubscribeMethod.appleIap, {'productId': _monthlyId, 'appAccountToken': 'tok', 'reference': 'r2'});
      expect((apple as AppleStart).appAccountToken, 'tok');
      final bank = SubscribeStart.parse(SubscribeMethod.bankTransfer, {
        'bankAccount': {'id': 'b', 'bankName': 'ADCB', 'accountName': 'Azza', 'iban': 'AE07', 'swift': 'ADCBAEAA'},
        'reference': 'AZ-REC-1',
        'amountFils': 5145,
        'expiresAt': '2026-11-09T10:00:00.000Z',
        'paymentId': 'p1',
      });
      expect((bank as TransferStart).amountFils, 5145);
      expect(bank.paymentId, 'p1');
    });
  });

  group('apple coordinator', () {
    const jws = StorePurchase(
      productId: _monthlyId,
      status: StorePurchaseStatus.restored,
      transactionId: '2000000555',
      signedTransaction: 'jws-555',
      appAccountToken: 'tok',
      needsFinish: true,
    );

    test('an unfinished plan transaction stays unfinished when verify fails, and is re-sent on the next start', () async {
      final store = FakeAppStoreGateway(pendingUnfinished: [jws]);
      final repo = _FakeSubscriptions()..verifyError = const AppException('NETWORK', 'offline');
      final c = AppleIapCoordinator(store, FakeAppleIapRepository(), enabled: true, verifySubscription: repo.verifyApple);
      await c.start();
      expect(store.finished, isEmpty);
      expect(repo.verified, isEmpty);

      repo.verifyError = null;
      final c2 = AppleIapCoordinator(store, FakeAppleIapRepository(), enabled: true, verifySubscription: repo.verifyApple);
      await c2.start();
      expect(repo.verified, ['jws-555']);
      expect(store.finished.map((p) => p.transactionId), ['2000000555']);
    });

    test('a plan product without a verifier is a wiring bug, not a seat order', () async {
      final store = FakeAppStoreGateway(pendingUnfinished: [jws]);
      final seatRepo = FakeAppleIapRepository();
      final c = AppleIapCoordinator(store, seatRepo, enabled: true);
      await c.start(); // caught inside the settle: nothing may reach the seat verify or be finished
      expect(store.finished, isEmpty);
      expect(seatRepo.calls, isEmpty);
    });

    test('a later start() on the same instance retries unfinished transactions', () async {
      final store = FakeAppStoreGateway(pendingUnfinished: [jws]);
      final repo = _FakeSubscriptions()..verifyError = const AppException('NETWORK', 'offline');
      final c = AppleIapCoordinator(store, FakeAppleIapRepository(), enabled: true, verifySubscription: repo.verifyApple);
      await c.start();
      expect(store.finished, isEmpty);
      repo.verifyError = null;
      await c.start();
      expect(repo.verified, ['jws-555']);
      expect(store.finished, hasLength(1));
    });
  });

  group('catalog', () {
    testWidgets('a recorded course carries a Recorded marker and a monthly price; a live one does not', (tester) async {
      await pumpScreen(tester, const Scaffold(body: SingleChildScrollView(child: Column(children: [
        CourseCard(course: _recorded),
        CourseCard(course: Course(id: 'live', slug: 'live', titleEn: 'Live course', priceFils: 88000)),
      ]))), overrides: [fxRatesProvider.overrideWith((ref) async => FxRates.fallback)]);
      await settle(tester);
      expect(find.byKey(const Key('recorded-marker-rec')), findsOneWidget);
      expect(find.byKey(const Key('recorded-marker-live')), findsNothing);
      expect(find.textContaining('/ month'), findsOneWidget);
    });
  });

  group('course detail', () {
    testWidgets('a recorded course shows the plan picker, not the batch picker', (tester) async {
      await _pumpApp(tester, _common(repo: _FakeSubscriptions()));
      expect(find.byKey(const Key('plan-picker')), findsOneWidget);
      expect(find.byKey(const Key('plan-monthly')), findsOneWidget);
      expect(find.byKey(const Key('plan-yearly')), findsOneWidget);
      expect(find.byKey(const Key('course-enroll')), findsNothing);
      expect(find.text('Start any time. Learn at your pace.'), findsOneWidget);
      expect(find.byKey(const Key('plan-preview')), findsOneWidget, reason: 'the free lesson');
    });

    testWidgets('a live course still goes to the batch picker', (tester) async {
      const live = Course(id: 'rec', slug: 'live', titleEn: 'Live course', priceFils: 88000);
      await _pumpApp(tester, _common(repo: _FakeSubscriptions(), course: live));
      expect(find.byKey(const Key('plan-picker')), findsNothing);
      expect(find.byKey(const Key('course-enroll')), findsOneWidget);
    });

    testWidgets('Yearly shows the saving', (tester) async {
      await _pumpApp(tester, _common(repo: _FakeSubscriptions()));
      expect(find.text('Save 2 months'), findsOneWidget);
      await _tapKey(tester, 'plan-yearly');
      expect(find.text('Save 2 months'), findsOneWidget);
      expect(find.textContaining('billed yearly'), findsOneWidget);
    });

    testWidgets('Start on Android opens the checkout URL and waits on the return screen', (tester) async {
      await _on(TargetPlatform.android, () async {
        final opened = <String>[];
        final repo = _FakeSubscriptions(
          start: const StripeStart(checkoutUrl: 'https://checkout.stripe.test/c/abc', reference: 'sub-1'),
          statuses: const [SubscriptionLookup(status: SubscriptionStatus.incomplete)],
        );
        await _pumpApp(tester, _common(repo: repo, openedUrls: opened));
        expect(find.byKey(const Key('method-card')), findsOneWidget);
        expect(find.byKey(const Key('method-bank')), findsOneWidget);
        await _tapKey(tester, 'plan-yearly');
        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        expect(opened, ['https://checkout.stripe.test/c/abc']);
        expect(repo.subscribed, [('rec', SubscriptionPlan.yearly, SubscribeMethod.stripe)]);
        expect(find.text('Setting up your access…'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
        await tester.pump(const Duration(seconds: 2));
      });
    });

    testWidgets('on iOS only the App Store is offered, priced by StoreKit, and Start buys with the token', (tester) async {
      await _on(TargetPlatform.iOS, () async {
        final gateway = FakeAppStoreGateway(products: {
          _monthlyId: const StoreProduct(id: _monthlyId, title: 'Monthly', price: 'AED 51.45'),
          _yearlyId: const StoreProduct(id: _yearlyId, title: 'Yearly', price: 'AED 514.50'),
        });
        final repo = _FakeSubscriptions(
            start: const AppleStart(productId: _monthlyId, appAccountToken: 'aaaaaaaa-0000-4000-8000-000000000009', reference: 'sub-2'),
            statuses: const [SubscriptionLookup(status: SubscriptionStatus.incomplete)]);
        await _pumpApp(tester, _common(repo: repo, gateway: gateway));
        expect(find.byKey(const Key('method-card')), findsNothing);
        expect(find.byKey(const Key('method-bank')), findsNothing);
        expect(find.textContaining('AED 51.45'), findsWidgets);

        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        expect(repo.subscribed, [('rec', SubscriptionPlan.monthly, SubscribeMethod.appleIap)]);
        expect(gateway.bought, [(_monthlyId, 'aaaaaaaa-0000-4000-8000-000000000009')]);

        // The App Store confirms: the app verifies with the server, then finishes the transaction.
        gateway.emit([
          const StorePurchase(
            productId: _monthlyId,
            status: StorePurchaseStatus.purchased,
            transactionId: '2000000777',
            signedTransaction: 'jws-777',
            appAccountToken: 'aaaaaaaa-0000-4000-8000-000000000009',
            needsFinish: true,
          ),
        ]);
        await settle(tester, 10);
        expect(repo.verified, ['jws-777']);
        expect(gateway.finished.map((p) => p.transactionId), ['2000000777']);
        expect(find.text('Setting up your access…'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
        await tester.pump(const Duration(seconds: 2));
      });
    });

    testWidgets('on iOS without App Store products the plan is "Available on our website for now"', (tester) async {
      await _on(TargetPlatform.iOS, () async {
        const noIap = Course(id: 'rec', slug: 'photo-basics', titleEn: 'Photography Basics', type: CourseType.recorded, priceFils: 4900, monthlyPriceFils: 4900, yearlyPriceFils: 49000);
        await _pumpApp(tester, _common(repo: _FakeSubscriptions(), course: noIap));
        expect(find.byKey(const Key('plan-website-only')), findsOneWidget);
        expect(find.text('Available on our website for now'), findsOneWidget);
        expect(find.byKey(const Key('method-card')), findsNothing);
        expect(find.byKey(const Key('method-bank')), findsNothing);
        expect(tester.widget<FilledButton>(find.byKey(const Key('plan-start'))).onPressed, isNull);
      });
    });

    testWidgets('bank transfer on Android shows the transfer copy, then the instructions and the receipt upload', (tester) async {
      await _on(TargetPlatform.android, () async {
        final repo = _FakeSubscriptions(
          start: TransferStart(bankAccount: _bank, reference: 'AZ-REC-4471', amountFils: 5145, expiresAt: DateTime(2026, 11, 10), paymentId: 'p1'),
        );
        final picker = FakeReceiptPicker(const PickedFile(name: 'receipt.pdf', size: 1200, bytes: [1, 2, 3]));
        await _pumpApp(tester, _common(repo: repo, picker: picker));
        await _tapKey(tester, 'method-bank');
        expect(find.text('Pay by bank transfer. Your access starts once we confirm it, usually within 1 working day.'), findsOneWidget);

        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        expect(repo.subscribed, [('rec', SubscriptionPlan.monthly, SubscribeMethod.bankTransfer)]);
        expect(find.byKey(const Key('transfer-reference')), findsOneWidget);
        expect(find.text('AZ-REC-4471'), findsOneWidget);
        expect(find.text('AED 51.45'), findsOneWidget);

        await tester.scrollUntilVisible(find.byKey(const Key('choose-receipt')), 200, scrollable: find.byType(Scrollable).first);
        await tester.ensureVisible(find.byKey(const Key('choose-receipt')));
        await settle(tester, 2);
        await tester.tap(find.byKey(const Key('choose-receipt')));
        await settle(tester);
        await tester.tap(find.byKey(const Key('sent-transfer')));
        await settle(tester, 10);
        expect(repo.receipts.map((r) => r.$1), ['p1']);
        expect(find.byKey(const Key('receipt-sent')), findsOneWidget);
      });
    });

    testWidgets('an INCOMPLETE plan (abandoned checkout) is not "ended" and Start stays normal', (tester) async {
      final sub = MySubscription.fromJson({
        'id': 's0',
        'course': {'id': 'rec', 'slug': 'photo-basics'},
        'plan': 'MONTHLY',
        'provider': 'APPLE',
        'status': 'INCOMPLETE',
        'hasAccess': false,
      });
      expect(sub.provider, SubscriptionProvider.apple);
      await _pumpApp(tester, _common(repo: _FakeSubscriptions(mineList: [sub])));
      expect(find.byKey(const Key('plan-ended')), findsNothing);
      expect(find.byKey(const Key('plan-picker')), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const Key('plan-start'))).onPressed, isNotNull);
    });

    testWidgets('an EXPIRED plan shows the ended banner', (tester) async {
      final sub = MySubscription.fromJson({
        'id': 's0', 'course': {'id': 'rec'}, 'plan': 'MONTHLY', 'provider': 'STRIPE', 'status': 'EXPIRED', 'hasAccess': false,
      });
      await _pumpApp(tester, _common(repo: _FakeSubscriptions(mineList: [sub])));
      expect(find.byKey(const Key('plan-ended')), findsOneWidget);
    });

    testWidgets('a subscriber sees their status and Continue instead of the plan picker', (tester) async {
      final sub = MySubscription(
        id: 's1',
        courseId: 'rec',
        plan: SubscriptionPlan.monthly,
        provider: SubscriptionProvider.stripe,
        status: SubscriptionStatus.active,
        currentPeriodEnd: DateTime(2026, 12, 7),
        hasAccess: true,
      );
      await _pumpApp(tester, _common(repo: _FakeSubscriptions(mineList: [sub])));
      expect(find.byKey(const Key('plan-status')), findsOneWidget);
      expect(find.textContaining('Renews'), findsOneWidget);
      expect(find.byKey(const Key('plan-continue')), findsOneWidget);
      expect(find.byKey(const Key('plan-start')), findsNothing);
    });
  });

  group('return screen', () {
    SubscriptionLookup waiting() => const SubscriptionLookup(status: SubscriptionStatus.incomplete);
    SubscriptionLookup active() => const SubscriptionLookup(status: SubscriptionStatus.active, courseSlug: 'photo-basics', nextLessonId: 'l2');

    testWidgets('shows "Setting up your access…" then opens the next lesson once ACTIVE', (tester) async {
      final repo = _FakeSubscriptions(statuses: [waiting(), waiting(), active()]);
      await _pumpApp(tester, _common(repo: repo), at: '/learn/recorded/return?ref=sub-1');
      expect(find.text('Setting up your access…'), findsOneWidget);
      expect(find.textContaining('lesson:'), findsNothing);
      for (var i = 0; i < 4; i++) {
        await tester.pump(const Duration(milliseconds: 1500));
      }
      await settle(tester);
      expect(find.text('lesson:l2'), findsOneWidget);
      expect(repo.lookups, greaterThanOrEqualTo(3));
    });

    testWidgets('after 60 seconds it says it is still processing, never a failure', (tester) async {
      final repo = _FakeSubscriptions(statuses: [waiting()]);
      await _pumpApp(tester, _common(repo: repo), at: '/learn/recorded/return?ref=sub-1');
      for (var i = 0; i < 42; i++) {
        await tester.pump(const Duration(milliseconds: 1500));
      }
      await settle(tester);
      expect(find.byKey(const Key('return-slow')), findsOneWidget);
      expect(find.text('This is taking longer than usual'), findsOneWidget);
      expect(find.textContaining('fail'), findsNothing);
      // Coming back to the app (or tapping) checks again.
      final before = repo.lookups;
      await tester.tap(find.byKey(const Key('return-check-again')));
      await settle(tester);
      expect(repo.lookups, greaterThan(before));
      await tester.pumpWidget(const SizedBox());
      await tester.pump(const Duration(seconds: 2));
    });

    testWidgets('a lookup that errors keeps trying instead of failing', (tester) async {
      final repo = _ErroringLookup([const AppException('NETWORK', 'offline')], active());
      await _pumpApp(tester, _common(repo: repo), at: '/learn/recorded/return?ref=sub-1');
      for (var i = 0; i < 4; i++) {
        await tester.pump(const Duration(milliseconds: 1500));
      }
      await settle(tester);
      expect(find.text('lesson:l2'), findsOneWidget);
    });
  });

  group('2× text', () {
    testWidgets('the plan picker, transfer screen and slow return screen do not overflow', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 2.0;
      addTearDown(tester.platformDispatcher.clearAllTestValues);
      await _on(TargetPlatform.android, () async {
        final repo = _FakeSubscriptions(
          start: TransferStart(bankAccount: _bank, reference: 'AZ-REC-4471', amountFils: 5145, expiresAt: DateTime(2026, 11, 10), paymentId: 'p1'),
          statuses: const [SubscriptionLookup(status: SubscriptionStatus.incomplete)],
        );
        await _pumpApp(tester, _common(repo: repo));
        await _tapKey(tester, 'method-bank');
        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        expect(find.byKey(const Key('transfer-reference')), findsOneWidget);
        await tester.pageBack();
        await settle(tester);
        await _pumpApp(tester, _common(repo: repo), at: '/learn/recorded/return?ref=r');
        for (var i = 0; i < 42; i++) {
          await tester.pump(const Duration(milliseconds: 1500));
        }
        expect(find.byKey(const Key('return-slow')), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
        await tester.pump(const Duration(seconds: 2));
      });
    });
  });

  group('lessons', () {
    testWidgets('locked lessons get a lock icon and a banner points at the plan', (tester) async {
      await _pumpApp(tester, _common(repo: _FakeSubscriptions()), at: '/courses/rec/lessons');
      expect(find.byKey(const Key('lesson-locked-l2')), findsOneWidget);
      expect(find.byKey(const Key('lesson-locked-l1')), findsNothing);
      expect(find.byKey(const Key('lessons-locked-banner')), findsOneWidget);
    });
  });
}

/// Fails the first lookups with [errors], then answers [last].
class _ErroringLookup extends _FakeSubscriptions {
  _ErroringLookup(this.errors, this.last);
  final List<Object> errors;
  final SubscriptionLookup last;
  int calls = 0;

  @override
  Future<SubscriptionLookup> byReference(String reference) async {
    lookups++;
    if (calls < errors.length) throw errors[calls++];
    return last;
  }
}
