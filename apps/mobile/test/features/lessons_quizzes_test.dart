import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/core/utils/formatters.dart';
import 'package:azza/features/learn/data/lessons_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/lesson_models.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/learn/presentation/course_lessons_screen.dart';
import 'package:azza/features/learn/presentation/quiz_result_screen.dart';
import 'package:azza/features/learn/presentation/quiz_screen.dart';
import 'package:azza/features/learn/presentation/quiz_take_screen.dart';
import 'package:azza/features/learn/presentation/quiz_widgets.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/teacher/presentation/batch_quizzes_screen.dart';
import 'package:azza/features/teacher/presentation/quiz_results_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/harness.dart';

final _lessonsJson = <String, dynamic>{
  'course': {'id': 'c1', 'slug': 'product-design', 'titleEn': 'Product Design', 'titleAr': 'تصميم المنتجات', 'status': 'PUBLISHED'},
  'modules': [
    {
      'id': 'm2', 'order': 2, 'titleEn': 'Research', 'titleAr': null, 'descriptionEn': null, 'descriptionAr': null,
      'lessons': [
        {'id': 'l3', 'moduleId': 'm2', 'order': 1, 'titleEn': 'Interviews', 'titleAr': null, 'bodyEn': '# Interviews', 'bodyAr': null, 'videoUrl': null, 'attachments': []},
      ],
    },
    {
      'id': 'm1', 'order': 1, 'titleEn': 'Seeing', 'titleAr': 'الرؤية', 'descriptionEn': 'Start here', 'descriptionAr': null,
      'lessons': [
        {'id': 'l2', 'moduleId': 'm1', 'order': 2, 'titleEn': 'Shapes', 'titleAr': 'الأشكال', 'bodyEn': 'Body', 'bodyAr': 'نص', 'videoUrl': 'https://youtu.be/dQw4w9WgXcQ', 'attachments': [{'title': 'Sheet', 'url': 'https://cdn/x.pdf'}]},
        {'id': 'l1', 'moduleId': 'm1', 'order': 1, 'titleEn': 'Lines', 'titleAr': null, 'bodyEn': '**Bold**', 'bodyAr': null, 'videoUrl': null, 'attachments': []},
      ],
    },
  ],
};

Map<String, dynamic> _question(String id, String type, List<String> options) => {
      'id': id,
      'type': type,
      'promptEn': 'Prompt $id',
      'promptAr': null,
      'points': 2,
      'options': [for (final o in options) {'id': o, 'textEn': 'Option $o', 'textAr': null}],
    };

Map<String, dynamic> _viewJson({bool reveal = false, bool canStart = true, List<Map<String, dynamic>> attempts = const [], Map<String, dynamic>? open, int? timeLimitMin}) => {
      'quiz': {
        'id': 'q1', 'batchId': 'b7', 'title': 'Week 1 check', 'description': 'Ten minutes on lines.', 'dueAt': null,
        'timeLimitMin': timeLimitMin, 'maxAttempts': 2, 'status': 'PUBLISHED', 'questionCount': 2, 'totalPoints': 4,
        'questions': [_question('x1', 'SINGLE', ['a', 'b']), _question('x2', 'MULTIPLE', ['c', 'd', 'e'])],
      },
      'progress': {
        'status': attempts.isEmpty ? 'OPEN' : 'SUBMITTED', 'attemptsUsed': attempts.length, 'attemptsLeft': 2 - attempts.length,
        'canStart': canStart, 'bestScore': attempts.isEmpty ? null : 3, 'bestPercent': attempts.isEmpty ? null : 75, 'maxScore': 4,
      },
      'reveal': reveal,
      'openAttempt': open,
      'attempts': attempts,
      if (reveal) 'answerKey': {'x1': ['a'], 'x2': ['c', 'd']},
    };

Map<String, dynamic> _attempt({bool withQuestions = false}) => {
      'id': 'a1', 'number': 1, 'startedAt': '2026-11-05T10:00:00Z', 'submittedAt': '2026-11-05T10:05:00Z',
      'score': 3, 'maxScore': 4, 'percent': 75, 'timedOut': false,
      if (withQuestions)
        'questions': [
          {'questionId': 'x1', 'selected': ['a'], 'correct': true, 'earned': 2, 'points': 2, 'correctOptionIds': ['a']},
          {'questionId': 'x2', 'selected': ['c'], 'correct': false, 'earned': 1, 'points': 2, 'correctOptionIds': ['c', 'd']},
        ],
    };

class _FakeQuizzes implements QuizzesRepository {
  _FakeQuizzes(this.view);
  QuizView view;
  Map<String, List<String>>? submitted;
  int starts = 0;

  @override
  Future<List<QuizSummary>> myQuizzes() async => const [];

  @override
  Future<List<QuizSummary>> batchQuizzes(String batchId) async => [
        QuizSummary.fromJson({'id': 'q1', 'batchId': batchId, 'title': 'Week 1 check', 'status': 'PUBLISHED', 'questionCount': 2, 'maxAttempts': 2, 'attemptCount': 5, 'studentsAttempted': 3}),
        QuizSummary.fromJson({'id': 'q2', 'batchId': batchId, 'title': 'Week 2 draft', 'status': 'DRAFT', 'questionCount': 0, 'maxAttempts': 1, 'attemptCount': 0, 'studentsAttempted': 0}),
      ];

