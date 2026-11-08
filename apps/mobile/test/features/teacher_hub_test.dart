import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/domain/quiz_models.dart';
import 'package:azza/features/live/domain/live_models.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/data/studio_repository.dart';
import 'package:azza/features/teacher/data/teacher_repository.dart';
import 'package:azza/features/teacher/domain/studio_models.dart';
import 'package:azza/features/teacher/presentation/assignment_editor_screen.dart';
import 'package:azza/features/teacher/presentation/grading_screens.dart';
import 'package:azza/features/teacher/presentation/quiz_editor_screen.dart';
import 'package:azza/features/teacher/presentation/roster_screen.dart';
import 'package:azza/features/teacher/presentation/teacher_today_screen.dart';
import 'package:azza/core/utils/formatters.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';
import '../helpers/teacher_fakes.dart';

const _course = Course(id: 'c1', slug: 'design-basics', titleEn: 'Design basics', category: 'design');

Batch _batch({String id = 'b7', String code = 'B07', BatchStatus status = BatchStatus.running, List<SessionSummary> sessions = const []}) =>
    Batch(id: id, code: code, courseId: 'c1', course: _course, capacity: 12, status: status, seatsTaken: 2, sessionCount: 8, sessions: sessions);

final _due = DateTime.now().subtract(const Duration(days: 1));
final _assignment = Assignment(id: 'a1', title: 'Moodboard', dueAt: _due, maxScore: 10, submissionCount: 2, description: 'Collect 10 references.');

List<Override> _base({
  required List<Batch> batches,
  FakeTeacherStudioRepository? studio,
  FakeTeacherRepository? teacherRepo,
  FakeClassLearnRepository? learn,
  FakeBatchQuizzes? quizzes,
  FakeMaterialPicker? picker,
  FakeMeRepository? me,
  FakeProposalsRepository? proposals,
}) =>
    [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(batchList: batches, courseList: const [_course])),
      teacherStudioRepositoryProvider.overrideWithValue(studio ?? FakeTeacherStudioRepository()),
      teacherRepositoryProvider.overrideWithValue(teacherRepo ?? FakeTeacherRepository()),
      learnRepositoryProvider.overrideWithValue(learn ?? FakeClassLearnRepository()),
      quizzesRepositoryProvider.overrideWithValue(quizzes ?? FakeBatchQuizzes()),
      materialFilePickerProvider.overrideWithValue(picker ?? FakeMaterialPicker()),
      meRepositoryProvider.overrideWithValue(me ?? FakeMeRepository()),
      proposalsRepositoryProvider.overrideWithValue(proposals ?? FakeProposalsRepository()),
      messagesUnreadProvider.overrideWithValue(0),
    ];

/// Pumps [screen] as a child route of a stub home, so `context.pop()` works.
Future<void> _pumpRouted(WidgetTester tester, Widget screen, List<Override> overrides) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final prefs = await testPrefs();
  final router = GoRouter(initialLocation: '/screen', routes: [
    GoRoute(path: '/', builder: (_, _) => const Scaffold(body: Text('HOME')), routes: [
      GoRoute(path: 'screen', builder: (_, _) => screen),
    ]),
  ]);
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [sharedPreferencesProvider.overrideWithValue(prefs), ...overrides],
    child: MaterialApp.router(
      theme: AzzaTheme.build(ThemeVariant.teacher),
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: localizationDelegates,
      routerConfig: router,
    ),
  ));
}

final _vertical = find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down);

Future<void> _reveal(WidgetTester tester, Finder f) async {
  if (f.evaluate().isEmpty) await tester.scrollUntilVisible(f, 200, scrollable: _vertical.last);
  await tester.ensureVisible(f);
}

Future<void> _tapVisible(WidgetTester tester, Finder f) async {
  await _reveal(tester, f);
  await tester.pump();
  await tester.tap(f);
  await settle(tester);
}

