import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/data/reviews_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/catalog/presentation/course_detail_screen.dart';
import 'package:azza/features/checkout/data/app_store_gateway.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/apple_iap.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/subscriptions/data/subscription_repository.dart';
import 'package:azza/features/subscriptions/domain/subscription_models.dart';
import 'package:azza/features/subscriptions/presentation/all_access_screen.dart';
import 'package:azza/router/routes.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

const _allMonthly = 'com.futuretech.azza.rec.all_access.monthly';
const _allYearly = 'com.futuretech.azza.rec.all_access.yearly';

const _onSale = AllAccessPlan(enabled: true, monthlyPriceFils: 9900, yearlyPriceFils: 99000, courseCount: 12);
const _onSaleIos = AllAccessPlan(enabled: true, monthlyPriceFils: 9900, yearlyPriceFils: 99000, courseCount: 12, appleMonthly: _allMonthly, appleYearly: _allYearly);

const _recorded = Course(
  id: 'rec',
  slug: 'photo-basics',
  titleEn: 'Photography Basics',
  type: CourseType.recorded,
  priceFils: 4900,
  monthlyPriceFils: 4900,
  yearlyPriceFils: 49000,
);

MySubscription _allAccessSub({bool access = true}) => MySubscription(
      id: 'sub-all',
      courseId: allAccessId,
      courseSlug: allAccessId,
      plan: SubscriptionPlan.yearly,
      provider: SubscriptionProvider.stripe,
      status: access ? SubscriptionStatus.active : SubscriptionStatus.expired,
      currentPeriodEnd: DateTime(2027, 11, 20),
      hasAccess: access,
    );

class _FakeSubscriptions implements SubscriptionRepository {
  _FakeSubscriptions({this.plan = _onSale, this.start, this.mineList = const [], this.refuseUnlessConfirmed = false});
  AllAccessPlan plan;
  SubscribeStart? start;
  List<MySubscription> mineList;

  /// Answers ALL_ACCESS_ACTIVE like the API until the call confirms.
  bool refuseUnlessConfirmed;
  final subscribed = <(String, SubscriptionPlan, SubscribeMethod, bool)>[];

  @override
  Future<SubscribeStart> subscribe(String courseId, SubscriptionPlan plan, SubscribeMethod method, {bool confirmAllAccess = false}) async {
    subscribed.add((courseId, plan, method, confirmAllAccess));
    if (refuseUnlessConfirmed && !confirmAllAccess) {
      throw const AppException('ALL_ACCESS_ACTIVE', 'Your all-access plan already opens this course', statusCode: 409, details: {'currentPeriodEnd': '2027-11-20T10:00:00.000Z', 'cancelAtPeriodEnd': false});
    }
    return start!;
  }

  @override
  Future<AllAccessPlan> allAccessPlan() async => plan;
  @override
  Future<SubscriptionLookup> byReference(String reference) async => const SubscriptionLookup(status: SubscriptionStatus.incomplete);
  @override
  Future<List<MySubscription>> mine() async => mineList;
  @override
  Future<void> cancel(String id) async {}
  @override
  Future<void> resume(String id) async {}
  @override
  Future<void> switchPlan(String id, SubscriptionPlan plan) async {}
  @override
  Future<String> switchToCard(String id) async => '';
  @override
  Future<String> portalUrl(String id) async => '';
  @override
  Future<void> verifyApple(String signedTransaction) async {}
  @override
  Future<void> submitReceipt(String paymentId, PickedFile file) async {}
}

List<Override> _common(_FakeSubscriptions repo, {List<String>? opened, FakeAppStoreGateway? gateway}) => [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: [_recorded])),
      reviewsRepositoryProvider.overrideWithValue(FakeReviewsRepository()),
      fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
      subscriptionRepositoryProvider.overrideWithValue(repo),
      checkoutPageOpenerProvider.overrideWithValue((url) async {
        opened?.add(url);
        return true;
      }),
      appStoreGatewayProvider.overrideWithValue(gateway ?? FakeAppStoreGateway()),
    ];