  @override
  Future<QuizView> quiz(String id) async => view;

  @override
  Future<QuizView> start(String id) async {
    starts++;
    return view;
  }

  @override
  Future<QuizView> submit(String id, Map<String, List<String>> answers) async {
    submitted = answers;
    return view = QuizView.fromJson({..._viewJson(attempts: [_attempt()]), 'result': _attempt()});
  }

  @override
  Future<QuizResults> results(String id) async => QuizResults.fromJson({
        'quiz': {'id': id, 'title': 'Week 1 check', 'status': 'PUBLISHED', 'dueAt': null, 'timeLimitMin': 10, 'maxAttempts': 2, 'questionCount': 2, 'totalPoints': 4},
        'summary': {'students': 4, 'submitted': 2, 'averagePercent': 63},
        'students': [
          {'user': {'id': 'u1', 'name': 'Sara Kamal', 'email': 's@x', 'image': null}, 'attempts': 2, 'bestScore': 3, 'bestPercent': 75, 'lastSubmittedAt': '2026-11-05T10:05:00Z'},
          {'user': {'id': 'u2', 'name': 'Omar Ali', 'email': 'o@x', 'image': null}, 'attempts': 0, 'bestScore': null, 'bestPercent': null, 'lastSubmittedAt': null},
        ],
        'questions': [
          {'questionId': 'x1', 'type': 'SINGLE', 'promptEn': 'Which line is straight?', 'promptAr': null, 'points': 2, 'answered': 2, 'correct': 1, 'rate': 0.5},
        ],
      });
}

class _FakeLessons implements LessonsRepository {
  @override
  Future<CourseLessons> courseLessons(String courseIdOrSlug) async => CourseLessons.fromJson(_lessonsJson);
}

