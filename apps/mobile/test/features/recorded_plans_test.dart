import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/providers.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/admin/data/back_office_repository.dart';
import 'package:azza/features/admin/presentation/admin_course_money.dart';
import 'package:azza/features/admin/presentation/admin_subscriptions_screen.dart';
import 'package:azza/features/admin/presentation/manage_hub_screen.dart';
import 'package:azza/features/admin/presentation/transfer_verify_screen.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/announcements/data/announcements_repository.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/support/data/support_repository.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/features/home/presentation/student_home_screen.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/lesson_progress_repository.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/learn/presentation/lesson_video_tracker.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/subscriptions/data/subscription_repository.dart';
import 'package:azza/features/subscriptions/domain/subscription_models.dart';
import 'package:azza/features/subscriptions/presentation/my_plans_screen.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/data/studio_repository.dart';
import 'package:azza/features/teacher/data/teacher_repository.dart';
import 'package:azza/features/teacher/presentation/course_editor_screen.dart';
import 'package:azza/features/teacher/presentation/recorded_course_hub_screen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../helpers/admin_fakes.dart';
import '../helpers/fakes.dart';
import '../helpers/harness.dart';
import '../helpers/teacher_fakes.dart';

/// Answers `mine()` and records every plan action.
class _Plans implements SubscriptionRepository {
  _Plans(this.list);
  List<MySubscription> list;
  final calls = <String>[];
  final subscribed = <(String, SubscriptionPlan, SubscribeMethod)>[];

  @override
  Future<List<MySubscription>> mine() async => list;
  @override
  Future<void> cancel(String id) async => calls.add('cancel:$id');
  @override
  Future<void> resume(String id) async => calls.add('resume:$id');
  @override
  Future<void> switchPlan(String id, SubscriptionPlan plan) async => calls.add('switch:$id:${plan.wire}');
  @override
  Future<String> switchToCard(String id) async {
    calls.add('tocard:$id');
    return 'https://billing.test/checkout';
  }

  @override
  Future<String> portalUrl(String id) async {
    calls.add('portal:$id');
    return 'https://billing.test/portal';
  }

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

MySubscription _sub(
  String id, {
  SubscriptionProvider provider = SubscriptionProvider.stripe,
  SubscriptionStatus status = SubscriptionStatus.active,
  SubscriptionPlan plan = SubscriptionPlan.monthly,
  bool hasAccess = true,
  bool cancelAtPeriodEnd = false,
  PendingPayment? pending,
}) =>
    MySubscription(
      id: id,
      courseId: 'rec',
      courseSlug: 'photo-basics',
      courseTitleEn: 'Photography Basics',
      plan: plan,
      provider: provider,
      status: status,
      currentPeriodEnd: DateTime(2027, 3, 14),
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      hasAccess: hasAccess,
      pendingPayment: pending,
    );

class _NoLessons implements LessonsRepository {
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async =>
      CourseLessons.fromJson({'course': {'id': courseIdOrSlug, 'slug': courseIdOrSlug, 'titleEn': 'x'}, 'modules': []});
}

class _TwoLessons implements LessonsRepository {
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async => CourseLessons.fromJson({
        'course': {'id': 'rec', 'slug': 'photo-basics', 'titleEn': 'Photography Basics'},
        'modules': [
          {
            'id': 'm1',
            'order': 1,
            'titleEn': 'Light',
            'lessons': [
              {'id': 'l1', 'moduleId': 'm1', 'order': 1, 'titleEn': 'Free lesson'},
              {'id': 'l2', 'moduleId': 'm1', 'order': 2, 'titleEn': 'Exposure'},
            ],
          },
        ],
      });
}

class _Transfers extends FakeAdminRepository {
  _Transfers(this.items);
  final List<Order> items;
  final reviews = <(String, TransferDecision)>[];
  @override
  Future<List<Order>> transfers({String status = 'VERIFYING'}) async => items;
  @override
  Future<void> reviewTransfer(String orderId, TransferDecision decision, {int? receivedFils, String? reason}) async => reviews.add((orderId, decision));
}

CourseProgress _progress({bool lapsed = false, int done = 2}) => CourseProgress.fromJson({
      'courseId': 'rec',
      'slug': 'photo-basics',
      'titleEn': 'Photography Basics',
      'type': 'RECORDED',
      'completed': done,
      'total': 5,
      'nextLesson': {'id': 'l3', 'titleEn': 'Exposure', 'moduleId': 'm1'},
      'subscription': {'status': lapsed ? 'EXPIRED' : 'ACTIVE', 'hasAccess': !lapsed, 'cancelAtPeriodEnd': false},
    });

void main() {
  late List<String> opened;
  setUp(() => opened = []);

  Override opener() => checkoutPageOpenerProvider.overrideWithValue((url) async {
        opened.add(url);
        return true;
      });

  Future<void> pumpHome(WidgetTester tester, {required List<CourseProgress> progress, List<MySubscription> plans = const [], _Plans? repo}) => pumpScreen(
        tester,
        const StudentHomeScreen(),
        overrides: [
          currentUserProvider.overrideWithValue(student),
          meRepositoryProvider.overrideWithValue(FakeMeRepository()),
          learnRepositoryProvider.overrideWithValue(FakeLearnRepository()),
          lessonsRepositoryProvider.overrideWithValue(_NoLessons()),
          lessonProgressRepositoryProvider.overrideWithValue(FakeLessonProgressRepository(items: progress)),
          quizzesRepositoryProvider.overrideWithValue(FakeBatchQuizzes()),
          certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(const CertificatesOverview())),
          waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
          realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
          chatRepositoryProvider.overrideWithValue(FakeChatRepository()),
          announcementsRepositoryProvider.overrideWithValue(FakeAnnouncementsRepository()),
          supportRepositoryProvider.overrideWithValue(FakeSupportRepository()),
          subscriptionRepositoryProvider.overrideWithValue(repo ?? _Plans(plans)),
          opener(),
        ],
      );

