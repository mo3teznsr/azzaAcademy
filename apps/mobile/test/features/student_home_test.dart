import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/providers.dart';
import 'package:azza/features/announcements/data/announcements_repository.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/support/data/support_repository.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/home/presentation/student_home_screen.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/lesson_progress_repository.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

void main() {
  final now = DateTime.now();
  const course = Course(id: 'c1', slug: 'product-design', titleEn: 'Product Design Foundations', priceFils: 88000);
  final liveSession = SessionSummary(
    id: 's5',
    batchId: 'b7',
    number: 5,
    title: 'Wireframes that argue',
    startsAt: now.subtract(const Duration(minutes: 5)),
    endsAt: now.add(const Duration(minutes: 85)),
    status: SessionStatus.live,
    batchCode: 'B07',
    courseTitle: 'Product Design Foundations',
    participantCount: 23,
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
  final batch = Batch(id: 'b7', code: 'B07', courseId: 'c1', course: course, capacity: 24, seatsTaken: 23, sessionCount: 12, sessions: [liveSession, later]);
  final enrollment = Enrollment(id: 'e1', status: EnrollmentStatus.active, batch: batch, sessionsDone: 4, sessionsTotal: 12);

  Future<void> pumpHome(
    WidgetTester tester,
    FakeMeRepository me, {
    List<QuizSummary> quizzes = const [],
    List<Assignment> assignments = const [],
    List<Recording> recordings = const [],
    CertificatesOverview certificates = const CertificatesOverview(),
    List<CourseProgress> progress = const [],
  }) =>
      pumpScreen(
        tester,
        const StudentHomeScreen(),
        overrides: [
          currentUserProvider.overrideWithValue(student),
          meRepositoryProvider.overrideWithValue(me),
          learnRepositoryProvider.overrideWithValue(_FakeLearn(assignmentList: assignments, recordingList: recordings)),
          lessonsRepositoryProvider.overrideWithValue(_FakeLessons()),
          lessonProgressRepositoryProvider.overrideWithValue(FakeLessonProgressRepository(items: progress)),
          quizzesRepositoryProvider.overrideWithValue(_FakeQuizzes(quizzes)),
          certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(certificates)),
          waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
          realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
          chatRepositoryProvider.overrideWithValue(FakeChatRepository()),
          announcementsRepositoryProvider.overrideWithValue(FakeAnnouncementsRepository()),
          supportRepositoryProvider.overrideWithValue(FakeSupportRepository()),
        ],
      );

  testWidgets('a joinable live session leads with Join, labelled by course, not codes', (tester) async {
    await pumpHome(tester, FakeMeRepository(enrollmentList: [enrollment], sessions: [liveSession, later]));
    await settle(tester);

    expect(find.textContaining('Sara'), findsOneWidget);
    expect(find.byKey(const Key('home-hero')), findsOneWidget);
    expect(find.textContaining('LIVE NOW'), findsOneWidget);
    expect(find.text('Wireframes that argue'), findsOneWidget);
    expect(find.byKey(const Key('home-join')), findsOneWidget);
    expect(find.textContaining('Product Design Foundations · Session 5'), findsOneWidget);
    expect(find.textContaining('B07'), findsNothing);
    expect(find.textContaining('S05'), findsNothing);
    final hero = tester.getTopLeft(find.byKey(const Key('home-hero'))).dy;
    final learning = tester.getTopLeft(find.text('Continue learning')).dy;
    expect(hero < learning, isTrue);
    // The live session isn't repeated in "This week".
    expect(find.byKey(const Key('week-s5'), skipOffstage: false), findsNothing);
    expect(find.byKey(const Key('week-s6'), skipOffstage: false), findsOneWidget);
  });

  testWidgets('no live card when nothing is joinable; learning, practice, this week, then the bottom strip', (tester) async {
    await pumpHome(
      tester,
      FakeMeRepository(enrollmentList: [enrollment], sessions: [later]),
      quizzes: [
        QuizSummary(id: 'q1', batchId: 'b7', title: 'Wireframing check', batchCode: 'B07', dueAt: now.add(const Duration(days: 3)), mine: const QuizProgress(canStart: true, attemptsLeft: 1)),
        const QuizSummary(id: 'q2', batchId: 'b7', title: 'Already done', batchCode: 'B07', mine: QuizProgress(status: QuizStatus.submitted)),
      ],
      assignments: [
        Assignment(id: 'a1', title: 'Moodboard', dueAt: now.subtract(const Duration(days: 1))),
        Assignment(id: 'a2', title: 'User flow', dueAt: now.add(const Duration(days: 1))),
        Assignment(id: 'a3', title: 'Handed in', dueAt: now.add(const Duration(days: 1)), submittedAt: now),
      ],
      recordings: [
        Recording(sessionId: 's4', title: 'Grids', number: 4, batchId: 'b7', batchCode: 'B07', url: 'https://cdn/rec4.mp4', recordedAt: now.subtract(const Duration(days: 2)), courseTitle: 'Product Design Foundations'),
      ],
      certificates: CertificatesOverview(items: [
        Certificate(code: 'AZ-CERT-1', batchId: 'b6', batchCode: 'B06', course: const Course(id: 'c0', slug: 'ux', titleEn: 'UX Basics'), courseTitle: 'UX Basics', issuedAt: now),
      ]),
    );
    // A tall screen so the whole home is laid out (the list builds lazily).
    tester.view.physicalSize = const Size(1170, 7500);
    await settle(tester);

    expect(find.byKey(const Key('home-hero')), findsNothing);
    expect(find.byKey(const Key('home-join')), findsNothing);

    // Continue learning: per course, opens the lessons, honest lesson / module counts.
    expect(find.text('Continue learning'), findsOneWidget);
    expect(find.text('Your courses'), findsOneWidget);
    expect(find.byKey(const Key('continue-c1')), findsOneWidget);
    expect(find.text('3 lessons · 2 modules'), findsOneWidget);
    expect(find.byKey(const Key('lessons-b7')), findsOneWidget);

    // Practice due: quizzes and assignments merged, by due date, overdue first and flagged.
    final practice = find.byKey(const Key('home-practice'), skipOffstage: false);
    expect(practice, findsOneWidget);
    final order = ['practice-a1', 'practice-a2', 'practice-q1'].map((k) => tester.getTopLeft(find.byKey(Key(k), skipOffstage: false)).dy).toList();
    expect(order[0] < order[1] && order[1] < order[2], isTrue);
    expect(find.byKey(const Key('overdue-a1'), skipOffstage: false), findsOneWidget);
    expect(find.byKey(const Key('overdue-a2'), skipOffstage: false), findsNothing);
    expect(find.text('Already done', skipOffstage: false), findsNothing);
    expect(find.text('Handed in', skipOffstage: false), findsNothing);

    // This week: labelled with the course and session number.
    expect(find.text('This week', skipOffstage: false), findsOneWidget);
    expect(find.byKey(const Key('week-s6'), skipOffstage: false), findsOneWidget);
    expect(find.textContaining('Product Design Foundations · Session 6', skipOffstage: false), findsOneWidget);
    expect(find.textContaining('B07', skipOffstage: false), findsNothing);

    // Bottom: catch-up recordings, then the certificate banner.
    expect(find.byKey(const Key('recording-s4'), skipOffstage: false), findsOneWidget);
    expect(find.byKey(const Key('home-certificate'), skipOffstage: false), findsOneWidget);
    expect(find.text('Your certificate is ready', skipOffstage: false), findsOneWidget);

    double y(Finder f) => tester.getTopLeft(f).dy;
    final learning = y(find.text('Continue learning'));
    final practiceY = y(practice);
    final week = y(find.byKey(const Key('home-week'), skipOffstage: false));
    final catchUp = y(find.byKey(const Key('home-catchup'), skipOffstage: false));
    final cert = y(find.byKey(const Key('home-certificate'), skipOffstage: false));
    expect(learning < practiceY && practiceY < week && week < catchUp && catchUp < cert, isTrue);
  });

  testWidgets('a certificate the student already opened shows no banner', (tester) async {
    final prefs = await testPrefs({'azza.locale': 'en', 'azza.onboarded': true, 'azza.seen_certificates': ['AZ-CERT-1']});
    await pumpScreen(
      tester,
      const StudentHomeScreen(),
      prefs: prefs,
      overrides: [
        currentUserProvider.overrideWithValue(student),
        meRepositoryProvider.overrideWithValue(FakeMeRepository(enrollmentList: [enrollment])),
        learnRepositoryProvider.overrideWithValue(_FakeLearn()),
        lessonsRepositoryProvider.overrideWithValue(_FakeLessons()),
        quizzesRepositoryProvider.overrideWithValue(_FakeQuizzes(const [])),
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(CertificatesOverview(items: [
          Certificate(code: 'AZ-CERT-1', batchId: 'b6', batchCode: 'B06', course: const Course(id: 'c0', slug: 'ux', titleEn: 'UX Basics'), issuedAt: now),
        ]))),
        waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
        realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
        chatRepositoryProvider.overrideWithValue(FakeChatRepository()),
        announcementsRepositoryProvider.overrideWithValue(FakeAnnouncementsRepository()),
        supportRepositoryProvider.overrideWithValue(FakeSupportRepository()),
      ],
    );
    await settle(tester);
    expect(find.byKey(const Key('home-certificate'), skipOffstage: false), findsNothing);
    expect(find.byKey(const Key('home-practice'), skipOffstage: false), findsNothing);
  });

  testWidgets('continue learning shows real progress and resumes at the next lesson', (tester) async {
    await pumpHome(tester, FakeMeRepository(enrollmentList: [enrollment]), progress: const [
      CourseProgress(
        courseId: 'c1',
        titleEn: 'Product Design Foundations',
        progress: LessonProgress(completed: 4, total: 12, nextLesson: NextLesson(id: 'l5', titleEn: 'Shapes', moduleId: 'm1')),
      ),
    ]);
    await settle(tester);
    expect(find.text('4 of 12 lessons'), findsOneWidget);
    expect(find.byKey(const Key('course-progress-bar')), findsOneWidget);
    expect(find.text('Resume: Shapes'), findsOneWidget);
    expect(find.byKey(const Key('resume-c1')), findsOneWidget);
    // The honest fallback ("3 lessons · 2 modules") gives way to real progress.
    expect(find.textContaining('modules'), findsNothing);
  });

  testWidgets('a finished course says so, with no Resume', (tester) async {
    await pumpHome(tester, FakeMeRepository(enrollmentList: [enrollment]), progress: const [
      CourseProgress(courseId: 'c1', titleEn: 'Product Design Foundations', progress: LessonProgress(completed: 12, total: 12)),
    ]);
    await settle(tester);
    expect(find.text('12 of 12 lessons'), findsOneWidget);
    expect(find.text('All lessons done'), findsOneWidget);
    expect(find.byKey(const Key('resume-c1')), findsNothing);
  });

  testWidgets('without progress yet, the card keeps the course outline', (tester) async {
    await pumpHome(tester, FakeMeRepository(enrollmentList: [enrollment]));
    await settle(tester);
    expect(find.text('3 lessons · 2 modules'), findsOneWidget);
    expect(find.byKey(const Key('lessons-b7')), findsOneWidget);
  });

  testWidgets('empty state invites the student to explore', (tester) async {
    await pumpHome(tester, FakeMeRepository());
    await settle(tester);

    expect(find.text('No courses yet'), findsOneWidget);
    expect(find.text('Find your course'), findsOneWidget);
    expect(find.byKey(const Key('home-hero')), findsNothing);
  });

  testWidgets('error state shows the message and retries', (tester) async {
    final me = FakeMeRepository(error: const AppException('NETWORK', 'No connection to Azza. Check your network.'));
    await pumpHome(tester, me);
    await settle(tester);

    expect(find.text('That didn\'t load.'), findsOneWidget);
    expect(find.text('No connection to Azza. Check your network and try again.'), findsOneWidget);

    me
      ..error = null
      ..enrollmentList = [Enrollment(id: 'e1', status: EnrollmentStatus.active, batch: batch)];
    await tester.tap(find.text('Try again'));
    await settle(tester);

    expect(find.text('That didn\'t load.'), findsNothing);
    expect(find.text('Continue learning'), findsOneWidget);
  });
}

class _FakeQuizzes implements QuizzesRepository {
  _FakeQuizzes(this.list);
  final List<QuizSummary> list;

  @override
  Future<List<QuizSummary>> myQuizzes() async => list;

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

class _FakeLearn extends FakeLearnRepository {
  _FakeLearn({this.assignmentList = const [], this.recordingList = const []});
  final List<Assignment> assignmentList;
  final List<Recording> recordingList;

  @override
  Future<List<Recording>> recordings() async => recordingList;

  @override
  Future<List<Assignment>> assignments(String batchId) async => assignmentList;
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
              {'id': 'l2', 'moduleId': 'm1', 'order': 2, 'titleEn': 'Shapes'},
            ],
          },
          {
            'id': 'm2',
            'order': 2,
            'titleEn': 'Layout',
            'lessons': [
              {'id': 'l3', 'moduleId': 'm2', 'order': 1, 'titleEn': 'Grids'},
            ],
          },
        ],
      });
}
