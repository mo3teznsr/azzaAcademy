import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/chat/data/chat_repository.dart';
import 'package:azza/features/checkout/domain/checkout_models.dart';
import 'package:azza/features/learn/data/file_uploads.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/learn/data/quizzes_repository.dart';
import 'package:azza/features/learn/presentation/assignments_screen.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/data/studio_repository.dart';
import 'package:azza/features/teacher/data/teacher_repository.dart';
import 'package:azza/features/teacher/domain/studio_models.dart';
import 'package:azza/features/teacher/presentation/assignment_editor_screen.dart';
import 'package:azza/features/teacher/presentation/grading_screens.dart';
import 'package:azza/features/teacher/presentation/roster_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';
import '../helpers/teacher_fakes.dart';

const _course = Course(id: 'c1', slug: 'design-basics', titleEn: 'Design basics', category: 'design');
final _batch = Batch(id: 'b7', code: 'B07', courseId: 'c1', course: _course, capacity: 12, status: BatchStatus.running, seatsTaken: 2, sessionCount: 8);

/// Student learn data that records what is submitted and uploaded.
class _SubmitLearn extends FakeLearnRepository {
  _SubmitLearn(this.list);
  final List<Assignment> list;
  final submitted = <({String id, String? url, String? text, List<AttachedFile>? files})>[];
  final uploaded = <String>[];

  @override
  Future<List<Assignment>> assignments(String batchId) async => list;

  @override
  Future<void> submit(String assignmentId, {String? url, String? text, List<AttachedFile>? files}) async =>
      submitted.add((id: assignmentId, url: url, text: text, files: files));

  @override
  Future<AttachedFile> uploadSubmissionFile(String assignmentId, PickedFile file, {void Function(double progress)? onProgress}) async {
    onProgress?.call(0.5);
    uploaded.add(file.name);
    return AttachedFile(url: 'http://files.test/submissions/${file.name}', name: file.name, size: file.size, type: 'application/pdf');
  }
}

List<Override> _student(_SubmitLearn learn, FakeDocumentPicker picker) => [
      meRepositoryProvider.overrideWithValue(FakeMeRepository(enrollmentList: [Enrollment(id: 'e1', status: EnrollmentStatus.active, batch: _batch)])),
      learnRepositoryProvider.overrideWithValue(learn),
      documentPickerProvider.overrideWithValue(picker),
    ];

List<Override> _teacher({required FakeTeacherStudioRepository studio, FakeClassLearnRepository? learn, FakeDocumentPicker? picker}) => [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(batchList: [_batch], courseList: const [_course])),
      teacherStudioRepositoryProvider.overrideWithValue(studio),
      teacherRepositoryProvider.overrideWithValue(FakeTeacherRepository()),
      learnRepositoryProvider.overrideWithValue(learn ?? FakeClassLearnRepository()),
      quizzesRepositoryProvider.overrideWithValue(FakeBatchQuizzes()),
      materialFilePickerProvider.overrideWithValue(FakeMaterialPicker()),
      documentPickerProvider.overrideWithValue(picker ?? FakeDocumentPicker()),
      meRepositoryProvider.overrideWithValue(FakeMeRepository()),
      proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository()),
      messagesUnreadProvider.overrideWithValue(0),
    ];

/// Pumps [screen] as a child route of a stub home, so popping works.
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

Future<void> _tap(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.pump();
  await tester.tap(f);
  await settle(tester, 10);
}