void main() {
  group('class hub', () {
    testWidgets('titles the class "{course} · {code}" and switches between the five sections', (tester) async {
      final learn = FakeClassLearnRepository(
        assignmentMap: {'b7': [_assignment]},
        materialMap: {'b7': const [CourseMaterial(id: 'm1', title: 'Week 1 slides', url: 'https://x.dev/s', kind: 'SLIDES')]},
        recordingList: [
          const Recording(sessionId: 's1', title: 'Colour', number: 1, batchId: 'b7', batchCode: 'B07', url: 'https://x.dev/r.mp4'),
          const Recording(sessionId: 's9', title: 'Other class', number: 1, batchId: 'b9', batchCode: 'B09'),
        ],
      );
      await pumpScreen(tester, const RosterScreen(batchId: 'b7'), overrides: _base(
        batches: [_batch()],
        learn: learn,
        teacherRepo: FakeTeacherRepository(rosters: {
          'b7': const [RosterStudent(id: 'u1', name: 'Sara Kamal', attendancePct: 50), RosterStudent(id: 'u2', name: 'Omar Ali', attendancePct: 90)],
        }),
        quizzes: FakeBatchQuizzes([const QuizSummary(id: 'q1', batchId: 'b7', title: 'Module 1 check', draft: true)]),
      ));
      await settle(tester, 10);

      expect(find.text('Design basics · B07'), findsOneWidget);
      expect(find.text('B07 roster'), findsNothing);
      // Chat and announcements are labelled chips, not icon-only buttons.
      expect(find.widgetWithText(ActionChip, 'Class chat'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'Announcements'), findsOneWidget);
      expect(find.byKey(const Key('batch-sessions')), findsOneWidget);

      await _tapVisible(tester, find.byKey(const Key('hub-tab-students')));
      expect(find.text('Sara Kamal'), findsOneWidget);
      expect(find.text('Omar Ali'), findsOneWidget);

      await _tapVisible(tester, find.byKey(const Key('hub-tab-practice')));
      expect(find.byKey(const Key('hub-assignment-a1')), findsOneWidget);
      expect(find.byKey(const Key('hub-quiz-q1')), findsOneWidget);

      await _tapVisible(tester, find.byKey(const Key('hub-tab-materials')));
      expect(find.text('Week 1 slides'), findsOneWidget);

      await _tapVisible(tester, find.byKey(const Key('hub-tab-recordings')));
      expect(find.byKey(const Key('hub-recording-s1')), findsOneWidget);
      expect(find.byKey(const Key('hub-recording-s9')), findsNothing);
    });

    testWidgets('opens Students filtered to at-risk from a deep link', (tester) async {
      await pumpScreen(tester, const RosterScreen(batchId: 'b7', initialSection: ClassHubSection.students, initialAtRisk: true), overrides: _base(
        batches: [_batch()],
        teacherRepo: FakeTeacherRepository(rosters: {
          'b7': const [RosterStudent(id: 'u1', name: 'Sara Kamal', attendancePct: 50), RosterStudent(id: 'u2', name: 'Omar Ali', attendancePct: 90)],
        }),
      ));
      await settle(tester, 10);
      expect(find.text('Sara Kamal'), findsOneWidget);
      expect(find.text('Omar Ali'), findsNothing);
    });
  });

  testWidgets('creating an assignment validates, then posts title, instructions, due date and max score', (tester) async {
    final studio = FakeTeacherStudioRepository();
    await _pumpRouted(tester, const AssignmentEditorScreen(batchId: 'b7'), _base(batches: [_batch()], studio: studio));
    await settle(tester, 10);

    await tester.tap(find.byKey(const Key('save-assignment')));
    await settle(tester);
    expect(find.text('Add a title of at least 2 characters.'), findsOneWidget);
    expect(studio.createdAssignments, isEmpty);

    await tester.enterText(find.byKey(const Key('assignment-title')), 'Moodboard');
    await tester.enterText(find.byKey(const Key('assignment-instructions')), 'Collect 10 references.');
    await tester.enterText(find.byKey(const Key('assignment-max-score')), '0');
    await settle(tester);
    expect(find.text('Enter a whole number from 1 to 1000.'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('assignment-max-score')), '20');
    await tester.tap(find.byKey(const Key('save-assignment')));
    await settle(tester, 10);

    expect(studio.createdAssignments, hasLength(1));
    final (batchId, draft) = studio.createdAssignments.single;
    expect(batchId, 'b7');
    expect(draft.title, 'Moodboard');
    expect(draft.description, 'Collect 10 references.');
    expect(draft.maxScore, 20);
    expect(draft.dueAt.isAfter(DateTime.now()), isTrue);
    expect(draft.toJson()['dueAt'], endsWith('Z'));
    expect(find.text('HOME'), findsOneWidget); // popped back
  });

  testWidgets('grading: shows late and graded states, refuses a score over the max, saves score and feedback', (tester) async {
    final studio = FakeTeacherStudioRepository(subs: {
      'a1': [
        Submission(id: 's1', assignmentId: 'a1', studentName: 'Sara Kamal', submittedAt: _due.add(const Duration(hours: 3)), text: 'My moodboard notes'),
        Submission(id: 's2', assignmentId: 'a1', studentName: 'Omar Ali', submittedAt: _due.subtract(const Duration(hours: 3)), url: 'https://figma.com/x', score: 9),
      ],
    });
    await pumpScreen(tester, const SubmissionsScreen(batchId: 'b7', assignmentId: 'a1'), overrides: _base(
      batches: [_batch()],
      studio: studio,
      learn: FakeClassLearnRepository(assignmentMap: {'b7': [_assignment]}),
    ));
    await settle(tester, 10);

    expect(find.byKey(const Key('late-s1')), findsOneWidget);
    expect(find.byKey(const Key('late-s2')), findsNothing);
    expect(find.byKey(const Key('graded-s2')), findsOneWidget);
    expect(find.textContaining(RegExp('graded 9/10', caseSensitive: false)), findsOneWidget);

    await tester.tap(find.byKey(const Key('submission-s1')));
    await settle(tester, 10);
    expect(find.text('My moodboard notes'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('grade-score')), '11');
    await settle(tester);
    expect(find.text('Enter a whole number from 0 to 10.'), findsOneWidget);
    await tester.tap(find.byKey(const Key('save-grade')));
    await settle(tester);
    expect(studio.grades, isEmpty);

    await tester.enterText(find.byKey(const Key('grade-score')), '8');
    await tester.enterText(find.byKey(const Key('grade-feedback')), 'Strong palette. Add type samples.');
    await tester.ensureVisible(find.byKey(const Key('save-grade')));
    await tester.tap(find.byKey(const Key('save-grade')));
    await settle(tester, 10);
    expect(studio.grades.single, (id: 's1', score: 8, feedback: 'Strong palette. Add type samples.'));
  });

  testWidgets('quiz editor: builds a question, marks the correct option, saves and publishes', (tester) async {
    final studio = FakeTeacherStudioRepository();
    await _pumpRouted(tester, const QuizEditorScreen(batchId: 'b7'), _base(batches: [_batch()], studio: studio));
    await settle(tester, 10);
    expect(find.byKey(const Key('quiz-status-draft')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('quiz-title')), 'Module 1 check');
    await tester.enterText(find.byKey(const Key('quiz-time-limit')), '15');
    await _reveal(tester, find.byKey(const Key('q0-prompt')));
    await tester.enterText(find.byKey(const Key('q0-prompt')), 'Which colour is warm?');
    await _reveal(tester, find.byKey(const Key('q0-option-1')));
    await tester.enterText(find.byKey(const Key('q0-option-0')), 'Blue');
    await tester.enterText(find.byKey(const Key('q0-option-1')), 'Orange');
    await _reveal(tester, find.byKey(const Key('q0-correct-1')));
    await tester.tap(find.byKey(const Key('q0-correct-1')));
    await settle(tester);

    await tester.tap(find.byKey(const Key('publish-quiz')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('confirm-publish-quiz')));
    await settle(tester, 10);

    expect(studio.createdQuizzes, hasLength(1));
    final draft = studio.createdQuizzes.single.$2;
    expect(draft.title, 'Module 1 check');
    expect(draft.timeLimitMin, 15);
    expect(draft.maxAttempts, 1);
    final q = draft.questions.single;
    expect(q.type, QuestionType.single);
    expect(q.valid, isTrue);
    expect([for (final o in q.options) o.correct], [false, true]);
    expect(q.toJson()['type'], 'SINGLE');
    expect(studio.published, ['q-new']);
    await tester.drag(_vertical.last, const Offset(0, 3000));
    await settle(tester);
    expect(find.byKey(const Key('quiz-status-published')), findsOneWidget);
    expect(find.byKey(const Key('unpublish-quiz')), findsOneWidget);
  });

  testWidgets('quiz editor: true/false gives fixed options; choose-all needs a correct answer before publishing', (tester) async {
    final studio = FakeTeacherStudioRepository();
    await _pumpRouted(tester, const QuizEditorScreen(batchId: 'b7'), _base(batches: [_batch()], studio: studio));
    await settle(tester, 10);
    await tester.enterText(find.byKey(const Key('quiz-title')), 'Quick check');
    await _tapVisible(tester, find.byKey(const Key('q0-type-trueFalse')));
    expect(find.text('True'), findsOneWidget);
    expect(find.text('False'), findsOneWidget);

    await _tapVisible(tester, find.byKey(const Key('q0-type-multiple')));
    // Clear the correct mark the true/false switch left.
    await _tapVisible(tester, find.byKey(const Key('q0-correct-0')));
    await _reveal(tester, find.byKey(const Key('q0-prompt')));
    await tester.enterText(find.byKey(const Key('q0-prompt')), 'Pick the warm colours');
    await _tapVisible(tester, find.byKey(const Key('publish-quiz')));
    expect(find.byKey(const Key('q0-correct-error')), findsOneWidget);
    expect(studio.createdQuizzes, isEmpty);
  });

  group('Today', () {
    final now = DateTime.now();
    final tomorrow18 = DateTime(now.year, now.month, now.day + 1, 18);

    List<Override> todayOverrides(SessionSummary session, {TeacherBankDetails? bank}) {
      final b = _batch(sessions: [session]);
      return _base(
        batches: [b, _batch(id: 'b8', code: 'B08', status: BatchStatus.draft).copyWithNote('Move the start date')],
        me: FakeMeRepository(sessions: [session]),
        learn: FakeClassLearnRepository(assignmentMap: {'b7': [_assignment]}),
        studio: FakeTeacherStudioRepository(subs: {
          'a1': [
            Submission(id: 's1', assignmentId: 'a1', studentName: 'Sara', submittedAt: _due),
            Submission(id: 's2', assignmentId: 'a1', studentName: 'Omar', submittedAt: _due),
            Submission(id: 's3', assignmentId: 'a1', studentName: 'Lina', submittedAt: _due, score: 7),
          ],
        }),
        teacherRepo: FakeTeacherRepository(
          rosters: {'b7': const [RosterStudent(id: 'u1', name: 'Sara', attendancePct: 40)]},
          bank: bank,
          summary: EarningsSummary(earnedThisMonthFils: 125000, nextPayout: now.add(const Duration(days: 5)), nextPayoutEstimateFils: 90000),
          requests: [
            RescheduleRequest(
              id: 'r1',
              sessionId: session.id,
              status: 'APPROVED',
              startsAt: tomorrow18,
              endsAt: tomorrow18.add(const Duration(hours: 1)),
              session: session,
              decidedAt: now.subtract(const Duration(days: 1)),
            ),
            RescheduleRequest(id: 'r2', sessionId: session.id, status: 'PENDING', startsAt: tomorrow18, endsAt: tomorrow18, session: session),
          ],
        ),
      );
    }

    testWidgets('next session shows a relative time, "Needs you" counts, quick actions and the payout warning', (tester) async {
      final session = SessionSummary(
        id: 'ss1',
        batchId: 'b7',
        number: 3,
        title: 'Colour theory',
        startsAt: tomorrow18,
        endsAt: tomorrow18.add(const Duration(minutes: 90)),
        batchCode: 'B07',
        courseTitle: 'Design basics',
      );
      await pumpScreen(tester, const TeacherTodayScreen(), overrides: todayOverrides(session));
      await settle(tester, 12);

      expect(find.byKey(const Key('next-relative')), findsOneWidget);
      expect(find.text('Tomorrow ${const Fmt().time(tomorrow18)}'), findsWidgets);
      expect(find.byKey(const Key('next-countdown')), findsNothing);
      expect(find.byKey(const Key('next-reschedule')), findsOneWidget);

      String count(String key) => (tester.widget<Text>(find.byKey(Key('$key-count')))).data!;
      expect(count('needs-grade'), '2');
      expect(count('needs-at-risk'), '1');
      expect(count('needs-reschedule'), '1');
      expect(count('needs-proposals'), '1');

      for (final k in ['quick-new-class', 'quick-propose-course', 'quick-announcement', 'quick-material']) {
        await _reveal(tester, find.byKey(Key(k)));
        expect(find.byKey(Key(k)), findsOneWidget);
      }
      await _reveal(tester, find.byKey(const Key('my-class-b7')));
      expect(find.byKey(const Key('my-class-b7')), findsOneWidget);
      await _reveal(tester, find.byKey(const Key('payout-method-missing')));
      expect(find.byKey(const Key('my-class-b8')), findsNothing); // drafts are proposals, not classes
      expect(find.text('Add a payout method so we can pay you.'), findsOneWidget);
    });

    testWidgets('within the hour the card counts down; a saved payout method hides the warning', (tester) async {
      final soon = DateTime.now().add(const Duration(minutes: 30));
      final session = SessionSummary(id: 'ss2', batchId: 'b7', number: 4, title: 'Type', startsAt: soon, endsAt: soon.add(const Duration(hours: 1)), batchCode: 'B07');
      await pumpScreen(
        tester,
        const TeacherTodayScreen(),
        overrides: todayOverrides(session, bank: const TeacherBankDetails(bankName: 'ENBD', accountHolder: 'Lina', iban: 'AE070331234567890123456', swift: 'EBILAEAD')),
      );
      await settle(tester, 12);
      expect(find.byKey(const Key('next-countdown')), findsOneWidget);
      expect(find.byKey(const Key('next-relative')), findsNothing);
      await _reveal(tester, find.byKey(const Key('earnings-snapshot')));
      expect(find.byKey(const Key('payout-method-missing')), findsNothing);
    });

    test('relative time: today, tomorrow, this week, later', () {
      final l = lookupAppLocalizations(const Locale('en'));
      const f = Fmt();
      final base = DateTime(2026, 11, 9, 9); // a Monday
      expect(teacherRelativeTime(l, f, DateTime(2026, 11, 9, 18), base), 'Today 18:00');
      expect(teacherRelativeTime(l, f, DateTime(2026, 11, 10, 18), base), 'Tomorrow 18:00');
      expect(teacherRelativeTime(l, f, DateTime(2026, 11, 12, 18), base), 'Thu 18:00');
      expect(teacherRelativeTime(l, f, DateTime(2026, 11, 24, 18), base), 'Tue, Nov 24 · 18:00');
    });
  });

  group('materials', () {
    testWidgets('adds a link material with a kind', (tester) async {
      final studio = FakeTeacherStudioRepository();
      await pumpScreen(tester, const RosterScreen(batchId: 'b7', initialSection: ClassHubSection.materials), overrides: _base(batches: [_batch()], studio: studio));
      await settle(tester, 10);
      await _tapVisible(tester, find.byKey(const Key('add-material')));

      // FILE is for uploaded files only, so an outside link can't pick it.
      expect(find.byKey(const Key('material-kind-file')), findsNothing);
      await tester.tap(find.byKey(const Key('material-kind-link')));
      await tester.enterText(find.byKey(const Key('material-title')), 'Reading list');
      await tester.enterText(find.byKey(const Key('material-url')), 'not a link');
      await settle(tester);
      expect(find.text('Enter a full link, like https://example.com'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('material-url')), 'https://docs.example.com/reading');
      await _tapVisible(tester, find.byKey(const Key('save-material')));

      final (batchId, draft) = studio.materials.single;
      expect(batchId, 'b7');
      expect(draft.title, 'Reading list');
      expect(draft.kind, MaterialKind.link);
      expect(draft.toJson(), {'title': 'Reading list', 'url': 'https://docs.example.com/reading', 'kind': 'LINK'});
      expect(find.text('Material added. Your students can open it now.'), findsOneWidget);
    });

    testWidgets('uploads a video, fills the link and saves it as a VIDEO material', (tester) async {
      final studio = FakeTeacherStudioRepository();
      final picker = FakeMaterialPicker(const PickedFile(name: 'warmup.mp4', size: 1024, bytes: [1, 2, 3]));
      await pumpScreen(tester, const RosterScreen(batchId: 'b7', initialSection: ClassHubSection.materials), overrides: _base(batches: [_batch()], studio: studio, picker: picker));
      await settle(tester, 10);
      await _tapVisible(tester, find.byKey(const Key('add-material')));
      await _tapVisible(tester, find.byKey(const Key('upload-material-video')));

      expect(studio.uploads.single.name, 'warmup.mp4');
      expect(find.text('Uploaded: warmup.mp4'), findsOneWidget);
      await _tapVisible(tester, find.byKey(const Key('save-material')));
      final draft = studio.materials.single.$2;
      expect(draft.kind, MaterialKind.video);
      expect(draft.title, 'warmup');
      expect(draft.url, 'https://cdn.example.com/course-videos/warmup.mp4');
    });
  });
}

extension on Batch {
  Batch copyWithNote(String note) => Batch(id: id, code: code, courseId: courseId, course: course, status: status, reviewNote: note);
}
