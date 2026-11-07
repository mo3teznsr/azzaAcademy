import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/providers.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/core/widgets/price.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/checkout/presentation/checkout_screen.dart';
import 'package:azza/features/checkout/presentation/order_status_screen.dart';
import 'package:azza/features/teacher/data/batch_sessions_repository.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/presentation/batch_sessions_editor.dart';
import 'package:azza/features/teacher/presentation/course_editor_screen.dart';
import 'package:azza/features/teacher/presentation/new_batch_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

const _sarRates = FxRates(rates: {DisplayCurrency.aed: 1, DisplayCurrency.sar: 1.0211});

/// Card checkout: `POST /checkout` answers `{ order, checkoutUrl }`; the order turns PAID after [paidAfter] reads.
class _CardCheckoutRepository extends FakeCheckoutRepository {
  _CardCheckoutRepository({required super.current, this.paidAfter = 2});
  final int paidAfter;
  final List<CheckoutRequest> requests = [];
  int reads = 0;

  @override
  Future<CheckoutResult> checkout(CheckoutRequest request) async {
    requests.add(request);
    return CheckoutResult(order: current, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1');
  }

  @override
  Future<Order> order(String id) async {
    reads++;
    if (reads > paidAfter) {
      current = Order(id: current.id, reference: current.reference, status: OrderStatus.paid, method: current.method, totalFils: current.totalFils);
    }
    return current;
  }
}

class _FakeBatchSessions implements BatchSessionsRepository {
  Object? addError;
  Object? capacityError;
  final List<(String, NewSessionDraft)> added = [];
  final List<(String, int)> capacities = [];
  final List<String> cancelled = [];

  @override
  Future<SessionSummary> addSession(String batchId, NewSessionDraft draft) async {
    added.add((batchId, draft));
    if (addError != null) throw addError!;
    return SessionSummary(id: 's-new', number: 9, title: draft.title, startsAt: draft.startsAt, endsAt: draft.startsAt.add(Duration(minutes: draft.durationMin)));
  }

  @override
  Future<Batch> updateCapacity(String batchId, int capacity) async {
    capacities.add((batchId, capacity));
    if (capacityError != null) throw capacityError!;
    return Batch(id: batchId, code: 'B07', courseId: 'c1', capacity: capacity);
  }

