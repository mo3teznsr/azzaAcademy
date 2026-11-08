import 'package:azza/core/domain/enums.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/admin/presentation/approvals_screen.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/instructors/data/instructors_repository.dart';
import 'package:azza/features/instructors/domain/instructor_models.dart';
import 'package:azza/features/instructors/presentation/instructors_screen.dart';
import 'package:azza/features/instructors/presentation/teach_screen.dart';
import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/teacher/data/proposals_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

const _categories = [
  CourseCategory(slug: 'design', nameEn: 'Design', nameAr: 'تصميم'),
  CourseCategory(slug: 'languages', nameEn: 'Languages', nameAr: 'لغات'),
];

final _pendingApp = InstructorApplication(
  id: 'app-1',
  status: ApplicationStatus.pending,
  headline: 'Calligrapher · 10 years',
  bio: 'I teach Arabic calligraphy to adults, from the first stroke to full compositions.',
  categories: const ['design'],
  languages: const [SessionLanguage.ar, SessionLanguage.en],
  experience: 'Ten years of weekend workshops for adults.',
  sampleUrl: 'https://example.com/portfolio',
  createdAt: DateTime(2026, 11, 5),
  user: const Applicant(id: 'u-s', name: 'Sara Kamal', email: 'sara@example.com'),
);