void main() {
  group('models', () {
    test('lessons sort modules and lessons, and pick Arabic when present', () {
      final c = CourseLessons.fromJson(_lessonsJson);
      expect(c.modules.map((m) => m.id), ['m1', 'm2']);
      expect(c.allLessons.map((l) => l.id), ['l1', 'l2', 'l3']);
      expect(c.lesson('l2')!.title(AppLocale.ar), 'الأشكال');
      expect(c.lesson('l1')!.title(AppLocale.ar), 'Lines');
      expect(c.lesson('l2')!.attachments.single.url, 'https://cdn/x.pdf');
    });

    test('video URLs are classified like the shared TS parser', () {
      expect(CourseVideoSource.parse('https://youtu.be/dQw4w9WgXcQ')?.kind, CourseVideoKind.youtube);
      expect(CourseVideoSource.parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.id, 'dQw4w9WgXcQ');
      expect(CourseVideoSource.parse('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.kind, CourseVideoKind.youtube);
      expect(CourseVideoSource.parse('https://vimeo.com/123456789')?.id, '123456789');
      expect(CourseVideoSource.parse('https://cdn.example.com/a/clip.MP4')?.kind, CourseVideoKind.file);
      expect(CourseVideoSource.parse('/uploads/course-videos/${'a' * 32}.mp4')?.kind, CourseVideoKind.file);
      expect(CourseVideoSource.parse('http://cdn.example.com/clip.mp4'), isNull);
      expect(CourseVideoSource.parse('https://youtube.com/watch?v=short'), isNull);
      expect(CourseVideoSource.parse('https://example.com/page'), isNull);
    });

    test('student quiz view parses progress, attempts and the answer key', () {
      final v = QuizView.fromJson(_viewJson(reveal: true, attempts: [_attempt(withQuestions: true)], timeLimitMin: 10));
      expect(v.quiz.timed, isTrue);
      expect(v.quiz.questions[1].multiple, isTrue);
      expect(v.progress.bestPercent, 75);
      expect(v.attempt('a1')!.question('x2')!.earned, 1);
      expect(v.answerKey!['x2'], ['c', 'd']);
      expect(QuizView.fromJson(_viewJson()).answerKey, isNull);
    });

    test('points keep partial credit readable', () {
      const f = Fmt();
      expect(fmtPoints(f, 3), '3');
      expect(fmtPoints(f, 2.5), '2.5');
      expect(fmtPoints(f, 4 / 3), '1.33');
    });

    test('quiz alerts open the quiz', () {
      expect(notificationRoute('QUIZ_PUBLISHED', {'quizId': 'q1', 'batchId': 'b7'}), '/quizzes/q1');
    });

    test('countdown clock', () {
      expect(quizClock(const Duration(minutes: 9, seconds: 5)), '09:05');
      expect(quizClock(const Duration(seconds: -3)), '00:00');
    });
  });

  testWidgets('course lessons list modules in order and number lessons', (tester) async {
    await pumpScreen(tester, const CourseLessonsScreen(courseId: 'c1'), overrides: [lessonsRepositoryProvider.overrideWithValue(_FakeLessons())]);
    await settle(tester);
    expect(find.text('Product Design'), findsOneWidget);
    expect(find.text('Seeing'), findsOneWidget);
    expect(find.text('Lines'), findsOneWidget);
    expect(find.text('3 LESSONS'), findsOneWidget);
  });

  testWidgets('quiz overview shows the best score and offers another try', (tester) async {
    final repo = _FakeQuizzes(QuizView.fromJson(_viewJson(attempts: [_attempt()])));
    await pumpScreen(tester, const QuizScreen(quizId: 'q1'), overrides: [quizzesRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);
    expect(find.text('Week 1 check'), findsOneWidget);
    expect(find.byKey(const Key('quiz-best')), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
    expect(find.byKey(const Key('attempt-a1')), findsOneWidget);
  });

  testWidgets('result hides answers until the quiz reveals them', (tester) async {
    final repo = _FakeQuizzes(QuizView.fromJson(_viewJson(attempts: [_attempt()])));
    await pumpScreen(tester, const QuizResultScreen(quizId: 'q1', attemptId: 'a1'), overrides: [quizzesRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);
    expect(find.text('75%'), findsOneWidget);
    expect(find.byKey(const Key('answers-hidden')), findsOneWidget);
  });

  testWidgets('revealed result marks correct and partly correct answers', (tester) async {
    final repo = _FakeQuizzes(QuizView.fromJson(_viewJson(reveal: true, attempts: [_attempt(withQuestions: true)])));
    await pumpScreen(tester, const QuizResultScreen(quizId: 'q1', attemptId: 'a1'), overrides: [quizzesRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);
    expect(find.byKey(const Key('answers-hidden')), findsNothing);
    expect(find.text('CORRECT'), findsOneWidget);
    expect(find.text('PARTLY CORRECT'), findsOneWidget);
  });

  testWidgets('taking a quiz: one question per card, confirm, submit the picks, land on the result', (tester) async {
    final repo = _FakeQuizzes(QuizView.fromJson(_viewJson(open: {'id': 'a1', 'number': 1, 'startedAt': '2026-11-05T10:00:00Z', 'deadline': null})));
    final router = GoRouter(initialLocation: '/quizzes/q1/take', routes: [
      GoRoute(path: '/quizzes/:id/take', builder: (_, s) => QuizTakeScreen(quizId: s.pathParameters['id']!)),
      GoRoute(path: '/quizzes/:id/attempts/:a', builder: (_, s) => QuizResultScreen(quizId: s.pathParameters['id']!, attemptId: s.pathParameters['a']!)),
    ]);
    addTearDown(router.dispose);
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final prefs = await testPrefs();
    await tester.pumpWidget(ProviderScope(
      retry: (_, _) => null,
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs), quizzesRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp.router(
        theme: AzzaTheme.build(ThemeVariant.student),
        locale: const Locale('en'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: localizationDelegates,
        routerConfig: router,
      ),
    ));
    await settle(tester);

    expect(repo.starts, 1);
    expect(find.text('QUESTION 1 OF 2'), findsOneWidget);
    expect(find.byKey(const Key('question-x1')), findsOneWidget);
    await tester.tap(find.byKey(const Key('option-b')));
    await tester.tap(find.byKey(const Key('option-a')));
    await tester.tap(find.byKey(const Key('quiz-next')));
    await settle(tester);

    expect(find.text('CHOOSE ALL THAT APPLY · 2 PTS'), findsOneWidget);
    await tester.tap(find.byKey(const Key('option-c')));
    await tester.tap(find.byKey(const Key('option-e')));
    await tester.tap(find.byKey(const Key('option-e')));
    await tester.tap(find.byKey(const Key('quiz-submit')));
    await settle(tester);
    expect(find.text('You answered 2 of 2 questions.'), findsOneWidget);
    await tester.tap(find.byKey(const Key('quiz-submit-confirm')));
    await settle(tester, 10);

    expect(repo.submitted, {'x1': ['a'], 'x2': ['c']});
    expect(find.byKey(const Key('quiz-score')), findsOneWidget);
  });

  testWidgets('teacher sees batch quizzes with the web-only note, and results per student and question', (tester) async {
    final repo = _FakeQuizzes(QuizView.fromJson(_viewJson()));
    await pumpScreen(tester, const BatchQuizzesScreen(batchId: 'b7'), overrides: [quizzesRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);
    expect(find.byKey(const Key('quizzes-web-note')), findsOneWidget);
    expect(find.text('3 students tried · 5 attempts'), findsOneWidget);
    expect(find.text('DRAFT'), findsOneWidget);

    await pumpScreen(tester, const QuizResultsScreen(quizId: 'q1'), overrides: [quizzesRepositoryProvider.overrideWithValue(repo)]);
    await settle(tester);
    expect(find.text('63%'), findsOneWidget);
    expect(find.text('Sara Kamal'), findsOneWidget);
    expect(find.text('No attempts yet'), findsOneWidget);
    expect(find.text('1 OF 2 CORRECT'), findsOneWidget);
  });
}
