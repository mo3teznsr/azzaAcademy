import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/providers.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/admin/presentation/admin_overview_screen.dart';
import 'package:azza/features/announcements/data/announcements_repository.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/data/reviews_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/catalog/presentation/course_detail_screen.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/home/presentation/student_home_screen.dart';
import 'package:azza/features/instructors/data/instructors_repository.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/lesson_progress_repository.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/support/data/support_repository.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/data/studio_repository.dart';
import 'package:azza/features/teacher/data/teacher_repository.dart';
import 'package:azza/features/teacher/presentation/roster_screen.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';
import '../helpers/teacher_fakes.dart';

/// Key screens at 2× text: nothing may overflow (an overflow is reported as a test exception).
void main() {
  final now = DateTime.now();
  const course = Course(
    id: 'c1',
    slug: 'product-design',
    titleEn: 'Product Design Foundations',
    category: 'design',
    priceFils: 88000,
    outcomesEn: ['Run a user interview', 'Ship a case study'],
    modules: [CourseModule(order: 1, titleEn: 'Seeing like a designer', descriptionEn: 'How to notice friction.')],
  );
  final later = SessionSummary(
    id: 's6',
    batchId: 'b7',
    number: 6,
    title: 'Prototyping in Figma',
    startsAt: now.add(const Duration(days: 2)),
    endsAt: now.add(const Duration(days: 2, minutes: 90)),
    batchCode: 'B07',
    courseTitle: 'Product Design Foundations',
  );
  final batch = Batch(
    id: 'b7',
    code: 'B07',
    courseId: 'c1',
    course: course,
    capacity: 24,
    seatsTaken: 20,
    sessionCount: 12,
    status: BatchStatus.running,
    teacher: const PersonRef(id: 'u-t', name: 'Lina Haddad'),
    schedule: const ScheduleRule(weekdays: [0, 2], startTime: '19:00', durationMin: 90, sessionCount: 12),
    sessions: [later],
  );
  final enrollment = Enrollment(id: 'e1', status: EnrollmentStatus.active, batch: batch, sessionsDone: 4, sessionsTotal: 12);

  /// Pumps at 2× text on a phone-sized view, then scrolls the main list to the end.
  Future<void> pumpScaled(WidgetTester tester, Widget screen, List<Override> overrides) async {
    tester.platformDispatcher.textScaleFactorTestValue = 2.0;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await pumpScreen(tester, screen, overrides: overrides);
    await settle(tester, 12);
    final vertical = find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down);
    if (vertical.evaluate().isEmpty) return;
    for (var i = 0; i < 12; i++) {
      await tester.drag(vertical.first, const Offset(0, -500), warnIfMissed: false);
      await settle(tester, 4);
    }
  }

  testWidgets('student home', (tester) async {
    await pumpScaled(tester, const StudentHomeScreen(), [
      currentUserProvider.overrideWithValue(student),
      meRepositoryProvider.overrideWithValue(FakeMeRepository(enrollmentList: [enrollment], sessions: [later])),
      learnRepositoryProvider.overrideWithValue(FakeLearnRepository()),
      lessonsRepositoryProvider.overrideWithValue(_FakeLessons()),
      lessonProgressRepositoryProvider.overrideWithValue(FakeLessonProgressRepository()),
      quizzesRepositoryProvider.overrideWithValue(_FakeQuizzes()),
      certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(const CertificatesOverview())),
      waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
      realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
      chatRepositoryProvider.overrideWithValue(FakeChatRepository()),
      announcementsRepositoryProvider.overrideWithValue(FakeAnnouncementsRepository()),
      supportRepositoryProvider.overrideWithValue(FakeSupportRepository()),
    ]);
    expect(find.byType(StudentHomeScreen), findsOneWidget);
  });

  testWidgets('course detail', (tester) async {
    await pumpScaled(tester, const CourseDetailScreen(courseId: 'c1'), [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(null)),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: const [course], batchList: [batch])),
      reviewsRepositoryProvider.overrideWithValue(FakeReviewsRepository()),
      fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
    ]);
    expect(find.byType(CourseDetailScreen), findsOneWidget);
  });

  testWidgets('class hub', (tester) async {
    await pumpScaled(tester, const RosterScreen(batchId: 'b7'), [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(batchList: [batch], courseList: const [course])),
      teacherStudioRepositoryProvider.overrideWithValue(FakeTeacherStudioRepository()),
      teacherRepositoryProvider.overrideWithValue(FakeTeacherRepository()),
      learnRepositoryProvider.overrideWithValue(FakeClassLearnRepository()),
      quizzesRepositoryProvider.overrideWithValue(FakeBatchQuizzes()),
      materialFilePickerProvider.overrideWithValue(FakeMaterialPicker()),
      meRepositoryProvider.overrideWithValue(FakeMeRepository()),
      proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository()),
      messagesUnreadProvider.overrideWithValue(0),
    ]);
    expect(find.byType(RosterScreen), findsOneWidget);
  });

  testWidgets('admin overview', (tester) async {
    await pumpScaled(tester, const AdminOverviewScreen(), [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(admin)),
      adminRepositoryProvider.overrideWithValue(FakeAdminRepository()),
      proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository()),
      instructorsRepositoryProvider.overrideWithValue(FakeInstructorsRepository()),
      supportRepositoryProvider.overrideWithValue(FakeSupportRepository()),
    ]);
    expect(find.byType(AdminOverviewScreen), findsOneWidget);
  });
}

class _FakeQuizzes implements QuizzesRepository {
  @override
  Future<List<QuizSummary>> myQuizzes() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

class _FakeLessons implements LessonsRepository {
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async => CourseLessons.fromJson({
        'course': {'id': 'c1', 'slug': 'product-design', 'titleEn': 'Product Design Foundations'},
        'modules': [
          {
            'id': 'm1',
            'order': 1,
            'titleEn': 'Basics',
            'lessons': [
              {'id': 'l1', 'moduleId': 'm1', 'order': 1, 'titleEn': 'Lines'},
            ],
          },
        ],
      });

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}
