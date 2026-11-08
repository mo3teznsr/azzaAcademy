import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/instructors/data/instructors_repository.dart';
import 'package:azza/features/admin/presentation/approvals_screen.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:azza/features/teacher/domain/proposal_models.dart';
import 'package:azza/features/teacher/presentation/course_editor_screen.dart';
import 'package:azza/features/teacher/presentation/my_courses_screen.dart';
import 'package:azza/features/teacher/presentation/new_batch_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

const _published = Course(
  id: 'c-pub',
  slug: 'speaking-arabic',
  titleEn: 'Speaking Arabic',
  category: 'languages',
  status: CourseStatus.published,
  modules: [CourseModule(order: 1, titleEn: 'Greetings'), CourseModule(order: 2, titleEn: 'Numbers')],
);

const _sentBack = Course(
  id: 'c-back',
  slug: 'watercolour-basics',
  titleEn: 'Watercolour basics',
  category: 'art',
  status: CourseStatus.draft,
  createdById: 'u-t',
  descriptionEn: 'Washes, layering and colour mixing for beginners.',
  reviewNote: 'Add a module on brushes and paper.',
  modules: [CourseModule(order: 1, titleEn: 'Washes')],
);

const _pending = Course(id: 'c-wait', slug: 'ux-writing', titleEn: 'UX writing', category: 'design', status: CourseStatus.pendingReview);

Finder _inEditor(Key key) => find.byKey(key);

Future<void> _scrollTo(WidgetTester tester, Finder target, Key list) async {
  await tester.scrollUntilVisible(
    target,
    200,
    scrollable: find.descendant(of: find.byKey(list), matching: find.byType(Scrollable)).first,
  );
  await settle(tester, 8); // let the scroll come to rest so taps reach the content
}