void main() {
  test('directory card and application parse the API shape', () {
    final card = InstructorCard.fromJson({
      'id': 't1',
      'name': 'Lina Haddad',
      'image': null,
      'headline': 'Designer',
      'languages': ['AR', 'EN'],
      'categories': ['design'],
      'courses': [
        {'id': 'c1', 'slug': 'ux', 'titleEn': 'UX', 'titleAr': 'تجربة المستخدم'},
      ],
      'openBatches': 2,
    });
    expect(card.languages, [SessionLanguage.ar, SessionLanguage.en]);
    expect(card.courses.single.title(AppLocale.ar), 'تجربة المستخدم');
    expect(card.openBatches, 2);

    final app = InstructorApplication.fromJson({
      'id': 'a1',
      'status': 'REJECTED',
      'reviewNote': 'Add a sample',
      'languages': ['EN'],
      'user': {'id': 'u', 'name': 'N', 'email': 'n@example.com', 'image': null},
    });
    expect(app.status, ApplicationStatus.rejected);
    expect(app.reviewNote, 'Add a sample');
    expect(app.user!.email, 'n@example.com');

    const draft = InstructorApplicationDraft(
      headline: ' Hi there ',
      bio: 'b',
      categories: ['design'],
      languages: [SessionLanguage.en],
      experience: 'e',
      sampleUrl: '',
      phone: '  ',
    );
    expect(draft.toJson(), {'headline': 'Hi there', 'bio': 'b', 'categories': ['design'], 'languages': ['EN'], 'experience': 'e'});
    expect(isHttpsUrl('https://example.com/x'), isTrue);
    expect(isHttpsUrl('http://example.com'), isFalse);
    expect(isHttpsUrl('example.com'), isFalse);
  });

  test('instructor notifications route to the review queue and the join screen', () {
    expect(notificationRoute('INSTRUCTOR_APPLIED', {'applicationId': 'a1'}), '/admin/approvals?tab=review');
    expect(notificationRoute('INSTRUCTOR_APPROVED', {'applicationId': 'a1'}), '/teach');
    expect(notificationRoute('INSTRUCTOR_DECLINED', {'applicationId': 'a1'}), '/teach');
  });

  testWidgets('the directory lists instructors with localised categories and counts', (tester) async {
    await pumpScreen(tester, const InstructorsScreen(), overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(categoryList: _categories)),
      instructorsRepositoryProvider.overrideWithValue(FakeInstructorsRepository(cards: const [
        InstructorCard(
          id: 't1',
          name: 'Lina Haddad',
          headline: 'Product designer',
          languages: [SessionLanguage.ar, SessionLanguage.en],
          categories: ['design'],
          courses: [InstructorCourse(id: 'c1', slug: 'ux', titleEn: 'UX')],
          openBatches: 2,
        ),
        InstructorCard(id: 't2', name: 'Omar Said', categories: ['languages']),
      ])),
    ]);
    await settle(tester, 8);
    expect(find.text('Lina Haddad'), findsOneWidget);
    expect(find.text('Product designer'), findsOneWidget);
    expect(find.text('DESIGN'), findsOneWidget, reason: 'category chips use the category name, not the slug');
    expect(find.text('LANGUAGES'), findsOneWidget);
    expect(find.text('1 course · 2 open classes'), findsOneWidget);
    expect(find.text('ARABIC · ENGLISH'), findsOneWidget);
    expect(find.byKey(const Key('instructor-t2')), findsOneWidget);
  });

  group('teach on Azza', () {
    Future<FakeInstructorsRepository> pumpTeach(WidgetTester tester, {InstructorApplication? application, Object? applyError}) async {
      final repo = FakeInstructorsRepository(application: application, applyError: applyError);
      await pumpScreen(tester, const TeachScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
        catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(categoryList: _categories)),
        instructorsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester, 10);
      return repo;
    }

    Future<void> scrollTo(WidgetTester tester, Finder target, {bool up = false}) async {
      await tester.scrollUntilVisible(
        target,
        up ? -200 : 200,
        scrollable: find.descendant(of: find.byKey(const Key('apply-form')), matching: find.byType(Scrollable)).first,
      );
      await settle(tester, 8);
    }

    testWidgets('validates, then submits the application and shows the pending card', (tester) async {
      final repo = await pumpTeach(tester);
      expect(find.text('Teach what you know.'), findsOneWidget);
      expect(find.text('Product designer · 8 years at agencies'), findsOneWidget, reason: 'the headline field shows a sample');

      await scrollTo(tester, find.byKey(const Key('apply-submit')));
      await tester.tap(find.byKey(const Key('apply-submit')));
      await settle(tester);
      expect(repo.applied, isEmpty);
      expect(find.text('Pick 1 to 5 categories.'), findsOneWidget);
      expect(find.text('Pick at least one language.'), findsOneWidget);

      await scrollTo(tester, find.byKey(const Key('apply-headline')), up: true);
      await tester.enterText(find.byKey(const Key('apply-headline')), 'Calligrapher · 10 years');
      await tester.enterText(find.byKey(const Key('apply-bio')), 'I teach Arabic calligraphy to adults, from the first stroke onward.');
      await scrollTo(tester, find.byKey(const Key('apply-category-design')));
      await tester.tap(find.byKey(const Key('apply-category-design')));
      await scrollTo(tester, find.byKey(const Key('apply-language-AR')));
      await tester.tap(find.byKey(const Key('apply-language-AR')));
      await scrollTo(tester, find.byKey(const Key('apply-experience')));
      await tester.enterText(find.byKey(const Key('apply-experience')), 'Ten years of weekend workshops.');
      await scrollTo(tester, find.byKey(const Key('apply-sample')));
      await tester.enterText(find.byKey(const Key('apply-sample')), 'http://example.com');
      await scrollTo(tester, find.byKey(const Key('apply-submit')));
      await tester.tap(find.byKey(const Key('apply-submit')));
      await settle(tester);
      expect(repo.applied, isEmpty, reason: 'the sample link must be https');

      await scrollTo(tester, find.byKey(const Key('apply-sample')), up: true);
      await tester.enterText(find.byKey(const Key('apply-sample')), 'https://example.com/portfolio');
      await scrollTo(tester, find.byKey(const Key('apply-submit')));
      await tester.tap(find.byKey(const Key('apply-submit')));
      await settle(tester, 10);

      final d = repo.applied.single;
      expect(d.categories, ['design']);
      expect(d.languages, [SessionLanguage.ar]);
      expect(d.toJson()['sampleUrl'], 'https://example.com/portfolio');
      expect(d.toJson().containsKey('phone'), isFalse);
      expect(find.byKey(const Key('application-pending')), findsOneWidget);
      expect(find.text('Your application is being reviewed'), findsOneWidget);
    });

    testWidgets('a pending application shows the status card, not the form', (tester) async {
      await pumpTeach(tester, application: _pendingApp);
      expect(find.byKey(const Key('application-pending')), findsOneWidget);
      expect(find.text('Calligrapher · 10 years'), findsOneWidget);
      expect(find.byKey(const Key('apply-form')), findsNothing);
    });

    testWidgets('a rejected application shows the review note above a prefilled form', (tester) async {
      await pumpTeach(
        tester,
        application: InstructorApplication(
          id: 'app-0',
          status: ApplicationStatus.rejected,
          headline: 'Calligrapher',
          reviewNote: 'Please add a teaching sample.',
          categories: const ['design'],
        ),
      );
      expect(find.byKey(const Key('application-rejected')), findsOneWidget);
      expect(find.textContaining('Please add a teaching sample.'), findsOneWidget);
      expect(find.byKey(const Key('apply-form')), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'Calligrapher'), findsOneWidget);
    });

    testWidgets('approved: "You can teach now" refreshes the session into the teacher role', (tester) async {
      final auth = FakeAuthRepository(student);
      final repo = FakeInstructorsRepository(application: _pendingApp);
      late WidgetRef widgetRef;
      await pumpScreen(
        tester,
        Consumer(builder: (context, ref, _) {
          widgetRef = ref;
          return const TeachScreen();
        }),
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(categoryList: _categories)),
          instructorsRepositoryProvider.overrideWithValue(repo),
        ],
      );
      await settle(tester, 10);
      expect(find.byKey(const Key('application-pending')), findsOneWidget);

      // The admin approves: the server now reports a teacher.
      auth.user = teacher;
      repo.application = InstructorApplication(id: 'app-1', status: ApplicationStatus.approved, headline: 'x');
      await tester.tap(find.byKey(const Key('teach-refresh')));
      await settle(tester, 10);
      expect(widgetRef.read(currentRoleProvider), Role.teacher);
      expect(find.text('You can teach now'), findsOneWidget);
      expect(find.byKey(const Key('approved-refresh')), findsOneWidget);
    });
  });

  group('admin: instructor applications', () {
    Future<FakeInstructorsRepository> pumpQueue(WidgetTester tester) async {
      final repo = FakeInstructorsRepository(pending: [_pendingApp]);
      await pumpScreen(tester, const ApprovalsScreen(initialTab: 1), overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(admin)),
        adminRepositoryProvider.overrideWithValue(FakeAdminRepository()),
        proposalsRepositoryProvider.overrideWithValue(FakeProposalsRepository()),
        catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(categoryList: _categories)),
        instructorsRepositoryProvider.overrideWithValue(repo),
      ]);
      await settle(tester, 12);
      return repo;
    }

    testWidgets('shows the applicant and approves', (tester) async {
      final repo = await pumpQueue(tester);
      expect(find.text('Instructor applications'), findsOneWidget);
      expect(find.text('Sara Kamal'), findsOneWidget);
      expect(find.text('sara@example.com'), findsOneWidget);
      expect(find.text('Calligrapher · 10 years'), findsOneWidget);
      expect(find.text('DESIGN'), findsOneWidget);
      expect(find.byKey(const Key('application-sample-app-1')), findsOneWidget);

      await tester.tap(find.byKey(const Key('application-approve-app-1')));
      await settle(tester, 8);
      expect(repo.reviews.single, (id: 'app-1', approve: true, note: null));
      expect(find.text('Decision saved.'), findsOneWidget);
      expect(find.text('Sara Kamal'), findsNothing);
    });

    testWidgets('decline requires a note', (tester) async {
      final repo = await pumpQueue(tester);
      await tester.tap(find.byKey(const Key('application-decline-app-1')));
      await settle(tester);
      expect(find.text('Why are you declining?'), findsOneWidget);

      await tester.tap(find.byKey(const Key('confirm-send-back')));
      await settle(tester);
      expect(find.text('Write at least 3 characters.'), findsOneWidget);
      expect(repo.reviews, isEmpty);

      await tester.enterText(find.byKey(const Key('send-back-note')), 'Please add a teaching sample.');
      await tester.tap(find.byKey(const Key('confirm-send-back')));
      await settle(tester, 8);
      expect(repo.reviews.single, (id: 'app-1', approve: false, note: 'Please add a teaching sample.'));
    });
  });
}