  @override
  Future<void> cancelSession(String sessionId, {String? reason, bool notifyStudents = true}) async => cancelled.add(sessionId);
}

void main() {
  group('Price widget', () {
    Future<void> pumpPrice(WidgetTester tester, Widget price, {FxRates fx = _sarRates}) async {
      await pumpScreen(tester, Scaffold(body: Center(child: price)), overrides: [
        fxRatesProvider.overrideWith((ref) async => fx),
      ]);
      await settle(tester);
    }

    testWidgets('follows the Display currency, with the AED charge line', (tester) async {
      await pumpPrice(tester, const Price(88000, showCharged: true));
      expect(find.text('AED 880.00'), findsOneWidget);
      expect(find.byKey(const Key('price-charged')), findsNothing, reason: 'AED is the charged amount already');

      final container = ProviderScope.containerOf(tester.element(find.byType(Price)));
      await container.read(displayCurrencyProvider.notifier).set(DisplayCurrency.sar);
      await settle(tester);
      expect(find.text('≈ SAR 899'), findsOneWidget);
      expect(find.text('Charged as AED 880.00'), findsOneWidget);
      expect(find.byKey(const Key('price-rates-missing')), findsNothing);
    });

    testWidgets('falls back to AED with a hint when rates are unavailable', (tester) async {
      await pumpPrice(tester, const Price(88000), fx: FxRates.fallback);
      final container = ProviderScope.containerOf(tester.element(find.byType(Price)));
      await container.read(displayCurrencyProvider.notifier).set(DisplayCurrency.usd);
      await settle(tester);
      expect(find.text('AED 880.00'), findsOneWidget);
      expect(find.byKey(const Key('price-rates-missing')), findsOneWidget);
    });

    testWidgets('"from" price, and "No open classes" without one', (tester) async {
      await pumpPrice(tester, const Column(children: [Price.from(54000), Price.from(null)]));
      expect(find.text('From AED 540.00'), findsOneWidget);
      expect(find.text('No open classes'), findsOneWidget);
    });
  });

  group('card checkout (Stripe Checkout)', () {
    testWidgets('opens the checkout URL, then polls the order until it is PAID', (tester) async {
      tester.view.physicalSize = const Size(1170, 2532);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      const course = Course(id: 'c1', slug: 'pdf', titleEn: 'Product Design Foundations', priceFils: 88000);
      final batch = Batch(id: 'b07', code: 'B07', courseId: 'c1', course: course, capacity: 12, priceFils: 88000);
      final repo = _CardCheckoutRepository(
        current: const Order(id: 'o1', reference: 'AZ-B07-1', status: OrderStatus.awaitingPayment, method: PaymentMethod.stripe, totalFils: 88000),
      );
      final opened = <String>[];
      final router = GoRouter(initialLocation: '/checkout/b07', routes: [
        GoRoute(path: '/checkout/:id', builder: (_, s) => CheckoutScreen(batchId: s.pathParameters['id']!)),
        GoRoute(
          path: '/orders/:id',
          builder: (_, s) => OrderStatusScreen(orderId: s.pathParameters['id']!, checkoutUrl: s.extra as String?),
          routes: [GoRoute(path: 'enrolled', builder: (_, _) => const Scaffold(body: Text('enrolled')))],
        ),
      ]);
      await tester.pumpWidget(ProviderScope(
        retry: (_, _) => null,
        overrides: [
          sharedPreferencesProvider.overrideWithValue(await testPrefs()),
          catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(batchList: [batch])),
          checkoutRepositoryProvider.overrideWithValue(repo),
          checkoutPageOpenerProvider.overrideWithValue((url) async {
            opened.add(url);
            return true;
          }),
          realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
        ],
        child: MaterialApp.router(
          routerConfig: router,
          theme: AzzaTheme.build(ThemeVariant.student),
          locale: const Locale('en'),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: localizationDelegates,
        ),
      ));
      await settle(tester);

      await tester.tap(find.byKey(const Key('checkout-continue')));
      await settle(tester);
      expect(repo.requests.single.method, PaymentMethod.stripe);
      expect(opened, ['https://checkout.stripe.com/c/pay/cs_test_1']);
      expect(find.byType(OrderStatusScreen), findsOneWidget);
      expect(find.text('Confirming your payment…'), findsOneWidget);
      expect(find.byKey(const Key('order-polling')), findsOneWidget);
      expect(find.byKey(const Key('order-open-payment-page')), findsOneWidget);

      // Every 3 s the order is fetched again; the second poll sees the webhook's PAID.
      await tester.pump(const Duration(seconds: 3));
      await settle(tester);
      expect(find.text('Confirming your payment…'), findsOneWidget);
      await tester.pump(const Duration(seconds: 3));
      await settle(tester);
      expect(find.text("You're in."), findsOneWidget);
      final readsWhenPaid = repo.reads;

      // Settled: polling stops.
      await tester.pump(const Duration(seconds: 9));
      await settle(tester);
      expect(repo.reads, readsWhenPaid);
    });

    testWidgets('coming back to the app re-checks the order', (tester) async {
      final repo = _CardCheckoutRepository(
        paidAfter: 99,
        current: const Order(id: 'o1', reference: 'AZ-B07-1', status: OrderStatus.awaitingPayment, method: PaymentMethod.stripe, totalFils: 88000),
      );
      await pumpScreen(tester, const OrderStatusScreen(orderId: 'o1'), overrides: [
        checkoutRepositoryProvider.overrideWithValue(repo),
        realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
      ]);
      await settle(tester);
      final before = repo.reads;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await settle(tester);
      expect(repo.reads, greaterThan(before));
      await tester.pumpWidget(const SizedBox()); // dispose → stop the poll
    });
  });

