import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/admin/data/back_office_repository.dart';
import 'package:azza/features/admin/presentation/admin_course_money.dart';
import 'package:azza/features/admin/presentation/admin_subscriptions_screen.dart';
import 'package:azza/features/admin/presentation/manage_hub_screen.dart';
import 'package:azza/features/admin/presentation/payout_run_screen.dart';
import 'package:azza/features/admin/presentation/transfer_verify_screen.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/certificates/presentation/certificate_detail_screen.dart';
import 'package:azza/features/certificates/presentation/certificate_verify_screen.dart';
import 'package:azza/features/certificates/presentation/certificates_screen.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/subscriptions/data/subscription_repository.dart';
import 'package:azza/features/subscriptions/domain/subscription_models.dart';
import 'package:azza/features/subscriptions/presentation/my_plans_screen.dart';
import 'package:azza/features/subscriptions/presentation/plan_banner.dart';
import 'package:azza/features/teacher/data/studio_repository.dart';
import 'package:azza/features/teacher/data/teacher_repository.dart';
import 'package:azza/features/teacher/presentation/earnings_screen.dart';
import 'package:azza/features/teacher/presentation/recorded_course_hub_screen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/admin_fakes.dart';
import '../helpers/fakes.dart';
import '../helpers/harness.dart';
import '../helpers/teacher_fakes.dart';

Certificate _recorded() => Certificate.fromJson({
      'kind': 'RECORDED',
      'code': 'AZ-CERT-REC1',
      'issuedAt': '2026-11-01T10:00:00.000Z',
      'attended': 0,
      'total': 0,
      'batchId': null,
      'batchCode': null,
      'startsOn': null,
      'endsOn': null,
      'course': {'id': 'rec', 'slug': 'photo-basics', 'titleEn': 'Photography Basics', 'titleAr': 'أساسيات التصوير'},
      'teacherName': 'Lina Haddad',
      'holderName': 'Sara Kamal',
    });

class _NoLessons implements LessonsRepository {
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async =>
      CourseLessons.fromJson({'course': {'id': courseIdOrSlug, 'slug': courseIdOrSlug, 'titleEn': 'x'}, 'modules': []});
}

class _Plans implements SubscriptionRepository {
  _Plans(this.list);
  final List<MySubscription> list;
  final subscribed = <(String, SubscriptionPlan, SubscribeMethod)>[];
  @override
  Future<List<MySubscription>> mine() async => list;
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
  @override
  Future<SubscribeStart> subscribe(String courseId, SubscriptionPlan plan, SubscribeMethod method) async {
    subscribed.add((courseId, plan, method));
    throw StateError('not needed');
  }

  @override
  Future<SubscriptionLookup> byReference(String reference) async => const SubscriptionLookup(status: SubscriptionStatus.active);
  @override
  Future<void> verifyApple(String signedTransaction) async {}
  @override
  Future<void> submitReceipt(String paymentId, PickedFile file) async {}
}

class _MissingOrder extends FakeCheckoutRepository {
  _MissingOrder() : super(current: const Order(id: 'x', reference: 'x', status: OrderStatus.verifying, method: PaymentMethod.bankTransfer, totalFils: 0));
  @override
  Future<Order> order(String id) async => throw const AppException('NOT_FOUND', 'Order not found');
}

class _Transfers extends FakeAdminRepository {
  _Transfers(this.items);
  final List<Order> items;
  @override
  Future<List<Order>> transfers({String status = 'VERIFYING'}) async => items;
}

Future<void> _tapKey(WidgetTester tester, String key) async {
  final f = find.byKey(Key(key));
  await tester.ensureVisible(f);
  await settle(tester, 2);
  await tester.tap(f);
  await settle(tester);
}

