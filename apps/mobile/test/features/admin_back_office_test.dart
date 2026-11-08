import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/admin/data/back_office_repository.dart';
import 'package:azza/features/admin/presentation/admin_orders_screen.dart';
import 'package:azza/features/admin/presentation/admin_overview_screen.dart';
import 'package:azza/features/admin/presentation/admin_people_screen.dart';
import 'package:azza/features/admin/presentation/categories_screen.dart';
import 'package:azza/features/admin/presentation/coupons_screen.dart';
import 'package:azza/features/admin/presentation/payout_run_screen.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/instructors/data/instructors_repository.dart';
import 'package:azza/features/support/data/support_repository.dart';
import 'package:azza/features/support/domain/support_models.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/presentation/course_editor_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/admin_fakes.dart';
import '../helpers/fakes.dart';
import '../helpers/harness.dart';

final _paidOrder = AdminOrder(
  order: const Order(
    id: 'o-1',
    reference: 'AZ-B07-48213',
    status: OrderStatus.paid,
    method: PaymentMethod.stripe,
    totalFils: 92400,
    subtotalFils: 88000,
    vatFils: 4400,
    student: PersonRef(id: 'u-s', name: 'Sara Kamal'),
  ),
);

const _teacherUser = AdminUser(id: 'u-t', name: 'Lina Haddad', email: 'lina@example.com', role: Role.teacher, headline: 'Designer');

class _CountingSupport extends FakeSupportRepository {
  _CountingSupport(this.openCount);
  final int openCount;
  @override
  Future<TicketsPage> tickets({SupportStatus? status, SupportCategory? category, int page = 1}) async => TicketsPage(total: openCount);
}

Future<void> _tapVisible(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.pump();
  await tester.tap(f);
  await settle(tester);
}