  group('batch sessions editor', () {
    final batch = Batch(
      id: 'b07',
      code: 'B07',
      courseId: 'c1',
      capacity: 12,
      seatsTaken: 9,
      status: BatchStatus.running,
      schedule: const ScheduleRule(weekdays: [2], startTime: '19:00', durationMin: 90, sessionCount: 8),
      sessions: [
        SessionSummary(
          id: 's5',
          number: 5,
          title: 'Prototyping',
          startsAt: DateTime.now().add(const Duration(days: 3)),
          endsAt: DateTime.now().add(const Duration(days: 3, minutes: 90)),
        ),
      ],
    );

    Future<_FakeBatchSessions> pumpPanel(WidgetTester tester, {bool admin = false}) async {
      final repo = _FakeBatchSessions();
      await pumpScreen(
        tester,
        Scaffold(
          body: ListView(padding: const EdgeInsets.all(16), children: [
            BatchSessionsPanel(batch: batch, isAdmin: admin),
            Builder(
              builder: (context) => TextButton(key: const Key('open-seats'), onPressed: () => showEditSeatsSheet(context, batch), child: const Text('seats')),
            ),
          ]),
        ),
        overrides: [
          batchSessionsRepositoryProvider.overrideWithValue(repo),
          catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(batchList: [batch])),
        ],
      );
      await settle(tester);
      return repo;
    }

    testWidgets('adds a session from the sheet', (tester) async {
      final repo = await pumpPanel(tester);
      expect(find.byKey(const Key('session-row-s5')), findsOneWidget);
      expect(find.byKey(const Key('cancel-session-s5')), findsNothing, reason: 'only admins cancel');

      await tester.tap(find.byKey(const Key('add-session')));
      await settle(tester, 10);
      expect(find.byKey(const Key('add-session-sheet')), findsOneWidget);
      expect(find.byKey(const Key('session-timezone')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('session-title')), 'Catch-up');
      await tester.tap(find.byKey(const Key('session-duration-plus')));
      await settle(tester);
      await tester.ensureVisible(find.byKey(const Key('save-session')));
      await tester.tap(find.byKey(const Key('save-session')));
      await settle(tester, 10);

      final (batchId, draft) = repo.added.single;
      expect(batchId, 'b07');
      expect(draft.toJson()['title'], 'Catch-up');
      expect(draft.toJson()['durationMin'], 105);
      expect(draft.toJson()['notifyStudents'], isTrue);
      expect(draft.startsAt.isAfter(DateTime.now()), isTrue);
      expect(find.byKey(const Key('add-session-sheet')), findsNothing);
      expect(find.text('Session added.'), findsOneWidget);
    });

    testWidgets('a teacher clash keeps the sheet open and lists it', (tester) async {
      final repo = await pumpPanel(tester);
      repo.addError = const AppException('CONFLICT', 'Teacher is double-booked at that time', statusCode: 409, details: {
        'conflicts': [
          {'withBatch': 'B03'},
        ],
      });
      await tester.tap(find.byKey(const Key('add-session')));
      await settle(tester, 10);
      await tester.enterText(find.byKey(const Key('session-title')), 'Bonus');
      await tester.ensureVisible(find.byKey(const Key('save-session')));
      await tester.tap(find.byKey(const Key('save-session')));
      await settle(tester, 10);

      expect(repo.added, hasLength(1));
      expect(find.byKey(const Key('add-session-sheet')), findsOneWidget);
      expect(find.byKey(const Key('add-session-error')), findsOneWidget);
      expect(find.text('You already teach at some of these times.'), findsOneWidget);
      expect(find.text('CLASHES WITH B03'), findsOneWidget);
    });

    testWidgets('admins can cancel; seats below the enrolled count are refused', (tester) async {
      final repo = await pumpPanel(tester, admin: true);
      await tester.tap(find.byKey(const Key('cancel-session-s5')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('confirm-cancel-session')));
      await settle(tester);
      expect(repo.cancelled, ['s5']);

      repo.capacityError = const AppException('CAPACITY_TOO_LOW', 'Capacity is below the number of enrolled students', statusCode: 422);
      await tester.tap(find.byKey(const Key('open-seats')));
      await settle(tester, 10);
      for (var i = 0; i < 4; i++) {
        await tester.tap(find.byKey(const Key('seats-stepper-minus')));
        await settle(tester, 1);
      }
      await tester.tap(find.byKey(const Key('save-seats')));
      await settle(tester);
      expect(repo.capacities.single, ('b07', 8));
      expect(find.byKey(const Key('edit-seats-error')), findsOneWidget);
      expect(find.text('Seats can\'t go below the number of enrolled students.'), findsOneWidget);
    });
  });

  group('pricing lives on the batch', () {
    testWidgets('the course editor has no price field and sends no price', (tester) async {
      final repo = FakeProposalsRepository();
      await pumpScreen(tester, const CourseEditorScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester);
      expect(find.byKey(const Key('course-price')), findsNothing);
      expect(find.byKey(const Key('course-price-note')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('course-title-en')), 'Calligraphy');
      await tester.enterText(find.byKey(const Key('course-category')), 'art');
      await tester.scrollUntilVisible(
        find.byKey(const Key('module-en-0')),
        200,
        scrollable: find.descendant(of: find.byKey(const Key('course-editor')), matching: find.byType(Scrollable)).first,
      );
      await settle(tester, 8);
      await tester.enterText(find.byKey(const Key('module-en-0')), 'Holding the qalam');
      await tester.tap(find.byKey(const Key('save-draft')));
      await settle(tester, 8);
      expect(repo.createdCourses.single.toJson().containsKey('priceAed'), isFalse);
    });

    testWidgets('a new batch needs a seat price', (tester) async {
      const course = Course(id: 'c-pub', slug: 'sa', titleEn: 'Speaking Arabic', category: 'languages', status: CourseStatus.published);
      final repo = FakeProposalsRepository(batchable: [course]);
      await pumpScreen(tester, const NewBatchScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester, 8);
      await tester.tap(find.byKey(const Key('batch-course')));
      await settle(tester);
      await tester.tap(find.text('Speaking Arabic').last);
      await settle(tester);
      await tester.enterText(find.byKey(const Key('batch-code')), 'b07');
      await tester.tap(find.byKey(const Key('batch-seats-plus')));
      await settle(tester);
      expect(find.text('13'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const Key('weekday-0')),
        200,
        scrollable: find.descendant(of: find.byKey(const Key('new-batch')), matching: find.byType(Scrollable)).first,
      );
      await settle(tester, 8);
      await tester.tap(find.byKey(const Key('weekday-0')));
      await settle(tester);

      await tester.tap(find.byKey(const Key('create-batch')));
      await settle(tester);
      expect(find.text('Enter a seat price in AED (more than 0).'), findsOneWidget);
      expect(repo.createdBatches, isEmpty);

      await tester.drag(find.byKey(const Key('new-batch')), const Offset(0, 3000));
      await settle(tester, 4);
      await tester.enterText(find.byKey(const Key('batch-price')), '450');
      await tester.tap(find.byKey(const Key('create-batch')));
      await settle(tester, 8);
      final body = repo.createdBatches.single.toJson();
      expect(body['priceAed'], 450);
      expect(body['capacity'], 13);
    });
  });
}
