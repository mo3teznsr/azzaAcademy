import 'package:azza/core/domain/enums.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/learn/presentation/assignments_screen.dart';
import 'package:azza/features/learn/presentation/lesson_screen.dart';
import 'package:azza/features/live/domain/live_models.dart';
import 'package:azza/features/me/data/calendar_repository.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/me/presentation/profile_screen.dart';
import 'package:azza/features/me/presentation/schedule_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

void main() {
  final now = DateTime.now();

  group('assignments', () {
    Enrollment enrol(String batchId, String courseTitle) => Enrollment(
          id: 'e-$batchId',
          status: EnrollmentStatus.active,
          batch: Batch(id: batchId, code: batchId.toUpperCase(), courseId: 'c-$batchId', course: Course(id: 'c-$batchId', slug: batchId, titleEn: courseTitle)),
        );

    testWidgets('a class picker switches classes and due / overdue states are clear', (tester) async {
      final learn = _AssignmentsLearn({
        'b7': [
          Assignment(id: 'a1', title: 'Moodboard', dueAt: now.subtract(const Duration(days: 1))),
          Assignment(id: 'a2', title: 'User flow', dueAt: now.add(const Duration(days: 2))),
        ],
        'b9': [Assignment(id: 'a3', title: 'Brand voice', dueAt: now.add(const Duration(days: 4)))],
      });
      await pumpScreen(tester, const AssignmentsScreen(), overrides: [
        meRepositoryProvider.overrideWithValue(FakeMeRepository(enrollmentList: [enrol('b7', 'Product Design'), enrol('b9', 'Copywriting')])),
        learnRepositoryProvider.overrideWithValue(learn),
      ]);
      await settle(tester);

      expect(find.byKey(const Key('assignments-class-picker')), findsOneWidget);
      expect(find.text('Product Design'), findsOneWidget);
      expect(find.text('Copywriting'), findsOneWidget);
      expect(find.text('Moodboard'), findsOneWidget);
      expect(find.byKey(const Key('overdue-a1')), findsOneWidget);
      expect(find.textContaining('Was due'), findsOneWidget);
      expect(find.text('You can still hand it in. It will be marked late.'), findsOneWidget);
      expect(find.byKey(const Key('overdue-a2')), findsNothing);
      expect(find.textContaining('Due '), findsOneWidget);

      await tester.tap(find.byKey(const Key('class-b9')));
      await settle(tester);
      expect(find.text('Brand voice'), findsOneWidget);
      expect(find.text('Moodboard'), findsNothing);
      expect(learn.asked, containsAll(['b7', 'b9']));
    });

    testWidgets('a batchId from the route preselects that class', (tester) async {
      await pumpScreen(tester, const AssignmentsScreen(batchId: 'b9'), overrides: [
        meRepositoryProvider.overrideWithValue(FakeMeRepository(enrollmentList: [enrol('b7', 'Product Design'), enrol('b9', 'Copywriting')])),
        learnRepositoryProvider.overrideWithValue(_AssignmentsLearn({
          'b9': [Assignment(id: 'a3', title: 'Brand voice', dueAt: now.add(const Duration(days: 4)))],
        })),
      ]);
      await settle(tester);
      expect(find.text('Brand voice'), findsOneWidget);
    });
  });

  group('lesson end CTA', () {
    Future<void> pumpLesson(WidgetTester tester, String lessonId, List<QuizSummary> quizzes) => pumpScreen(
          tester,
          LessonScreen(courseId: 'c1', lessonId: lessonId),
          overrides: [
            currentUserProvider.overrideWithValue(student),
            lessonsRepositoryProvider.overrideWithValue(_Lessons()),
            quizzesRepositoryProvider.overrideWithValue(_Quizzes(quizzes)),
          ],
        );

    testWidgets('the last lesson of a module offers its quiz: Practise now', (tester) async {
      await pumpLesson(tester, 'l2', const [
        QuizSummary(id: 'q1', batchId: 'b7', title: 'Basics check', moduleId: 'm1', mine: QuizProgress(canStart: true)),
        QuizSummary(id: 'q2', batchId: 'b7', title: 'Layout check', moduleId: 'm2'),
      ]);
      await settle(tester);
      expect(find.byKey(const Key('lesson-module-end')), findsOneWidget);
      expect(find.text('Practise now'), findsOneWidget);
      expect(find.textContaining('Basics check'), findsOneWidget);
      expect(find.text('Next module'), findsOneWidget);
    });

    testWidgets('without a quiz the CTA is Next module', (tester) async {
      await pumpLesson(tester, 'l2', const []);
      await settle(tester);
      expect(find.byKey(const Key('lesson-practise')), findsNothing);
      expect(find.text('Next module'), findsOneWidget);
      expect(find.text('Keep going with the next module.'), findsOneWidget);
    });

    testWidgets('mid-module lessons keep Next lesson and no CTA', (tester) async {
      await pumpLesson(tester, 'l1', const [QuizSummary(id: 'q1', batchId: 'b7', title: 'Basics check', moduleId: 'm1')]);
      await settle(tester);
      expect(find.byKey(const Key('lesson-module-end')), findsNothing);
      expect(find.text('Next lesson'), findsOneWidget);
    });
  });

  group('calendar subscribe', () {
    const feed = CalendarFeed(url: 'https://api.azza.test/api/calendar/u-s/abc.ics', webcalUrl: 'webcal://api.azza.test/api/calendar/u-s/abc.ics');

    testWidgets('opens the webcal feed in the system calendar', (tester) async {
      final opened = <Uri>[];
      final copied = <String>[];
      await pumpScreen(tester, const ScheduleScreen(role: Role.student), overrides: [
        meRepositoryProvider.overrideWithValue(FakeMeRepository()),
        calendarRepositoryProvider.overrideWithValue(_Calendar(feed)),
        externalUrlOpenerProvider.overrideWithValue((uri) async {
          opened.add(uri);
          return true;
        }),
        clipboardWriterProvider.overrideWithValue((t) async => copied.add(t)),
      ]);
      await settle(tester);

      expect(find.byTooltip('Add to my calendar'), findsOneWidget);
      await tester.tap(find.byKey(const Key('calendar-subscribe')));
      await settle(tester);
      expect(opened, [Uri.parse(feed.webcalUrl)]);
      expect(copied, isEmpty);
    });

    testWidgets('falls back to https, then copies the link', (tester) async {
      final opened = <Uri>[];
      final copied = <String>[];
      await pumpScreen(tester, const ScheduleScreen(role: Role.student), overrides: [
        meRepositoryProvider.overrideWithValue(FakeMeRepository()),
        calendarRepositoryProvider.overrideWithValue(_Calendar(feed)),
        externalUrlOpenerProvider.overrideWithValue((uri) async {
          opened.add(uri);
          return false;
        }),
        clipboardWriterProvider.overrideWithValue((t) async => copied.add(t)),
      ]);
      await settle(tester);

      await tester.tap(find.byKey(const Key('calendar-subscribe')));
      await settle(tester);
      expect(opened, [Uri.parse(feed.webcalUrl), Uri.parse(feed.url)]);
      expect(copied, [feed.url]);
      expect(find.text('Calendar link copied. Paste it into your calendar app to subscribe.'), findsOneWidget);
    });
  });

  group('after session and profile', () {
    test('session detail reads its practice (assignments)', () {
      final d = SessionDetail.fromJson({
        'id': 's5',
        'number': 5,
        'title': 'Wireframes',
        'startsAt': now.toIso8601String(),
        'assignments': [
          {'id': 'a1', 'title': 'Moodboard', 'dueAt': now.toIso8601String()},
        ],
      });
      expect(d.assignments.single.title, 'Moodboard');
    });

    for (final (user, shown) in [(teacher, false), (admin, false), (student, true)]) {
      testWidgets('Saved courses on the profile: ${user.role.name} ${shown ? 'sees it' : 'does not'}', (tester) async {
        await pumpScreen(tester, const ProfileScreen(), overrides: [
          authRepositoryProvider.overrideWithValue(FakeAuthRepository(user)),
          meRepositoryProvider.overrideWithValue(FakeMeRepository()),
        ]);
        tester.view.physicalSize = const Size(1170, 6000);
        await settle(tester, 12);
        expect(find.text('Saved courses', skipOffstage: false), shown ? findsOneWidget : findsNothing);
      });
    }
  });
}

