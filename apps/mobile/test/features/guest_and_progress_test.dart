import 'package:azza/app.dart';
import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/providers.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/announcements/data/announcements_repository.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/data/reviews_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/certificates/data/certificates_repository.dart';
import 'package:azza/features/certificates/domain/certificate_models.dart';
import 'package:azza/features/certificates/presentation/certificate_verify_screen.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/instructors/data/instructors_repository.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/lesson_progress_repository.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/learn/presentation/course_lessons_screen.dart';
import 'package:azza/features/learn/presentation/lesson_screen.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/support/data/support_repository.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/router/app_router.dart';
import 'package:azza/router/routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

// ── Lesson progress ──

Map<String, dynamic> _lessonsJson({Set<String> done = const {}}) => {
      'course': {'id': 'c1', 'slug': 'product-design', 'titleEn': 'Product Design Foundations'},
      'progress': {'completed': done.length, 'total': 3, 'nextLesson': null},
      'modules': [
        {
          'id': 'm1',
          'order': 1,
          'titleEn': 'Basics',
          'lessons': [
            {'id': 'l1', 'moduleId': 'm1', 'order': 1, 'titleEn': 'Lines', 'completed': done.contains('l1')},
            {'id': 'l2', 'moduleId': 'm1', 'order': 2, 'titleEn': 'Shapes', 'completed': done.contains('l2')},
          ],
        },
        {
          'id': 'm2',
          'order': 2,
          'titleEn': 'Layout',
          'lessons': [
            {'id': 'l3', 'moduleId': 'm2', 'order': 1, 'titleEn': 'Grids', 'completed': done.contains('l3')},
          ],
        },
      ],
    };

class _Lessons implements LessonsRepository {
  _Lessons([this.done = const {}]);
  final Set<String> done;
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async => CourseLessons.fromJson(_lessonsJson(done: done));
}

class _NoQuizzes implements QuizzesRepository {
  @override
  Future<List<QuizSummary>> myQuizzes() async => const [];
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

/// The lessons list and a lesson inside a real GoRouter (the lesson screen navigates with pushReplacement).
Future<GoRouter> _pumpLessons(WidgetTester tester, FakeLessonProgressRepository progress, {String at = '/courses/c1/lessons/l1', Set<String> done = const {}}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final router = GoRouter(initialLocation: at, routes: [
    GoRoute(
      path: '/courses/:id/lessons',
      builder: (_, s) => CourseLessonsScreen(courseId: s.pathParameters['id']!),
      routes: [GoRoute(path: ':lessonId', builder: (_, s) => LessonScreen(courseId: s.pathParameters['id']!, lessonId: s.pathParameters['lessonId']!))],
    ),
  ]);
  addTearDown(router.dispose);
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(await testPrefs()),
      currentUserProvider.overrideWithValue(student),
      lessonsRepositoryProvider.overrideWithValue(_Lessons(done)),
      lessonProgressRepositoryProvider.overrideWithValue(progress),
      quizzesRepositoryProvider.overrideWithValue(_NoQuizzes()),
    ],
    child: MaterialApp.router(
      theme: AzzaTheme.build(ThemeVariant.student),
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: localizationDelegates,
      routerConfig: router,
    ),
  ));
  await settle(tester);
  return router;
}

// ── Guest browsing ──

const _course = Course(id: 'c1', slug: 'product-design', titleEn: 'Product Design Foundations', priceFils: 88000);
final _batch = Batch(id: 'b1', code: 'B07', courseId: 'c1', status: BatchStatus.enrolling, capacity: 12);

/// Signed out until [signIn], which signs [next] in.
class _GuestAuth extends FakeAuthRepository {
  _GuestAuth(this.next) : super(null);
  final AppUser next;
  @override
  Future<AppUser> signIn({required String email, required String password}) async => user = next;
}

Future<GoRouter> _bootGuest(WidgetTester tester, {AppUser signsInAs = student}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  late GoRouter router;
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(await testPrefs()),
      authRepositoryProvider.overrideWithValue(_GuestAuth(signsInAs)),
      meRepositoryProvider.overrideWithValue(FakeMeRepository()),
      learnRepositoryProvider.overrideWithValue(FakeLearnRepository()),
      waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: const [_course], searchResults: const [_course], batchList: [_batch])),
      reviewsRepositoryProvider.overrideWithValue(FakeReviewsRepository()),
      proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository()),
      instructorsRepositoryProvider.overrideWithValue(FakeInstructorsRepository()),
      certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository()),
      realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
      chatRepositoryProvider.overrideWithValue(FakeChatRepository()),
      announcementsRepositoryProvider.overrideWithValue(FakeAnnouncementsRepository()),
      supportRepositoryProvider.overrideWithValue(FakeSupportRepository()),
      lessonProgressRepositoryProvider.overrideWithValue(FakeLessonProgressRepository()),
    ],
    child: Consumer(builder: (context, ref, _) {
      router = ref.watch(routerProvider);
      return const AzzaApp();
    }),
  ));
  await settle(tester, 10);
  return router;
}