void main() {
  testWidgets('refund: sheet → reason → confirm → API called with the full refundable amount', (tester) async {
    final repo = FakeBackOfficeRepository(orderList: [_paidOrder]);
    await pumpScreen(tester, const AdminOrderScreen(orderId: 'o-1'), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);

    await tester.tap(find.byKey(const Key('refund-order')));
    await settle(tester, 10);
    expect(find.byKey(const Key('refund-amount')), findsOneWidget);

    // Without a reason the sheet refuses.
    await _tapVisible(tester, find.byKey(const Key('refund-submit')));
    expect(find.byKey(const Key('refund-error')), findsOneWidget);
    expect(repo.refunds, isEmpty);

    await tester.enterText(find.byKey(const Key('refund-reason')), 'Asked to cancel before the start');
    await _tapVisible(tester, find.byKey(const Key('refund-submit')));
    expect(find.byKey(const Key('confirm-ok')), findsOneWidget);
    await tester.tap(find.byKey(const Key('confirm-ok')));
    await settle(tester, 10);

    expect(repo.refunds, hasLength(1));
    expect(repo.refunds.single.id, 'o-1');
    expect(repo.refunds.single.fils, 92400);
    expect(find.textContaining('Refunded'), findsOneWidget);
  });

  testWidgets('people: changing a role asks first, then patches the role', (tester) async {
    final repo = FakeBackOfficeRepository(userList: [_teacherUser]);
    await pumpScreen(tester, const AdminPersonScreen(userId: 'u-t', user: _teacherUser), overrides: [
      backOfficeRepositoryProvider.overrideWithValue(repo),
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(admin)),
    ]);
    await settle(tester);
    expect(find.byKey(const Key('teacher-headline')), findsOneWidget);

    await tester.tap(find.descendant(of: find.byKey(const Key('role-picker')), matching: find.text('Student')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('confirm-ok')));
    await settle(tester);

    expect(repo.userUpdates.single.$1, 'u-t');
    expect(repo.userUpdates.single.$2, {'role': 'STUDENT'});
    expect(find.text('Role changed to Student.'), findsOneWidget);
    // No longer a teacher: the public profile section goes away.
    expect(find.byKey(const Key('teacher-headline')), findsNothing);
  });

  testWidgets('payout run: an approved run is marked paid with the transfer reference', (tester) async {
    final run = PayoutRun(
      id: 'run-1',
      periodStart: DateTime(2026, 10),
      periodEnd: DateTime(2026, 10, 31),
      status: PayoutRunStatus.approved,
      payouts: const [PayoutLine(id: 'p1', teacherName: 'Lina Haddad', amountFils: 150000, status: PayoutStatus.ready)],
    );
    final repo = FakeBackOfficeRepository();
    await pumpScreen(tester, const PayoutRunScreen(runId: 'run-1'), overrides: [
      adminRepositoryProvider.overrideWithValue(ScriptedAdminRepository(run: run)),
      backOfficeRepositoryProvider.overrideWithValue(repo),
    ]);
    await settle(tester);

    await tester.tap(find.byKey(const Key('mark-paid')));
    await settle(tester, 10);
    await tester.enterText(find.byKey(const Key('transfer-reference')), 'ENBD-2026-11-05');
    await _tapVisible(tester, find.byKey(const Key('mark-paid-submit')));
    await tester.tap(find.byKey(const Key('confirm-ok')));
    await settle(tester, 10);

    expect(repo.markedPaid.single, ('run-1', 'ENBD-2026-11-05'));
  });

  testWidgets('coupons: creating a percent coupon sends the code and discount', (tester) async {
    final repo = FakeBackOfficeRepository();
    await pumpScreen(tester, const CouponEditorScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);

    await tester.enterText(find.byKey(const Key('coupon-code')), 'launch25');
    await tester.enterText(find.byKey(const Key('coupon-value')), '25');
    await tester.enterText(find.byKey(const Key('coupon-max')), '100');
    await tester.tap(find.byKey(const Key('save-coupon')));
    await settle(tester);

    final draft = repo.createdCoupons.single;
    expect(draft.code, 'LAUNCH25');
    expect(draft.percentOff, 25);
    expect(draft.amountOffAed, isNull);
    expect(draft.toCreateJson()['maxRedemptions'], 100);
  });

  testWidgets('categories: a delete refused with 409 explains why and offers to hide', (tester) async {
    final repo = FakeBackOfficeRepository(
      categoryList: const [AdminCategory(slug: 'design', nameEn: 'Design', courseCount: 3)],
      deleteCategoryError: const AppException('CONFLICT', 'Move its courses first', statusCode: 409),
    );
    await pumpScreen(tester, const CategoriesScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);

    await tester.tap(find.byKey(const Key('delete-category-design')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('confirm-ok')));
    await settle(tester);

    expect(find.byKey(const Key('category-conflict')), findsOneWidget);
    expect(find.text('This category still has courses'), findsOneWidget);
    expect(repo.deletedCategories, isEmpty);

    await tester.tap(find.byKey(const Key('hide-instead')));
    await settle(tester);
    expect(repo.updatedCategories.single.$1, 'design');
    expect(repo.updatedCategories.single.$2, {'active': false});
  });

  testWidgets('overview: decision queue rows open the right Approvals tab or inbox', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final router = GoRouter(initialLocation: '/admin/overview', routes: [
      GoRoute(path: '/admin/overview', builder: (_, _) => const AdminOverviewScreen(), routes: [
        GoRoute(path: 'support', builder: (_, _) => const Scaffold(body: Text('support inbox'))),
      ]),
      GoRoute(path: '/admin/approvals', builder: (_, s) => Scaffold(body: Text('approvals ${s.uri.queryParameters['tab']}'))),
    ]);
    addTearDown(router.dispose);
    final prefs = await testPrefs();
    await tester.pumpWidget(ProviderScope(
      retry: (_, _) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(admin)),
        adminRepositoryProvider.overrideWithValue(ScriptedAdminRepository(
          dash: const AdminDashboard(liveRooms: 1, alerts: [AdminAlert(type: 'TRANSFERS_TO_VERIFY', count: 2, severity: 'warning')]),
        )),
        proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository(
          pendingCourseList: const [Course(id: 'c1', slug: 'c1', titleEn: 'UX writing', status: CourseStatus.pendingReview)],
        )),
        instructorsRepositoryProvider.overrideWithValue(FakeInstructorsRepository()),
        supportRepositoryProvider.overrideWithValue(_CountingSupport(3)),
      ],
      child: MaterialApp.router(
        theme: AzzaTheme.build(ThemeVariant.student),
        locale: const Locale('en'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: localizationDelegates,
        routerConfig: router,
      ),
    ));
    await settle(tester, 10);

    expect(find.byKey(const Key('queue-transfers')), findsOneWidget);
    expect(find.byKey(const Key('queue-proposals')), findsOneWidget);
    expect(find.byKey(const Key('queue-tickets')), findsOneWidget);
    expect(find.byKey(const Key('queue-payouts')), findsNothing); // nothing waiting → no row
    expect(find.text('Needs you · 6'), findsOneWidget);

    await _tapVisible(tester, find.byKey(const Key('queue-transfers')));
    expect(find.text('approvals transfers'), findsOneWidget);

    router.go('/admin/overview');
    await settle(tester, 10);
    await _tapVisible(tester, find.byKey(const Key('queue-proposals')));
    expect(find.text('approvals review'), findsOneWidget);

    router.go('/admin/overview');
    await settle(tester, 10);
    await _tapVisible(tester, find.byKey(const Key('queue-tickets')));
    expect(find.text('support inbox'), findsOneWidget);
  });

  testWidgets('admin course editor: sets a featured rank and publishes', (tester) async {
    const course = Course(
      id: 'c-1',
      slug: 'ux-writing',
      titleEn: 'UX writing',
      category: 'design',
      status: CourseStatus.pendingReview,
      descriptionEn: 'Write interface copy that people understand at a glance.',
      modules: [CourseModule(order: 1, titleEn: 'Microcopy')],
    );
    final repo = FakeBackOfficeRepository();
    final proposals = FakeProposalsRepository();
    await pumpScreen(tester, const CourseEditorScreen(courseId: 'c-1', adminMode: true), overrides: [
      backOfficeRepositoryProvider.overrideWithValue(repo),
      proposalsRepositoryProvider.overrideWithValue(proposals),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: const [course])),
    ]);
    await settle(tester, 10);

    expect(find.byKey(const Key('admin-course-section')), findsOneWidget);
    expect(find.byKey(const Key('submit-course')), findsNothing); // teacher hand-off hidden
    await tester.enterText(find.byKey(const Key('admin-featured-rank')), '2');
    await tester.tap(find.byKey(const Key('admin-publish-course')));
    await settle(tester, 10);

    final (id, body) = repo.savedCourses.single;
    expect(id, 'c-1');
    expect(body['status'], 'PUBLISHED');
    expect(body['featuredRank'], 2);
    expect(body['titleEn'], 'UX writing');
    expect(proposals.updatedCourses, isEmpty); // admin saves never go through the teacher endpoint
    expect(find.byKey(const Key('admin-publish-course')), findsNothing);
  });
}