class _AssignmentsLearn extends FakeLearnRepository {
  _AssignmentsLearn(this.byBatch);
  final Map<String, List<Assignment>> byBatch;
  final asked = <String>[];

  @override
  Future<List<Assignment>> assignments(String batchId) async {
    asked.add(batchId);
    return byBatch[batchId] ?? const [];
  }
}

class _Quizzes implements QuizzesRepository {
  _Quizzes(this.list);
  final List<QuizSummary> list;

  @override
  Future<List<QuizSummary>> myQuizzes() async => list;

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

class _Calendar implements CalendarRepository {
  _Calendar(this.value);
  final CalendarFeed value;

  @override
  Future<CalendarFeed> feed() async => value;
}

class _Lessons implements LessonsRepository {
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async => CourseLessons.fromJson({
        'course': {'id': 'c1', 'slug': 'product-design', 'titleEn': 'Product Design Foundations'},
        'modules': [
          {
            'id': 'm1',
            'order': 1,
            'titleEn': 'Basics',
            'lessons': [
              {'id': 'l1', 'moduleId': 'm1', 'order': 1, 'titleEn': 'Lines', 'bodyEn': 'Draw lines.'},
              {'id': 'l2', 'moduleId': 'm1', 'order': 2, 'titleEn': 'Shapes', 'bodyEn': 'Draw shapes.'},
            ],
          },
          {
            'id': 'm2',
            'order': 2,
            'titleEn': 'Layout',
            'lessons': [
              {'id': 'l3', 'moduleId': 'm2', 'order': 1, 'titleEn': 'Grids', 'bodyEn': 'Use grids.'},
            ],
          },
        ],
      });
}