void main() {
  final now = DateTime.now();

  group('student submission files', () {
    testWidgets('attaches files with progress and remove, then submits them with the text', (tester) async {
      final learn = _SubmitLearn([Assignment(id: 'a1', title: 'Moodboard', dueAt: now.add(const Duration(days: 2)))]);
      final picker = FakeDocumentPicker(const [
        PickedFile(name: 'brief.pdf', size: 2 * 1024 * 1024, bytes: [1]),
        PickedFile(name: 'board.png', size: 300 * 1024, bytes: [1]),
        PickedFile(name: 'extra.txt', size: 10, bytes: [1]),
      ]);
      await pumpScreen(tester, const AssignmentsScreen(), overrides: _student(learn, picker));
      await settle(tester);

      expect(find.textContaining('Up to 5 files'), findsOneWidget);
      await _tap(tester, find.byKey(const Key('attach-files-a1')));
      expect(picker.asked.single, contains('pdf'));
      expect(learn.uploaded, ['brief.pdf', 'board.png', 'extra.txt']);
      expect(find.byKey(const Key('pending-file-brief.pdf')), findsOneWidget);
      expect(find.text('2.0 MB'), findsOneWidget);
      expect(find.text('300 KB'), findsOneWidget);

      await _tap(tester, find.byTooltip('Remove extra.txt'));
      expect(find.byKey(const Key('pending-file-extra.txt')), findsNothing);

      await tester.enterText(find.byType(TextField).at(1), 'Two directions');
      await _tap(tester, find.byKey(const Key('submit-a1')));

      final sent = learn.submitted.single;
      expect(sent.id, 'a1');
      expect(sent.text, 'Two directions');
      expect(sent.url, isNull);
      expect(sent.files!.map((f) => f.toJson()).toList(), [
        {'url': 'http://files.test/submissions/brief.pdf', 'name': 'brief.pdf', 'size': 2 * 1024 * 1024, 'type': 'application/pdf'},
        {'url': 'http://files.test/submissions/board.png', 'name': 'board.png', 'size': 300 * 1024, 'type': 'application/pdf'},
      ]);
    });

    testWidgets('refuses a wrong type and an oversized file before uploading', (tester) async {
      final learn = _SubmitLearn([Assignment(id: 'a1', title: 'Moodboard', dueAt: now.add(const Duration(days: 2)))]);
      final picker = FakeDocumentPicker(const [PickedFile(name: 'setup.exe', size: 10, bytes: [1])]);
      await pumpScreen(tester, const AssignmentsScreen(), overrides: _student(learn, picker));
      await settle(tester);

      await _tap(tester, find.byKey(const Key('attach-files-a1')));
      expect(find.textContaining("setup.exe can't be attached. Use PDF, DOCX"), findsOneWidget);

      picker.files = const [PickedFile(name: 'scan.pdf', size: 21 * 1024 * 1024, bytes: [1])];
      await _tap(tester, find.byKey(const Key('attach-files-a1')));
      await settle(tester, 10);
      expect(find.text('scan.pdf is larger than 20 MB.'), findsOneWidget);

      expect(learn.uploaded, isEmpty);
      expect(find.byKey(const Key('pending-file-scan.pdf')), findsNothing);
    });

    testWidgets('a submitted assignment lists its files', (tester) async {
      final learn = _SubmitLearn([
        Assignment.fromJson({
          'id': 'a1',
          'title': 'Moodboard',
          'dueAt': now.add(const Duration(days: 2)).toUtc().toIso8601String(),
          'mySubmission': {
            'submittedAt': now.toUtc().toIso8601String(),
            'files': [
              {'url': '/uploads/submissions/x.pdf', 'name': 'brief.pdf', 'size': 4096, 'type': 'application/pdf'},
            ],
          },
        }),
      ]);
      await pumpScreen(tester, const AssignmentsScreen(), overrides: _student(learn, FakeDocumentPicker()));
      await settle(tester);
      await _tap(tester, find.text('Submitted'));
      expect(find.text('Your files'), findsOneWidget);
      expect(find.text('brief.pdf'), findsOneWidget);
      expect(find.text('4 KB'), findsOneWidget);
      expect(find.byTooltip('Open brief.pdf'), findsOneWidget);
    });
  });

  testWidgets('the teacher sees a submission\'s files in grading', (tester) async {
    final submission = Submission.fromJson({
      'id': 's1',
      'assignmentId': 'a1',
      'submittedAt': now.toUtc().toIso8601String(),
      'text': 'See attached',
      'user': {'name': 'Sara Ali'},
      'files': [
        {'url': 'http://files.test/submissions/a.pdf', 'name': 'essay.pdf', 'size': 3 * 1024 * 1024, 'type': 'application/pdf'},
        {'url': 'http://files.test/submissions/b.zip', 'name': 'sources.zip', 'size': 512 * 1024, 'type': 'application/zip'},
      ],
    });
    final assignment = Assignment(id: 'a1', title: 'Essay', dueAt: now.add(const Duration(days: 1)), maxScore: 10);
    await pumpScreen(tester, Scaffold(body: GradeSheet(submission: submission, assignment: assignment)), overrides: _teacher(studio: FakeTeacherStudioRepository()));
    await settle(tester);

    expect(find.byKey(const Key('submission-files')), findsOneWidget);
    expect(find.text('Files'), findsOneWidget);
    expect(find.text('essay.pdf'), findsOneWidget);
    expect(find.text('3.0 MB'), findsOneWidget);
    expect(find.text('sources.zip'), findsOneWidget);
    expect(find.text('512 KB'), findsOneWidget);
    expect(find.byTooltip('Open essay.pdf'), findsOneWidget);
  });

  testWidgets('uploads a material file and saves it as a FILE material with the stored URL', (tester) async {
    final studio = FakeTeacherStudioRepository();
    final picker = FakeDocumentPicker(const [PickedFile(name: 'week1-notes.pdf', size: 1024 * 1024, bytes: [1])]);
    await pumpScreen(
      tester,
      const RosterScreen(batchId: 'b7', initialSection: ClassHubSection.materials),
      overrides: _teacher(studio: studio, picker: picker),
    );
    await settle(tester, 10);
    await _tap(tester, find.byKey(const Key('add-material')));
    expect(find.byKey(const Key('material-kind-file')), findsNothing);

    await _tap(tester, find.byKey(const Key('upload-material-file')));
    expect(picker.asked.single, containsAll(['pdf', 'mp3', 'm4a']));
    expect(studio.materialFiles.single.$1, 'b7');
    expect(find.byKey(const Key('material-uploaded-file')), findsOneWidget);
    expect(find.byKey(const Key('material-url')), findsNothing);

    await _tap(tester, find.byKey(const Key('save-material')));
    final draft = studio.materials.single.$2;
    expect(draft.toJson(), {'title': 'week1-notes', 'url': 'http://files.test/materials/abc.pdf', 'kind': 'FILE'});
  });

  group('assignment edit and delete', () {
    final assignment = Assignment(id: 'a1', title: 'Moodboard', dueAt: now.add(const Duration(days: 3)), maxScore: 10, description: 'Collect references.');

    testWidgets('edits a prefilled assignment and maps SCORE_TOO_HIGH', (tester) async {
      final studio = FakeTeacherStudioRepository()
        ..updateError = const AppException('SCORE_TOO_HIGH', 'too low', statusCode: 422, details: {'highestScore': 8});
      await _pumpRouted(tester, AssignmentEditorScreen(batchId: 'b7', assignment: assignment), _teacher(studio: studio));
      await settle(tester);

      expect(find.text('Edit assignment'), findsOneWidget);
      expect(find.text('Save changes'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'Moodboard'), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'Collect references.'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('assignment-max-score')), '5');
      await _tap(tester, find.byKey(const Key('save-assignment')));
      expect(find.text("A submission is already graded 8, so the max score can't go below that."), findsOneWidget);

      studio.updateError = null;
      await tester.enterText(find.byKey(const Key('assignment-title')), 'Moodboard v2');
      await tester.enterText(find.byKey(const Key('assignment-max-score')), '20');
      await _tap(tester, find.byKey(const Key('save-assignment')));

      final (id, draft) = studio.updatedAssignments.single;
      expect(id, 'a1');
      expect(draft.toPatchJson(), {
        'title': 'Moodboard v2',
        'description': 'Collect references.',
        'dueAt': assignment.dueAt.toUtc().toIso8601String(),
        'maxScore': 20,
        'sessionId': null,
      });
      expect(find.text('HOME'), findsOneWidget);
    });

    testWidgets('delete asks first and explains a 409 from the Practice section', (tester) async {
      final studio = FakeTeacherStudioRepository()
        ..deleteError = const AppException('ASSIGNMENT_HAS_SUBMISSIONS', 'has submissions', statusCode: 409, details: {'submissions': 2});
      final learn = FakeClassLearnRepository(assignmentMap: {'b7': [assignment]});
      await pumpScreen(
        tester,
        const RosterScreen(batchId: 'b7', initialSection: ClassHubSection.practice),
        overrides: _teacher(studio: studio, learn: learn),
      );
      await settle(tester, 10);

      await _tap(tester, find.byKey(const Key('assignment-menu-a1')));
      await _tap(tester, find.byKey(const Key('assignment-delete')));
      expect(find.text('Delete “Moodboard”?'), findsOneWidget);
      expect(find.textContaining('Once a student has submitted'), findsOneWidget);

      await _tap(tester, find.byKey(const Key('confirm-delete-assignment')));
      expect(studio.deletedAssignments, isEmpty);
      expect(find.text("Students have already submitted this assignment, so it can't be deleted. You can still edit it."), findsOneWidget);

      studio.deleteError = null;
      await _tap(tester, find.byKey(const Key('assignment-menu-a1')));
      await _tap(tester, find.byKey(const Key('assignment-delete')));
      await _tap(tester, find.byKey(const Key('confirm-delete-assignment')));
      expect(studio.deletedAssignments, ['a1']);
      expect(find.text('Assignment deleted.'), findsOneWidget);
    });
  });
}