/// The top-most location, pushed routes included.
String _at(GoRouter r) => r.state.uri.toString();

final _cert = Certificate(
  code: 'AZ-CERT-7Q4K',
  batchId: 'b5',
  batchCode: 'B05',
  course: const Course(id: 'c1', slug: 'product-design', titleEn: 'Product Design Foundations'),
  courseTitle: 'Product Design Foundations',
  teacherName: 'Lina Haddad',
  attended: 11,
  total: 12,
  holderName: 'Sara Kamal',
);

void main() {
  group('lesson progress', () {
    test('progress follows reading order, with local toggles over the server', () {
      final c = CourseLessons.fromJson(_lessonsJson(done: {'l1'}));
      expect(c.progress?.completed, 1);
      expect(c.lesson('l1')!.completed, isTrue);
      final p = c.progressWith();
      expect((p.completed, p.total, p.nextLesson?.id, p.nextLesson?.moduleTitleEn), (1, 3, 'l2', 'Basics'));
      final after = c.progressWith({'l2': true, 'l1': false});
      expect((after.completed, after.nextLesson?.id), (1, 'l1'));
      final all = c.progressWith({'l2': true, 'l3': true});
      expect((all.allDone, all.nextLesson), (true, null));
      expect(CourseProgress.fromJson({
        'courseId': 'c1',
        'slug': 'product-design',
        'titleEn': 'Product Design Foundations',
        'completed': 4,
        'total': 12,
        'nextLesson': {'id': 'l5', 'titleEn': 'Shapes', 'titleAr': 'الأشكال', 'moduleId': 'm1', 'moduleTitleEn': 'Basics'},
      }).progress.nextLesson?.titleAr, 'الأشكال');
    });

    testWidgets('mark as complete saves, moves to the next lesson, and the list shows the check and the bar', (tester) async {
      final repo = FakeLessonProgressRepository();
      final router = await _pumpLessons(tester, repo);
      expect(find.text('Mark as complete'), findsOneWidget);

      await tester.tap(find.byKey(const Key('lesson-complete')));
      await settle(tester);
      expect(repo.toggles, [('l1', true)]);
      expect(router.state.uri.path, '/courses/c1/lessons/l2');
      expect(find.text('Shapes'), findsWidgets);

      router.go('/courses/c1/lessons');
      await settle(tester);
      expect(find.byKey(const Key('lesson-done-l1')), findsOneWidget);
      expect(find.byKey(const Key('lesson-done-l2')), findsNothing);
      expect(find.text('1 of 3 lessons'), findsOneWidget);
      expect(find.text('Resume: Shapes'), findsOneWidget);
    });

    testWidgets('a completed lesson toggles back to not done', (tester) async {
      final repo = FakeLessonProgressRepository();
      await _pumpLessons(tester, repo, at: '/courses/c1/lessons/l3', done: {'l1', 'l2', 'l3'});
      expect(find.text('Completed'), findsOneWidget);
      await tester.tap(find.byKey(const Key('lesson-complete')));
      await settle(tester);
      expect(repo.toggles, [('l3', false)]);
      expect(find.text('Mark as complete'), findsOneWidget);
    });

    testWidgets('all lessons done shows on the list, without Resume', (tester) async {
      await _pumpLessons(tester, FakeLessonProgressRepository(), at: '/courses/c1/lessons', done: {'l1', 'l2', 'l3'});
      expect(find.text('3 of 3 lessons'), findsOneWidget);
      expect(find.byKey(const Key('lessons-resume')), findsNothing);
      expect(find.byKey(const Key('lesson-done-l3')), findsOneWidget);
    });

    testWidgets('a refused toggle rolls back and says so', (tester) async {
      final repo = FakeLessonProgressRepository(error: const AppException('NETWORK', 'offline'));
      final router = await _pumpLessons(tester, repo);
      await tester.tap(find.byKey(const Key('lesson-complete')));
      await settle(tester);
      expect(find.text("Your progress wasn't saved. Try again."), findsOneWidget);
      router.go('/courses/c1/lessons');
      await settle(tester);
      expect(find.byKey(const Key('lesson-done-l1')), findsNothing);
      expect(find.text('0 of 3 lessons'), findsOneWidget);
      expect(find.text('Start: Lines'), findsOneWidget);
    });
  });

  group('certificate verify', () {
    testWidgets('a real code shows who earned it and for what', (tester) async {
      await pumpScreen(tester, const CertificateVerifyScreen(code: 'AZ-CERT-7Q4K'), overrides: [
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository(CertificatesOverview(items: [_cert]))),
      ]);
      await settle(tester);
      expect(find.byKey(const Key('verify-valid')), findsOneWidget);
      expect(find.text('Certificate verified'), findsOneWidget);
      expect(find.text('Azza issued this certificate to Sara Kamal for completing Product Design Foundations.'), findsOneWidget);
      expect(find.byKey(const Key('cert-card')), findsOneWidget);
    });

    testWidgets('an unknown code says it could not be verified', (tester) async {
      await pumpScreen(tester, const CertificateVerifyScreen(code: 'AZ-NOPE'), overrides: [
        certificatesRepositoryProvider.overrideWithValue(FakeCertificatesRepository()),
      ]);
      await settle(tester);
      expect(find.byKey(const Key('verify-invalid')), findsOneWidget);
      expect(find.text("We couldn't verify this certificate"), findsOneWidget);
      expect(find.text('AZ-NOPE'), findsOneWidget);
    });

    testWidgets('a guest opens /verify/:code straight from a link', (tester) async {
      final router = await _bootGuest(tester);
      router.go(Routes.verifyCertificate('AZ-CERT-1'));
      await settle(tester);
      expect(_at(router), '/verify/AZ-CERT-1');
      expect(find.byKey(const Key('verify-invalid')), findsOneWidget);
      expect(find.byKey(const Key('verify-explore')), findsOneWidget);
    });
  });

  group('guest browsing', () {
    testWidgets('Welcome → Browse courses opens Explore in the student shell', (tester) async {
      final router = await _bootGuest(tester);
      expect(_at(router), Routes.welcome);
      await tester.ensureVisible(find.byKey(const Key('welcome-browse')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('welcome-browse')));
      await settle(tester);
      expect(_at(router), Routes.studentExplore);
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.text('Product Design Foundations'), findsWidgets);
    });

    testWidgets('tabs that need an account show a sign-in prompt instead of failing', (tester) async {
      final router = await _bootGuest(tester);
      for (final (path, title) in [
        (Routes.studentHome, 'Your learning, in one place'),
        (Routes.studentSchedule, 'Your week of learning'),
        (Routes.studentLibrary, 'Your lessons and recordings'),
        (Routes.studentMe, 'Make it yours'),
      ]) {
        router.go(path);
        await settle(tester);
        expect(_at(router), path);
        expect(find.byKey(const Key('guest-prompt')), findsOneWidget, reason: path);
        expect(find.text(title), findsOneWidget, reason: path);
        expect(tester.takeException(), isNull);
      }
      // Me keeps the legal links for guests.
      await tester.scrollUntilVisible(find.byKey(const Key('guest-terms')), 200, scrollable: find.byType(Scrollable).first);
      expect(find.byKey(const Key('guest-privacy')), findsOneWidget);
    });

    testWidgets('the sign-in prompt carries the way back', (tester) async {
      final router = await _bootGuest(tester);
      router.go(Routes.studentLibrary);
      await settle(tester);
      await tester.tap(find.byKey(const Key('guest-sign-in')));
      await settle(tester);
      expect(_at(router), '/sign-in?from=%2Fstudent%2Flibrary');
    });

    testWidgets('/teach shows "create an account to apply"', (tester) async {
      final router = await _bootGuest(tester);
      router.go(Routes.teachOnAzza);
      await settle(tester);
      expect(find.byKey(const Key('teach-guest')), findsOneWidget);
      await tester.tap(find.byKey(const Key('teach-guest-sign-up')));
      await settle(tester);
      expect(_at(router), '/sign-up?from=%2Fteach');
      expect(find.byKey(const Key('resume-notice')), findsOneWidget);
    });

    testWidgets('Explore → course → enroll → sign in → back on the course', (tester) async {
      final router = await _bootGuest(tester);
      router.go(Routes.studentExplore);
      await settle(tester);
      await tester.tap(find.text('Product Design Foundations').first);
      await settle(tester, 10);
      // The course opens inside Explore: the tab bar stays.
      expect(_at(router), '/student/explore/courses/product-design');
      expect(find.byType(NavigationBar), findsOneWidget);

      // Saving asks for an account too.
      expect(find.byKey(const Key('save-course')), findsOneWidget);

      await tester.tap(find.byKey(const Key('course-enroll')));
      await settle(tester);
      expect(_at(router), '/sign-in?from=%2Fstudent%2Fexplore%2Fcourses%2Fproduct-design');
      expect(find.byKey(const Key('resume-notice')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('email')), 'sara@example.com');
      await tester.enterText(find.byKey(const Key('password')), 'secret-pass');
      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await settle(tester, 12);
      expect(_at(router), '/student/explore/courses/product-design');
      expect(find.byKey(const Key('course-enroll')), findsOneWidget);

      // Signed in now: enroll goes on to choosing a class.
      await tester.tap(find.byKey(const Key('course-enroll')));
      await settle(tester);
      expect(_at(router), '/student/explore${Routes.batchPicker('c1')}');
    });

    testWidgets('the heart sends a guest to sign in and back', (tester) async {
      final router = await _bootGuest(tester);
      router.go(Routes.course('product-design'));
      await settle(tester, 10);
      await tester.tap(find.byKey(const Key('save-course')));
      await settle(tester);
      expect(_at(router), '/sign-in?from=%2Fstudent%2Fexplore%2Fcourses%2Fproduct-design');
      // "Not now" returns to the course.
      await tester.tap(find.byKey(const Key('auth-close')));
      await settle(tester, 10);
      expect(_at(router), '/student/explore/courses/product-design');
    });
  });
}