  Future<_Plans> pumpPlans(WidgetTester tester, List<MySubscription> plans) async {
    final repo = _Plans(plans);
    await pumpScreen(tester, const MyPlansScreen(), overrides: [
      currentUserProvider.overrideWithValue(student),
      subscriptionRepositoryProvider.overrideWithValue(repo),
      opener(),
    ]);
    await settle(tester);
    return repo;
  }

  Future<void> tapKey(WidgetTester tester, String key) async {
    final f = find.byKey(Key(key));
    await tester.ensureVisible(f);
    await settle(tester, 8);
    await tester.tap(f);
    await settle(tester);
  }

  group('learning', () {
    testWidgets('a lapsed course shows its progress and "Renew to continue"', (tester) async {
      await pumpHome(tester, progress: [_progress(lapsed: true)]);
      await settle(tester);
      expect(find.byKey(const Key('recorded-rec')), findsOneWidget);
      expect(find.text('2 of 5 lessons'), findsOneWidget, reason: 'progress is never deleted');
      expect(find.byKey(const Key('recorded-renew-rec')), findsOneWidget);
      expect(find.text('Renew to continue'), findsOneWidget);
      expect(find.text('Your plan has ended. Your progress is saved.'), findsOneWidget);
      expect(find.byKey(const Key('recorded-resume-rec')), findsNothing);
    });

    testWidgets('a course with access resumes at the next lesson', (tester) async {
      await pumpHome(tester, progress: [_progress()]);
      await settle(tester);
      expect(find.text('Resume: Exposure'), findsOneWidget);
      expect(find.byKey(const Key('recorded-renew-rec')), findsNothing);
    });

    testWidgets('a progress row without type or subscription reads as a live course (no crash)', (tester) async {
      final plain = CourseProgress.fromJson({'courseId': 'c1', 'titleEn': 'Live', 'completed': 1, 'total': 3});
      expect(plain.recorded, isFalse);
      expect(plain.lapsed, isFalse);
    });

    testWidgets('PAST_DUE shows the banner; its action opens the card portal', (tester) async {
      final repo = _Plans([_sub('s1', status: SubscriptionStatus.pastDue)]);
      await pumpHome(tester, progress: [_progress()], repo: repo);
      await settle(tester);
      expect(find.byKey(const Key('plan-banner-s1')), findsOneWidget);
      expect(find.text("Your last payment didn't go through. Update your card to keep learning."), findsOneWidget);
      await tapKey(tester, 'banner-card-s1');
      expect(repo.calls, ['portal:s1']);
      expect(opened, ['https://billing.test/portal']);
    });

    testWidgets('CANCELLING shows the banner with a way back; ACTIVE shows none', (tester) async {
      final repo = _Plans([_sub('s1', status: SubscriptionStatus.cancelling, cancelAtPeriodEnd: true)]);
      await pumpHome(tester, progress: [_progress()], repo: repo);
      await settle(tester);
      expect(find.textContaining('Your plan ends on'), findsOneWidget);
      await tapKey(tester, 'banner-resume-s1');
      expect(repo.calls, ['resume:s1']);

      await pumpHome(tester, progress: [_progress()], plans: [_sub('s2')]);
      await settle(tester);
      expect(find.byKey(const Key('plan-banner-s2')), findsNothing);
    });
  });