void main() {
  group('recorded certificates', () {
    test('parse the nullable fields safely', () {
      final c = _recorded();
      expect(c.isRecorded, isTrue);
      expect(c.batchCode, '');
      expect(c.startsOn, isNull);
      expect(Certificate.fromJson({'code': 'A', 'course': {}}).isRecorded, isFalse);
    });

    testWidgets('verify shows the course and the completion line, not attendance or a class', (tester) async {
      await pumpScreen(tester, const CertificateVerifyScreen(code: 'AZ-CERT-REC1'), overrides: [
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(CertificatesOverview(items: [_recorded()]))),
      ]);
      await settle(tester);
      expect(find.byKey(const Key('verify-valid')), findsOneWidget);
      expect(find.textContaining('Photography Basics'), findsWidgets);
      expect(find.text('Completed every lesson and passed every quiz'), findsOneWidget);
      expect(find.text('Attendance'), findsNothing);
      expect(find.text('Class'), findsNothing);
      expect(find.text('Dates'), findsNothing);
      expect(find.textContaining('0/0'), findsNothing);
    });

    testWidgets('the detail screen leads with the completion line', (tester) async {
      await pumpScreen(tester, const CertificateDetailScreen(code: 'AZ-CERT-REC1'), overrides: [
        currentUserProvider.overrideWithValue(student),
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(CertificatesOverview(items: [_recorded()]))),
      ]);
      await settle(tester, 10);
      expect(find.byKey(const Key('cert-completion-line')), findsOneWidget);
      expect(find.text('Completed every lesson and passed every quiz'), findsWidgets);
      expect(find.textContaining('live session'), findsNothing);
      expect(find.text('Attendance'), findsNothing);
    });

    testWidgets('the list card has no class code or attendance', (tester) async {
      await pumpScreen(tester, const CertificatesScreen(), overrides: [
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(CertificatesOverview(items: [_recorded()]))),
      ]);
      await settle(tester);
      expect(find.text('Photography Basics'), findsOneWidget);
      expect(find.text('Completed every lesson and passed every quiz'), findsOneWidget);
      expect(find.textContaining('Attended'), findsNothing);
    });
  });

  group('teacher', () {
    testWidgets('the recorded hub reads subscribers from the endpoint and splits them by state', (tester) async {
      const course = Course(id: 'rec', slug: 'photo-basics', titleEn: 'Photography Basics', type: CourseType.recorded);
      final summary = EarningsSummary(courses: [const CourseEarning(courseId: 'rec', titleEn: 'Photography Basics', amountFils: 5880)]);
      await pumpScreen(tester, const RecordedCourseHubScreen(courseId: 'rec'), overrides: [
        currentUserProvider.overrideWithValue(teacher),
        catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: [course])),
        quizzesRepositoryProvider.overrideWithValue(FakeBatchQuizzes()),
        lessonsRepositoryProvider.overrideWithValue(_NoLessons()),
        teacherStudioRepositoryProvider.overrideWithValue(FakeTeacherStudioRepository()),
        teacherRepositoryProvider.overrideWithValue(FakeTeacherRepository(
          summary: summary,
          subscribers: {'rec': const CourseSubscribers(active: 7, cancelling: 2, pastDue: 1, total: 10)},
        )),
      ]);
      await settle(tester, 10);
      expect(tester.widget<Text>(find.byKey(const Key('hub-subscribers-total'))).data, '10');
      expect(find.text('Active 7'), findsOneWidget);
      expect(find.text('Ending 2'), findsOneWidget);
      expect(find.text('Payment failed 1'), findsOneWidget);
      expect(find.textContaining('58.80'), findsOneWidget, reason: 'the per-course total');
    });

    testWidgets('earnings show each recorded course total', (tester) async {
      final summary = EarningsSummary.fromJson({
        'summary': {},
        'batches': [],
        'courses': [
          {'courseId': 'rec', 'titleEn': 'Photography Basics', 'titleAr': 'أساسيات التصوير', 'earnedFils': 12300},
        ],
        'ledger': [
          {'id': 'e1', 'kind': 'SUBSCRIPTION', 'amountFils': 12300, 'status': 'PENDING', 'batch': null, 'course': {'id': 'rec', 'titleEn': 'Photography Basics', 'titleAr': 'x'}},
        ],
      });
      expect(summary.ledger.single.course?.titleEn, 'Photography Basics');
      expect(summary.ledger.single.courseId, 'rec');
      await pumpScreen(tester, const EarningsScreen(), overrides: [
        currentUserProvider.overrideWithValue(teacher),
        teacherRepositoryProvider.overrideWithValue(FakeTeacherRepository(summary: summary)),
        checkoutRepositoryProvider.overrideWithValue(FakeCheckoutRepository(current: Order(id: 'x', reference: 'x', status: OrderStatus.paid, method: PaymentMethod.stripe, totalFils: 0))),
      ]);
      await settle(tester, 10);
      await tester.scrollUntilVisible(find.byKey(const Key('earnings-courses')), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Photography Basics'), findsOneWidget);
      expect(find.textContaining('123.00'), findsWidgets);
    });
  });

  group('admin', () {
    testWidgets('a payout shows what each recorded course contributed', (tester) async {
      final run = PayoutRun.fromJson({
        'id': 'r1',
        'status': 'DRAFT',
        'periodStart': '2026-10-01T00:00:00.000Z',
        'periodEnd': '2026-10-31T00:00:00.000Z',
        'payouts': [
          {
            'id': 'p1',
            'amountFils': 20000,
            'adjustmentsFils': 0,
            'status': 'READY',
            'teacher': {'id': 't1', 'name': 'Lina Haddad'},
            'courses': [
              {'courseId': 'rec', 'titleEn': 'Photography Basics', 'titleAr': 'x', 'amountFils': 12000},
            ],
          },
        ],
      });
      expect(run.payouts.single.courses.single.amountFils, 12000);
      await pumpScreen(tester, const PayoutRunScreen(runId: 'r1'), overrides: [
        adminRepositoryProvider.overrideWithValue(_RunRepo(run)),
      ]);
      await settle(tester, 8);
      expect(find.byKey(const Key('payout-courses-p1')), findsOneWidget);
      expect(find.text('Photography Basics'), findsOneWidget);
      expect(find.textContaining('120.00'), findsOneWidget);
    });

    testWidgets('cancelling a plan whose transfer receipt was under review says to return the money by hand', (tester) async {
      final repo = FakeBackOfficeRepository(subscriptionList: [
        AdminSubscription.fromJson({
          'id': 'a1',
          'user': {'name': 'Sara', 'email': 's@x.com'},
          'course': {'id': 'rec', 'titleEn': 'Photography Basics'},
          'plan': 'MONTHLY',
          'provider': 'BANK_TRANSFER',
          'status': 'ACTIVE',
        }),
      ])..cancelReturnsReceipt = true;
      await pumpScreen(tester, const AdminSubscriptionsScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      await _tapKey(tester, 'sub-cancel-a1');
      expect(find.text('Back'), findsOneWidget, reason: 'the plain Cancel button became a neutral way back');
      expect(find.text('Keep my plan'), findsNothing, reason: 'an admin is not keeping their own plan');
      await _tapKey(tester, 'sub-cancel-none');
      expect(find.byKey(const Key('sub-cancel-receipt-warning')), findsOneWidget);
      expect(find.text('A transfer receipt was under review; return that money by hand.'), findsOneWidget);
    });

    testWidgets('settings: App Store card lists seats and courses, and Sync now calls the API', (tester) async {
      final repo = FakeBackOfficeRepository()
        ..appStore = AppStoreStatus.fromJson({
          'configured': true,
          'seats': [
            {'priceFils': 9900, 'productId': 'com.futuretech.azza.seat.99', 'status': 'SYNCED', 'detail': null, 'syncedAt': '2026-11-01T10:00:00.000Z'},
          ],
          'courses': [
            {'id': 'rec', 'slug': 'photo-basics', 'titleEn': 'Photography Basics', 'titleAr': 'x', 'status': 'FAILED', 'detail': 'Price tier missing', 'syncedAt': null},
          ],
        });
      await pumpScreen(tester, const PlatformSettingsScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      await tester.scrollUntilVisible(find.byKey(const Key('app-store-card')), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Synced'), findsOneWidget);
      expect(find.text('Failed'), findsOneWidget);
      expect(find.text('Price tier missing'), findsOneWidget);
      await _tapKey(tester, 'app-store-sync');
      expect(repo.syncCalls, 1);
      await tester.pump(const Duration(seconds: 5));
    });

    testWidgets('settings: not configured says how to enable it, with no Sync button', (tester) async {
      await pumpScreen(tester, const PlatformSettingsScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(FakeBackOfficeRepository())]);
      await settle(tester, 10);
      await tester.scrollUntilVisible(find.byKey(const Key('app-store-not-configured')), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Add your App Store Connect API key to enable automatic product setup.'), findsOneWidget);
      expect(find.byKey(const Key('app-store-sync')), findsNothing);
    });

    testWidgets('course money shows the sync status and the reason when it failed', (tester) async {
      final repo = FakeBackOfficeRepository()
        ..appStore = AppStoreStatus.fromJson({
          'configured': true,
          'seats': [],
          'courses': [
            {'id': 'rec', 'slug': 'photo-basics', 'titleEn': 'Photography Basics', 'status': 'FAILED', 'detail': 'Price tier missing'},
          ],
        });
      const course = Course(id: 'rec', slug: 'photo-basics', titleEn: 'Photography Basics', type: CourseType.recorded);
      await pumpScreen(tester, const Scaffold(body: SingleChildScrollView(child: AdminCourseMoney(course: course))),
          overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      expect(find.byKey(const Key('admin-apple-sync-status')), findsOneWidget);
      expect(find.text('Failed'), findsOneWidget);
      expect(find.byKey(const Key('admin-apple-sync-detail')), findsOneWidget);
    });

    testWidgets('course money: empty prices and a yearly price above 12 months get different messages', (tester) async {
      final repo = FakeBackOfficeRepository();
      const course = Course(id: 'rec', slug: 'photo-basics', titleEn: 'Photography Basics', type: CourseType.recorded);
      await pumpScreen(tester, const Scaffold(body: SingleChildScrollView(child: AdminCourseMoney(course: course))),
          overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      await _tapKey(tester, 'admin-save-prices');
      expect(find.text('Enter a monthly and a yearly price.'), findsOneWidget);
      await tester.pump(const Duration(seconds: 6));
      await tester.enterText(find.byKey(const Key('admin-monthly-price')), '10');
      await tester.enterText(find.byKey(const Key('admin-yearly-price')), '120');
      await _tapKey(tester, 'admin-save-prices');
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('The yearly price must be lower than 12 monthly payments.'), findsOneWidget);
      expect(repo.pricing, isEmpty);
    });

    testWidgets('a transfer review opened cold finds the plan payment in the inbox', (tester) async {
      final order = Order.fromJson({
        'id': 'sp1',
        'kind': 'SUBSCRIPTION',
        'reference': 'AZ-SUB-1',
        'status': 'VERIFYING',
        'method': 'BANK_TRANSFER',
        'totalFils': 4900,
        'plan': 'MONTHLY',
        'course': {'id': 'rec', 'slug': 'photo-basics', 'titleEn': 'Photography Basics'},
        'user': {'id': 'u-s', 'name': 'Sara Kamal', 'email': 'sara@example.com'},
      });
      await pumpScreen(tester, const TransferVerifyScreen(orderId: 'sp1'), overrides: [
        adminRepositoryProvider.overrideWithValue(_Transfers([order])),
        checkoutRepositoryProvider.overrideWithValue(_MissingOrder()),
      ]);
      await settle(tester, 8);
      expect(find.text('Photography Basics'), findsOneWidget);
      expect(find.byKey(const Key('transfer-not-found')), findsNothing);
    });

    testWidgets('a transfer review opened cold for something that is gone returns to the queue', (tester) async {
      await pumpScreen(tester, const TransferVerifyScreen(orderId: 'gone'), overrides: [
        adminRepositoryProvider.overrideWithValue(_Transfers(const [])),
        checkoutRepositoryProvider.overrideWithValue(_MissingOrder()),
      ]);
      await settle(tester, 8);
      expect(find.byKey(const Key('transfer-not-found')), findsOneWidget);
      expect(find.text('Back to transfers'), findsOneWidget);
    });
  });

  group('plans', () {
    MySubscription sub({SubscriptionProvider provider = SubscriptionProvider.stripe, SubscriptionStatus status = SubscriptionStatus.pastDue, PendingPayment? pending}) => MySubscription(
          id: 's1',
          courseId: 'rec',
          courseSlug: 'photo-basics',
          courseTitleEn: 'Photography Basics',
          plan: SubscriptionPlan.monthly,
          provider: provider,
          status: status,
          currentPeriodEnd: DateTime(2027, 3, 14),
          hasAccess: true,
          pendingPayment: pending,
        );

    test('a past-due banner is for card and App Store plans, never a bank transfer plan', () {
      expect(needsBanner(sub()), isTrue);
      expect(needsBanner(sub(provider: SubscriptionProvider.apple)), isTrue);
      expect(needsBanner(sub(provider: SubscriptionProvider.bankTransfer)), isFalse);
    });

    testWidgets('on iOS, uploading a receipt without the open payment details shows an error and never starts a transfer', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        final repo = _Plans([
          sub(
            provider: SubscriptionProvider.bankTransfer,
            status: SubscriptionStatus.active,
            pending: const PendingPayment(id: 'p1', reference: 'AZ-1', amountFils: 4900, status: PendingPaymentStatus.awaitingReceipt),
          ),
        ]);
        await pumpScreen(tester, const MyPlansScreen(), overrides: [
          currentUserProvider.overrideWithValue(student),
          subscriptionRepositoryProvider.overrideWithValue(repo),
        ]);
        await settle(tester);
        await _tapKey(tester, 'plan-upload-receipt');
        expect(find.text("Bank transfer isn't available on iPhone. Manage your plan in the App Store."), findsOneWidget);
        expect(repo.subscribed, isEmpty);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });
  });
}

class _RunRepo extends FakeAdminRepository {
  _RunRepo(this.run);
  final PayoutRun run;
  @override
  Future<PayoutRun> payoutRun(String id) async => run;
}