void main() {
  test('course and batch parse the review fields and PENDING_REVIEW', () {
    final c = Course.fromJson({
      'id': 'c1',
      'slug': 'c1',
      'titleEn': 'T',
      'status': 'PENDING_REVIEW',
      'createdById': 'u-t',
      'reviewNote': null,
      'submittedAt': '2026-11-06T09:00:00.000Z',
    });
    expect(c.status, CourseStatus.pendingReview);
    expect(c.status.teacherEditable, isTrue);
    expect(c.createdById, 'u-t');
    expect(c.submittedAt!.toUtc(), DateTime.utc(2026, 11, 6, 9));

    final b = Batch.fromJson({'id': 'b1', 'code': 'B01', 'courseId': 'c1', 'status': 'DRAFT', 'reviewNote': 'Fix the dates'});
    expect(b.status.isProposal, isTrue);
    expect(b.reviewNote, 'Fix the dates');
    expect(BatchStatus.parse('PENDING_REVIEW'), BatchStatus.pendingReview);
  });

  group('teacher: course proposal', () {
    testWidgets('create → submit: saves the draft first, then shows "waiting for review"', (tester) async {
      final repo = FakeProposalsRepository();
      await pumpScreen(tester, const CourseEditorScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester);
      await tester.tap(find.byKey(const Key('course-type-live')));
      await settle(tester);
      expect(find.text('New course'), findsOneWidget);

      await tester.enterText(_inEditor(const Key('course-title-en')), 'Calligraphy for beginners');
      await tester.enterText(_inEditor(const Key('course-category')), 'art');
      await _scrollTo(tester, find.byKey(const Key('course-desc-en')), const Key('course-editor'));
      await tester.enterText(find.byKey(const Key('course-desc-en')), 'Learn the naskh script stroke by stroke.');

      // Too-short module title blocks the submit before anything is sent.
      await tester.tap(find.byKey(const Key('submit-course')));
      await settle(tester);
      expect(find.text('Every module needs an English title.'), findsOneWidget);
      expect(repo.createdCourses, isEmpty);

      await _scrollTo(tester, find.byKey(const Key('module-en-0')), const Key('course-editor'));
      await tester.enterText(find.byKey(const Key('module-en-0')), 'Holding the qalam');
      await tester.tap(find.byKey(const Key('submit-course')));
      await settle(tester, 10);

      expect(repo.createdCourses, hasLength(1));
      final body = repo.createdCourses.single.toJson();
      expect(body['titleEn'], 'Calligraphy for beginners');
      expect(body.containsKey('priceAed'), isFalse, reason: 'courses have no price; seats are priced per batch');
      expect(body['level'], 'BEGINNER');
      expect(body.containsKey('status'), isFalse);
      expect(body.containsKey('slug'), isFalse);
      expect(body['modules'], [
        {'titleEn': 'Holding the qalam', 'order': 1},
      ]);
      expect(repo.submittedCourses, ['c-new']);
      expect(find.text('Sent for review.'), findsOneWidget);

      await tester.drag(find.byKey(const Key('course-editor')), const Offset(0, 2000));
      await settle(tester, 2);
      expect(find.byKey(const Key('pending-review')), findsOneWidget);
      expect(find.byKey(const Key('submit-course')), findsNothing, reason: 'already waiting for review');
      expect(find.byKey(const Key('save-draft')), findsOneWidget, reason: 'still editable while pending');
    });

    testWidgets('submit is refused with a short description', (tester) async {
      final repo = FakeProposalsRepository();
      await pumpScreen(tester, const CourseEditorScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester);
      await tester.tap(find.byKey(const Key('course-type-live')));
      await settle(tester);
      await tester.enterText(find.byKey(const Key('course-title-en')), 'Short');
      await tester.enterText(find.byKey(const Key('course-category')), 'art');
      await _scrollTo(tester, find.byKey(const Key('module-en-0')), const Key('course-editor'));
      await tester.enterText(find.byKey(const Key('module-en-0')), 'Intro');
      await tester.tap(find.byKey(const Key('submit-course')));
      await settle(tester);
      expect(find.text('Write at least 20 characters in the English description.'), findsOneWidget);
      expect(repo.submittedCourses, isEmpty);

      // Saving a draft has no such requirement.
      await tester.tap(find.byKey(const Key('save-draft')));
      await settle(tester, 8);
      expect(repo.createdCourses, hasLength(1));
      expect(find.text('Draft saved.'), findsOneWidget);
    });
  });

  group('teacher: review note', () {
    testWidgets('My courses shows status chips and the note on a course sent back', (tester) async {
      await pumpScreen(tester, const MyCoursesScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository(mine: [_sentBack, _pending])),
      ]);
      await settle(tester, 8);
      expect(find.byKey(const Key('review-note-c-back')), findsOneWidget);
      expect(find.text('Changes requested'), findsOneWidget);
      expect(find.text('Add a module on brushes and paper.'), findsOneWidget);
      expect(find.text('WAITING FOR REVIEW'), findsOneWidget);
      expect(find.text('DRAFT'), findsOneWidget);
      expect(find.byKey(const Key('propose-course')), findsOneWidget);
    });

    testWidgets('the editor opens a sent-back course with the admin note on top', (tester) async {
      await pumpScreen(tester, const CourseEditorScreen(courseId: 'c-back'), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository()),
      instructorsRepositoryProvider.overrideWithValue(FakeInstructorsRepository()),
        catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: [_sentBack])),
      ]);
      await settle(tester, 8);
      expect(find.byKey(const Key('review-note')), findsOneWidget);
      expect(find.text('Add a module on brushes and paper.'), findsOneWidget);
      expect(find.byKey(const Key('submit-course')), findsOneWidget);
    });

    testWidgets('a published course is read-only', (tester) async {
      await pumpScreen(tester, const CourseEditorScreen(courseId: 'c-pub'), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository()),
      instructorsRepositoryProvider.overrideWithValue(FakeInstructorsRepository()),
        catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(courseList: [_published])),
      ]);
      await settle(tester, 8);
      expect(find.byKey(const Key('published-locked')), findsOneWidget);
      expect(find.byKey(const Key('save-draft')), findsNothing);
      expect(find.byKey(const Key('submit-course')), findsNothing);
      expect(tester.widget<TextField>(find.byKey(const Key('course-title-en'))).readOnly, isTrue);
    });
  });

  group('teacher: new batch', () {
    Future<FakeProposalsRepository> pumpNewBatch(WidgetTester tester, FakeProposalsRepository repo) async {
      await pumpScreen(tester, const NewBatchScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(teacher)),
        proposalsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester, 8);
      await tester.tap(find.byKey(const Key('batch-course')));
      await settle(tester);
      await tester.tap(find.text('Speaking Arabic').last);
      await settle(tester);
      await tester.enterText(find.byKey(const Key('batch-code')), 'b07');
      await tester.enterText(find.byKey(const Key('batch-price')), '450');
      await _scrollTo(tester, find.byKey(const Key('weekday-0')), const Key('new-batch'));
      await tester.tap(find.byKey(const Key('weekday-0')));
      await settle(tester);
      return repo;
    }

    testWidgets('preview lists the sessions and marks the clash', (tester) async {
      final repo = await pumpNewBatch(
        tester,
        FakeProposalsRepository(
          batchable: [_published],
          preview: const SchedulePreview(
            sessions: [],
            endsOn: '2026-11-22',
            conflicts: [ScheduleConflict(sessionNumber: 2, localDate: '2026-11-22', withBatch: 'B03')],
          ),
        ),
      );
      repo.preview = SchedulePreview(
        sessions: [
          PlannedSession(number: 1, startsAt: DateTime.utc(2026, 11, 15, 15), endsAt: DateTime.utc(2026, 11, 15, 16, 30), localDate: '2026-11-15'),
          PlannedSession(number: 2, startsAt: DateTime.utc(2026, 11, 22, 15), endsAt: DateTime.utc(2026, 11, 22, 16, 30), localDate: '2026-11-22'),
        ],
        endsOn: '2026-11-22',
        conflicts: repo.preview.conflicts,
      );

      await _scrollTo(tester, find.byKey(const Key('preview-schedule')), const Key('new-batch'));
      await tester.tap(find.byKey(const Key('preview-schedule')));
      await settle(tester, 8);

      expect(repo.previews, hasLength(1));
      final (schedule, timezone) = repo.previews.single;
      expect(schedule.toJson()['weekdays'], [0]);
      expect(schedule.toJson()['startTime'], '19:00');
      expect(schedule.sessionCount, 2, reason: 'defaults to the course module count');
      expect(timezone, isNotEmpty);

      await _scrollTo(tester, find.byKey(const Key('schedule-conflicts')), const Key('new-batch'));
      expect(find.text('Clashes with your other batches: 1'), findsOneWidget);
      await _scrollTo(tester, find.text('CLASHES WITH B03'), const Key('new-batch'));
      expect(find.text('CLASHES WITH B03'), findsOneWidget);
      expect(find.text('S1'), findsOneWidget);
    });

    testWidgets('create → submit; a double-booking from the server is shown as a clash', (tester) async {
      final repo = await pumpNewBatch(
        tester,
        FakeProposalsRepository(
          batchable: [_published],
          createError: const AppException('CONFLICT', 'Teacher is double-booked', statusCode: 409, details: {
            'conflicts': [
              {'sessionNumber': 1, 'localDate': '2026-11-15', 'withBatch': 'B02'},
            ],
          }),
        ),
      );
      await tester.tap(find.byKey(const Key('create-batch')));
      await settle(tester, 8);
      expect(repo.createdBatches.single.code, 'B07');
      expect(repo.createdBatches.single.toJson().containsKey('teacherId'), isFalse);
      expect(find.text('You already teach at some of these times.'), findsWidgets);
      await _scrollTo(tester, find.text('CLASHES WITH B02'), const Key('new-batch'));
      expect(find.text('CLASHES WITH B02'), findsOneWidget);

      repo.createError = null;
      await tester.tap(find.byKey(const Key('create-batch')));
      await settle(tester, 8);
      await tester.drag(find.byKey(const Key('new-batch')), const Offset(0, 3000));
      await settle(tester, 4);
      expect(find.byKey(const Key('created-batch')), findsOneWidget);
      await tester.tap(find.byKey(const Key('submit-batch')));
      await settle(tester, 8);
      expect(repo.submittedBatches, ['b-new']);
      expect(find.text('WAITING FOR REVIEW'), findsOneWidget);
      expect(find.byKey(const Key('submit-batch')), findsNothing);
    });
  });

  group('admin: review queue', () {
    final pendingBatch = Batch(
      id: 'b-wait',
      code: 'B04',
      courseId: 'c-pub',
      course: _published,
      teacher: const PersonRef(id: 'u-t', name: 'Lina Haddad'),
      capacity: 10,
      status: BatchStatus.pendingReview,
    );

    Future<FakeProposalsRepository> pumpQueue(WidgetTester tester) async {
      final repo = FakeProposalsRepository(pendingCourseList: [_pending], pendingBatchList: [pendingBatch]);
      await pumpScreen(tester, const ApprovalsScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(admin)),
        adminRepositoryProvider.overrideWithValue(FakeAdminRepository()),
        proposalsRepositoryProvider.overrideWithValue(repo),
        instructorsRepositoryProvider.overrideWithValue(FakeInstructorsRepository()),
      ]);
      await settle(tester, 8);
      await tester.tap(find.text('To review'));
      await settle(tester, 12);
      return repo;
    }

    testWidgets('approve a course', (tester) async {
      final repo = await pumpQueue(tester);
      expect(find.text('UX writing'), findsOneWidget);
      expect(find.text('By Lina Haddad'), findsOneWidget);

      await tester.tap(find.byKey(const Key('approve-c-wait')));
      await settle(tester, 8);
      expect(repo.courseReviews.single, (id: 'c-wait', approve: true, note: null));
      expect(find.text('Decision saved.'), findsOneWidget);
      expect(find.text('UX writing'), findsNothing, reason: 'the queue reloads without it');
    });

    testWidgets('send back needs a note of at least 3 characters', (tester) async {
      final repo = await pumpQueue(tester);
      await tester.tap(find.byKey(const Key('send-back-b-wait')));
      await settle(tester);
      expect(find.text('What needs to change?'), findsOneWidget);

      await tester.tap(find.byKey(const Key('confirm-send-back')));
      await settle(tester);
      expect(find.text('Write at least 3 characters.'), findsOneWidget);
      expect(repo.batchReviews, isEmpty);

      await tester.enterText(find.byKey(const Key('send-back-note')), 'Start a week later, please.');
      await tester.tap(find.byKey(const Key('confirm-send-back')));
      await settle(tester, 8);
      expect(repo.batchReviews.single, (id: 'b-wait', approve: false, note: 'Start a week later, please.'));
    });

    testWidgets('approving a batch whose course is unpublished shows the mapped error', (tester) async {
      final repo = await pumpQueue(tester);
      repo.reviewError = const AppException('COURSE_NOT_PUBLISHED', 'Approve the course before its batches', statusCode: 422);
      await tester.tap(find.byKey(const Key('approve-b-wait')));
      await settle(tester, 8);
      expect(find.text('Approve the course before its batches.'), findsOneWidget);
    });
  });
}