  group('your plans', () {
    testWidgets('cancel asks twice, then calls the repository', (tester) async {
      final repo = await pumpPlans(tester, [_sub('s1')]);
      await tapKey(tester, 'plan-cancel-s1');
      expect(find.textContaining('You can keep learning until'), findsOneWidget);
      expect(find.textContaining('Your progress and certificate stay yours.'), findsOneWidget);
      expect(find.text('Keep my plan'), findsOneWidget);
      await tapKey(tester, 'cancel-continue');
      expect(repo.calls, isEmpty, reason: 'one confirmation is not enough');
      expect(find.text('Are you sure?'), findsOneWidget);
      await tapKey(tester, 'cancel-confirm');
      expect(repo.calls, ['cancel:s1']);
    });

    testWidgets('"Keep my plan" at either step cancels nothing', (tester) async {
      final repo = await pumpPlans(tester, [_sub('s1')]);
      await tapKey(tester, 'plan-cancel-s1');
      await tapKey(tester, 'cancel-keep');
      await tapKey(tester, 'plan-cancel-s1');
      await tapKey(tester, 'cancel-continue');
      await tapKey(tester, 'cancel-keep-2');
      expect(repo.calls, isEmpty);
    });

    testWidgets('an Apple plan shows the App Store manage button and no cancel or card actions', (tester) async {
      final repo = await pumpPlans(tester, [_sub('s1', provider: SubscriptionProvider.apple)]);
      expect(find.text('Manage it in the App Store'), findsOneWidget);
      expect(find.byKey(const Key('plan-cancel-s1')), findsNothing);
      expect(find.byKey(const Key('plan-card-s1')), findsNothing);
      expect(find.byKey(const Key('plan-switch-s1')), findsNothing);
      await tapKey(tester, 'plan-apple-s1');
      expect(opened, ['https://apps.apple.com/account/subscriptions']);
      expect(repo.calls, isEmpty);
    });

    testWidgets('a card plan can update its card, and switching shows the credit note', (tester) async {
      final repo = await pumpPlans(tester, [_sub('s1')]);
      expect(find.text('Stripe credits the unused time on your current plan.'), findsOneWidget);
      await tapKey(tester, 'plan-switch-s1');
      await tapKey(tester, 'plan-card-s1');
      expect(repo.calls, ['switch:s1:YEARLY', 'portal:s1']);
    });

    testWidgets('a cancelling card plan can be resumed', (tester) async {
      final repo = await pumpPlans(tester, [_sub('s1', status: SubscriptionStatus.cancelling, cancelAtPeriodEnd: true)]);
      expect(find.byKey(const Key('plan-cancel-s1')), findsNothing);
      await tapKey(tester, 'plan-resume-s1');
      expect(repo.calls, ['resume:s1']);
    });

    testWidgets('a transfer plan offers Renew by transfer and Switch to card, also after a rejected transfer', (tester) async {
      const rejected = PendingPayment(id: 'p1', reference: 'AZ-1', amountFils: 4900, status: PendingPaymentStatus.rejected, reviewNote: 'Amount was short');
      final repo = await pumpPlans(tester, [_sub('s1', provider: SubscriptionProvider.bankTransfer, pending: rejected)]);
      expect(find.text("We couldn't confirm your transfer: Amount was short"), findsOneWidget);
      expect(find.byKey(const Key('plan-cancel-s1')), findsNothing);
      expect(find.text('Renew by transfer'), findsOneWidget);
      await tapKey(tester, 'plan-tocard-s1');
      expect(repo.calls, ['tocard:s1']);
      expect(opened, ['https://billing.test/checkout']);
    });

    testWidgets('pending transfer states: waiting for the receipt, and in review', (tester) async {
      await pumpPlans(tester, [
        _sub('s1', provider: SubscriptionProvider.bankTransfer, pending: const PendingPayment(id: 'p1', reference: 'AZ-1', amountFils: 4900, status: PendingPaymentStatus.awaitingReceipt)),
      ]);
      expect(find.text('Waiting for your receipt'), findsOneWidget);
      expect(find.byKey(const Key('plan-upload-receipt')), findsOneWidget);
      await pumpPlans(tester, [
        _sub('s1', provider: SubscriptionProvider.bankTransfer, pending: const PendingPayment(id: 'p1', reference: 'AZ-1', amountFils: 4900, status: PendingPaymentStatus.awaitingReview)),
      ]);
      expect(find.textContaining("We're checking your transfer"), findsOneWidget);
      expect(find.byKey(const Key('plan-upload-receipt')), findsNothing);
    });

    testWidgets('iOS offers no transfer or card purchase, but still manages an existing card plan', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        await pumpPlans(tester, [_sub('s1', provider: SubscriptionProvider.bankTransfer), _sub('s2')]);
        expect(find.byKey(const Key('plan-renew-s1')), findsNothing);
        expect(find.byKey(const Key('plan-tocard-s1')), findsNothing);
        expect(find.byKey(const Key('plan-cancel-s2')), findsOneWidget);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });

    testWidgets('no plans: an empty state that points at the catalog', (tester) async {
      await pumpPlans(tester, const []);
      expect(find.text('No plans yet'), findsOneWidget);
    });

    testWidgets('large text does not overflow', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await pumpPlans(tester, [_sub('s1'), _sub('s2', provider: SubscriptionProvider.bankTransfer)]);
      expect(tester.takeException(), isNull);
    });
  });

  group('lesson video resume', () {
    test('saves every 10 s, on dispose, and 0 once at the end', () {
      final saved = <int>[];
      // ignore: unused_local_variable
      var now = 0;
      final t = VideoPositionTracker(save: (s) async => saved.add(s), interval: const Duration(milliseconds: 10));
      return Future(() async {
        t.start();
        t.update(12);
        await Future<void>.delayed(const Duration(milliseconds: 35));
        expect(saved, [12], reason: 'an unchanged position is not saved again');
        t.update(20);
        await t.dispose();
        expect(saved, [12, 20]);
        final u = VideoPositionTracker(save: (s) async => saved.add(s));
        u.update(99);
        await u.finish();
        await u.finish();
        await u.dispose();
        expect(saved, [12, 20, 0], reason: 'the end is saved once as 0 and nothing follows it');
        now = 1;
      });
    });

    testWidgets('an uploaded video opens at the saved position and saves as it plays', (tester) async {
      final repo = FakeLessonProgressRepository()..positions['l1'] = 42;
      LessonPlayerRequest? request;
      await pumpScreen(
        tester,
        const Scaffold(body: LessonVideo(lessonId: 'l1', url: 'https://cdn.test/videos/lesson.mp4')),
        overrides: [
          lessonProgressRepositoryProvider.overrideWithValue(repo),
          lessonPlayerBuilderProvider.overrideWithValue((context, r) {
            request = r;
            return const Text('player');
          }),
        ],
      );
      await settle(tester);
      expect(request!.startSec, 42);
      request!.tracker.update(55);
      await tester.pump(const Duration(seconds: 10));
      expect(repo.savedPositions.last, ('l1', 55));
      request!.tracker.update(61);
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(repo.savedPositions.last, ('l1', 61), reason: 'saved on dispose');
    });

    testWidgets('a YouTube embed cannot report a position, so it stays the plain card', (tester) async {
      var built = false;
      await pumpScreen(
        tester,
        const Scaffold(body: LessonVideo(lessonId: 'l1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')),
        overrides: [
          lessonProgressRepositoryProvider.overrideWithValue(FakeLessonProgressRepository()),
          lessonPlayerBuilderProvider.overrideWithValue((context, r) {
            built = true;
            return const SizedBox();
          }),
        ],
      );
      await settle(tester);
      expect(built, isFalse);
      expect(find.byKey(const Key('lesson-video')), findsOneWidget);
    });
  });

  group('teacher', () {
    testWidgets('the new-course flow asks Live or Recorded first, and sends the type', (tester) async {
      final repo = FakeProposalsRepository();
      await pumpScreen(tester, const CourseEditorScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester);
      expect(find.byKey(const Key('course-type-chooser')), findsOneWidget);
      expect(find.byKey(const Key('course-type-live')), findsOneWidget);
      expect(find.byKey(const Key('course-type-recorded')), findsOneWidget);
      expect(find.byKey(const Key('course-title-en')), findsNothing, reason: 'the type comes before anything else');

      await tester.tap(find.byKey(const Key('course-type-recorded')));
      await settle(tester);
      expect(find.byKey(const Key('course-title-en')), findsOneWidget);
      expect(find.byKey(const Key('course-price-note')), findsNothing, reason: 'recorded courses have no per-class price');

      await tester.enterText(find.byKey(const Key('course-title-en')), 'Calligraphy');
      await tester.enterText(find.byKey(const Key('course-category')), 'art');
      await tester.scrollUntilVisible(find.byKey(const Key('module-en-0')), 200,
          scrollable: find.descendant(of: find.byKey(const Key('course-editor')), matching: find.byType(Scrollable)).first);
      await settle(tester, 8);
      await tester.enterText(find.byKey(const Key('module-en-0')), 'Holding the qalam');
      await tester.tap(find.byKey(const Key('save-draft')));
      await settle(tester, 8);
      expect(repo.createdCourses.single.type, CourseType.recorded);
    });

    testWidgets('the recorded hub shows earnings, course quizzes with pass marks, and saves the preview lesson', (tester) async {
      const course = Course(id: 'rec', slug: 'photo-basics', titleEn: 'Photography Basics', type: CourseType.recorded, previewLessonId: 'l1', subscriberCount: 12);
      final studio = FakeTeacherStudioRepository();
      final quizzes = FakeBatchQuizzes(const [], [
        QuizSummary.fromJson({'id': 'q1', 'batchId': '', 'title': 'Light check', 'status': 'PUBLISHED', 'passPercent': 80}),
      ]);
      final summary = EarningsSummary(ledger: [
        LedgerEntry.fromJson({'id': 'e1', 'amountFils': 2940, 'status': 'AVAILABLE', 'kind': 'SUBSCRIPTION', 'courseId': 'rec'}),
        LedgerEntry.fromJson({'id': 'e2', 'amountFils': 1000, 'status': 'AVAILABLE', 'kind': 'SUBSCRIPTION', 'courseId': 'other'}),
      ]);
      await pumpScreen(tester, const RecordedCourseHubScreen(courseId: 'rec'), overrides: [
        currentUserProvider.overrideWithValue(teacher),
        catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: [course])),
        quizzesRepositoryProvider.overrideWithValue(quizzes),
        lessonsRepositoryProvider.overrideWithValue(_TwoLessons()),
        teacherStudioRepositoryProvider.overrideWithValue(studio),
        teacherRepositoryProvider.overrideWithValue(FakeTeacherRepository(summary: summary, subscribers: {'rec': const CourseSubscribers(active: 12, total: 12)})),
      ]);
      await settle(tester, 10);
      expect(find.byKey(const Key('hub-subscribers')), findsOneWidget);
      expect(find.text('12'), findsOneWidget);
      expect(find.textContaining('29.40'), findsOneWidget, reason: 'only this course\'s plan earnings');
      expect(find.text('Pass mark 80%'), findsOneWidget);
      await tapKey(tester, 'hub-pick-preview');
      await tapKey(tester, 'preview-l2');
      expect(studio.previewSet, [('rec', 'l2')]);
    });
  });

  group('admin', () {
    testWidgets('default cuts save', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, const PlatformSettingsScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      expect(find.byKey(const Key('teacher-cuts')), findsOneWidget);
      await tester.enterText(find.byKey(const Key('cut-live')), '55');
      await tester.enterText(find.byKey(const Key('cut-recorded')), '70');
      await tapKey(tester, 'cuts-save');
      expect(repo.savedCuts, [(live: 55, recorded: 70)]);
    });

    testWidgets('a cut outside 0 to 100 is refused before saving', (tester) async {
      final repo = FakeBackOfficeRepository();
      await pumpScreen(tester, const PlatformSettingsScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      await tester.enterText(find.byKey(const Key('cut-live')), '');
      await tapKey(tester, 'cuts-save');
      expect(repo.savedCuts, isEmpty);
    });

    testWidgets('a course cut override, recorded prices and Apple ids save', (tester) async {
      final repo = FakeBackOfficeRepository();
      const course = Course(id: 'rec', slug: 'photo-basics', titleEn: 'Photography Basics', type: CourseType.recorded);
      await pumpScreen(tester, const Scaffold(body: SingleChildScrollView(child: AdminCourseMoney(course: course))),
          overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      expect(find.text('For rare cases. Leave empty to use the default, 60%.'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('admin-course-cut')), '45');
      await tapKey(tester, 'admin-save-cut');
      await tester.enterText(find.byKey(const Key('admin-monthly-price')), '49');
      await tester.enterText(find.byKey(const Key('admin-yearly-price')), '490');
      await tapKey(tester, 'admin-save-prices');
      await tester.enterText(find.byKey(const Key('admin-apple-monthly')), 'com.futuretech.azza.rec.photo-basics.monthly');
      await tapKey(tester, 'admin-save-apple');
      expect(repo.courseCuts, [('rec', 45)]);
      expect(repo.pricing, [('rec', 4900, 49000)]);
      expect(repo.appleProducts, [('rec', 'com.futuretech.azza.rec.photo-basics.monthly', null)]);
    });

    testWidgets('a yearly price at or above twelve months is refused', (tester) async {
      final repo = FakeBackOfficeRepository();
      const course = Course(id: 'rec', slug: 'p', titleEn: 'P', type: CourseType.recorded);
      await pumpScreen(tester, const Scaffold(body: SingleChildScrollView(child: AdminCourseMoney(course: course))),
          overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      await tester.enterText(find.byKey(const Key('admin-monthly-price')), '10');
      await tester.enterText(find.byKey(const Key('admin-yearly-price')), '120');
      await tapKey(tester, 'admin-save-prices');
      expect(repo.pricing, isEmpty);
    });

    testWidgets('the subscriptions list cancels with a refund choice, and Apple plans cannot be cancelled', (tester) async {
      final repo = FakeBackOfficeRepository(subscriptionList: [
        AdminSubscription.fromJson({
          'id': 'a1',
          'user': {'name': 'Sara', 'email': 's@x.com'},
          'course': {'id': 'rec', 'titleEn': 'Photography Basics'},
          'plan': 'MONTHLY',
          'provider': 'STRIPE',
          'status': 'ACTIVE',
          'lastPayment': {'amountFils': 4900},
        }),
        AdminSubscription.fromJson({
          'id': 'a2',
          'user': {'name': 'Omar', 'email': 'o@x.com'},
          'course': {'id': 'rec', 'titleEn': 'Photography Basics'},
          'plan': 'YEARLY',
          'provider': 'APPLE',
          'status': 'ACTIVE',
        }),
      ]);
      await pumpScreen(tester, const AdminSubscriptionsScreen(), overrides: [backOfficeRepositoryProvider.overrideWithValue(repo)]);
      await settle(tester, 10);
      expect(find.byKey(const Key('sub-cancel-a2')), findsNothing);
      expect(find.byKey(const Key('sub-apple-a2')), findsOneWidget);
      await tapKey(tester, 'sub-cancel-a1');
      await tapKey(tester, 'sub-cancel-full');
      expect(repo.cancelledSubscriptions, [(id: 'a1', refund: true)]);
    });

    testWidgets('a subscription transfer is reviewed from the queue with its course and plan', (tester) async {
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
      expect(order.isSubscription, isTrue);
      final admin = _Transfers([order]);
      await pumpScreen(tester, TransferVerifyScreen(orderId: 'sp1', transfer: order), overrides: [adminRepositoryProvider.overrideWithValue(admin)]);
      await settle(tester, 8);
      expect(find.text('Photography Basics'), findsOneWidget);
      expect(find.text('Monthly'), findsOneWidget);
      await tester.tap(find.text('Approve'));
      await settle(tester);
      expect(admin.reviews, [('sp1', TransferDecision.approve)]);
    });
  });
}