Future<GoRouter> _pump(WidgetTester tester, List<Override> overrides, {String at = '/all-access'}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(initialLocation: at, routes: [
    GoRoute(path: '/all-access', builder: (_, _) => const AllAccessScreen()),
    GoRoute(path: '/courses/:id', builder: (_, s) => CourseDetailScreen(courseId: s.pathParameters['id']!)),
    GoRoute(path: '/learn/recorded/return', builder: (_, s) => Scaffold(body: Text('return:${s.uri.queryParameters['ref']}'))),
    GoRoute(path: '/me/plans', builder: (_, _) => const Scaffold(body: Text('plans'))),
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
  return router;
}

Future<void> _tap(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await settle(tester, 2);
  await tester.tap(f);
  await settle(tester, 10);
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
  group('all-access logic', () {
    test('GET /all-access parses, and is on sale only switched on with both prices', () {
      final p = AllAccessPlan.fromJson({
        'enabled': true,
        'monthlyPriceFils': 9900,
        'yearlyPriceFils': 99000,
        'courseCount': 12,
        'appleProducts': {'monthly': _allMonthly, 'yearly': null},
      });
      expect(p.onSale, isTrue);
      expect(p.courseCount, 12);
      expect(p.appleMonthly, _allMonthly);
      expect(p.appleYearly, isNull);
      expect(AllAccessPlan.fromJson({'enabled': true, 'monthlyPriceFils': 9900, 'appleProducts': null}).onSale, isFalse);
      expect(const AllAccessPlan(enabled: false, monthlyPriceFils: 1, yearlyPriceFils: 2).onSale, isFalse);
    });

    test('the screen shows a live plan first, then the offer, else nothing to buy', () {
      expect(allAccessView(_onSale, _allAccessSub()), AllAccessView.owned);
      expect(allAccessView(const AllAccessPlan(enabled: false), _allAccessSub()), AllAccessView.owned);
      expect(allAccessView(_onSale, _allAccessSub(access: false)), AllAccessView.onSale);
      expect(allAccessView(_onSale, null), AllAccessView.onSale);
      expect(allAccessView(const AllAccessPlan(enabled: false), null), AllAccessView.unavailable);
    });

    test('as a course it carries the all-access id, prices and App Store products', () {
      final c = allAccessAsCourse(_onSaleIos);
      expect(c.id, allAccessId);
      expect(c.isRecorded, isTrue);
      expect(c.monthlyPriceFils, 9900);
      expect(c.appleProducts?.forPlan(SubscriptionPlan.yearly), _allYearly);
      expect(allAccessAsCourse(_onSale).appleProducts, isNull);
      expect(isAppleSubscriptionProduct(_allMonthly), isTrue);
    });

    test('the all-access id never opens a course page', () {
      expect(Routes.course(allAccessId), Routes.allAccess);
      expect(Routes.course('photo-basics'), '/courses/photo-basics');
      expect(Routes.isAllAccessCoursePath('/courses/_all-access'), isTrue);
      expect(Routes.isAllAccessCoursePath('/student/explore/courses/_all-access/lessons'), isTrue);
      expect(Routes.isAllAccessCoursePath('/courses/all-access-photography'), isFalse);
      expect(notificationRoute('PLAN_WINBACK', {'courseSlug': allAccessId}), '/all-access');
      expect(notificationRoute('LEARNING_NUDGE', {'courseSlug': allAccessId}), '/all-access');
      expect(notificationRoute('PLAN_WINBACK', {'courseSlug': 'photo-basics'}), '/courses/photo-basics');
    });
  });

  group('All courses screen', () {
    testWidgets('on Android it shows the price, what is included and buys by card through the all-access id', (tester) async {
      await _on(TargetPlatform.android, () async {
        final opened = <String>[];
        final repo = _FakeSubscriptions(start: const StripeStart(checkoutUrl: 'https://checkout.stripe.test/all', reference: 'sub-all'));
        await _pump(tester, _common(repo, opened: opened));
        expect(find.text('Every recorded course. One plan.'), findsOneWidget);
        expect(find.byKey(const Key('all-access-count')), findsOneWidget);
        expect(find.text('Every lesson and quiz in every recorded course'), findsOneWidget);
        expect(find.byKey(const Key('method-card')), findsOneWidget);
        expect(find.byKey(const Key('method-bank')), findsOneWidget);
        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        expect(repo.subscribed, [(allAccessId, SubscriptionPlan.yearly, SubscribeMethod.stripe, false)]);
        expect(opened, ['https://checkout.stripe.test/all']);
        expect(find.text('return:sub-all'), findsOneWidget);
      });
    });

    testWidgets('on iOS without App Store products it is "Available on our website for now"', (tester) async {
      await _on(TargetPlatform.iOS, () async {
        await _pump(tester, _common(_FakeSubscriptions()));
        expect(find.byKey(const Key('plan-website-only')), findsOneWidget);
        expect(tester.widget<FilledButton>(find.byKey(const Key('plan-start'))).onPressed, isNull);
      });
    });

    testWidgets('on iOS with App Store products it buys the all-access product', (tester) async {
      await _on(TargetPlatform.iOS, () async {
        final gateway = FakeAppStoreGateway(products: {
          _allMonthly: const StoreProduct(id: _allMonthly, title: 'Monthly', price: 'AED 103.95'),
          _allYearly: const StoreProduct(id: _allYearly, title: 'Yearly', price: 'AED 1,039.50'),
        });
        final repo = _FakeSubscriptions(
          plan: _onSaleIos,
          start: const AppleStart(productId: _allYearly, appAccountToken: 'aaaaaaaa-0000-4000-8000-000000000001', reference: 'sub-all'),
        );
        await _pump(tester, _common(repo, gateway: gateway));
        expect(find.byKey(const Key('plan-website-only')), findsNothing);
        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        expect(repo.subscribed.single.$3, SubscribeMethod.appleIap);
        expect(gateway.bought, [(_allYearly, 'aaaaaaaa-0000-4000-8000-000000000001')]);
      });
    });

    testWidgets('a subscriber sees their plan as active and a way to manage it', (tester) async {
      await _on(TargetPlatform.android, () async {
        await _pump(tester, _common(_FakeSubscriptions(mineList: [_allAccessSub()])));
        expect(find.text('Your all-access plan is active'), findsOneWidget);
        expect(find.byKey(const Key('plan-continue')), findsOneWidget);
        await _tap(tester, find.byKey(const Key('all-access-manage')));
        expect(find.text('plans'), findsOneWidget);
      });
    });

    testWidgets('switched off, there is nothing to buy', (tester) async {
      await _on(TargetPlatform.android, () async {
        await _pump(tester, _common(_FakeSubscriptions(plan: const AllAccessPlan(enabled: false))));
        expect(find.byKey(const Key('all-access-unavailable')), findsOneWidget);
        expect(find.byKey(const Key('plan-start')), findsNothing);
      });
    });
  });

  group('recorded course page', () {
    testWidgets('links to All courses while the plan is on sale', (tester) async {
      await _on(TargetPlatform.android, () async {
        await _pump(tester, _common(_FakeSubscriptions()), at: '/courses/rec');
        await tester.scrollUntilVisible(find.byKey(const Key('all-access-entry')), 200,
            scrollable: find.byType(Scrollable).first);
        expect(find.byKey(const Key('all-access-entry')), findsOneWidget);
      });
    });

    testWidgets('a course the all-access plan opens shows as included, with Continue', (tester) async {
      await _on(TargetPlatform.android, () async {
        await _pump(tester, _common(_FakeSubscriptions(mineList: [_allAccessSub()])), at: '/courses/rec');
        expect(find.byKey(const Key('plan-included')), findsOneWidget);
        expect(find.byKey(const Key('plan-picker')), findsNothing);
        expect(find.byKey(const Key('all-access-entry')), findsNothing);
        expect(find.byKey(const Key('plan-continue')), findsOneWidget);
      });
    });

    testWidgets('ALL_ACCESS_ACTIVE asks first: keeping the plan buys nothing, buying anyway resends with the confirmation', (tester) async {
      await _on(TargetPlatform.android, () async {
        final opened = <String>[];
        final repo = _FakeSubscriptions(
          refuseUnlessConfirmed: true,
          start: const StripeStart(checkoutUrl: 'https://checkout.stripe.test/rec', reference: 'sub-rec'),
        );
        await _pump(tester, _common(repo, opened: opened), at: '/courses/rec');
        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        expect(find.byKey(const Key('all-access-covered')), findsOneWidget);
        expect(find.text('Your all-access plan already opens this course'), findsOneWidget);
        await tester.tap(find.byKey(const Key('all-access-covered-keep')));
        await settle(tester, 10);
        expect(opened, isEmpty);

        await tester.tap(find.byKey(const Key('plan-start')));
        await settle(tester, 10);
        await tester.tap(find.byKey(const Key('all-access-covered-buy')));
        await settle(tester, 10);
        expect(repo.subscribed.map((s) => s.$4), [false, false, true]);
        expect(opened, ['https://checkout.stripe.test/rec']);
      });
    });
  });
}
