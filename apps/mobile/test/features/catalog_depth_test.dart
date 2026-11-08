import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/utils/share.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/data/reviews_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/catalog/domain/course_filters.dart';
import 'package:azza/features/catalog/domain/review_models.dart';
import 'package:azza/features/catalog/presentation/course_detail_screen.dart';
import 'package:azza/features/catalog/presentation/explore_screen.dart';
import 'package:azza/features/catalog/presentation/explore_filters_sheet.dart';
import 'package:azza/features/catalog/presentation/saved_courses_screen.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/features/teacher/domain/proposal_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

const _design = CourseCategory(slug: 'design', nameEn: 'Design', nameAr: 'التصميم', icon: 'pen-tool', courseCount: 3);
const _languages = CourseCategory(slug: 'languages', nameEn: 'Languages', nameAr: 'اللغات', icon: 'languages', courseCount: 2);

const _course = Course(
  id: 'c1',
  slug: 'product-design',
  titleEn: 'Product Design Foundations',
  category: 'design',
  categoryRef: _design,
  createdById: 'u-t',
  ratingAvg: 4.5,
  ratingCount: 2,
  outcomesEn: ['Run a user interview', 'Ship a case study'],
  requirementsEn: ['A laptop'],
  audienceEn: ['Career switchers'],
  faq: [CourseFaq(qEn: 'Are sessions recorded?', aEn: 'Yes, every session is recorded.')],
  modules: [CourseModule(order: 1, titleEn: 'Seeing like a designer', descriptionEn: 'How to notice friction.')],
);

final _batch = Batch(
  id: 'b1',
  code: 'B07',
  courseId: 'c1',
  teacher: const PersonRef(id: 'u-t', name: 'Lina Haddad'),
  sessionCount: 12,
  schedule: const ScheduleRule(weekdays: [0], startTime: '19:00', durationMin: 90, sessionCount: 12),
);

const _review = CourseReview(id: 'r1', rating: 5, body: 'Loved the critiques.', userId: 'u-x', userName: 'Omar Saleh', teacherReply: 'Thank you, Omar!');
const _review2 = CourseReview(id: 'r2', rating: 4, body: 'Solid pace.', userId: 'u-y', userName: 'Huda Ali');

ReviewsPage _page({bool canReview = false, int total = 2}) => ReviewsPage(
      items: const [_review, _review2],
      total: total,
      ratingAvg: 4.5,
      ratingCount: 2,
      distribution: const {5: 1, 4: 1, 3: 0, 2: 0, 1: 0},
      canReview: canReview,
    );

Future<void> _pumpDetail(WidgetTester tester, {required FakeReviewsRepository reviews, AppUser? user, List<Override> extra = const []}) async {
  await pumpScreen(tester, const CourseDetailScreen(courseId: 'c1'), overrides: [
    authRepositoryProvider.overrideWithValue(FakeAuthRepository(user)),
    catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository(
      courseList: [_course],
      batchList: [_batch],
      relatedList: const [Course(id: 'c2', slug: 'ux-writing', titleEn: 'UX Writing', category: 'design', categoryRef: _design)],
    )),
    reviewsRepositoryProvider.overrideWithValue(reviews),
    fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
    ...extra,
  ]);
  await settle(tester, 12);
}

Future<void> _scrollTo(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(target, 250, scrollable: find.byType(Scrollable).first);
  await settle(tester, 2);
}

void main() {
  group('course detail', () {
    testWidgets('shows learn / requirements / audience / FAQ, module notes, hours, ratings, replies and related', (tester) async {
      await _pumpDetail(tester, reviews: FakeReviewsRepository(page: _page()));

      expect(find.byKey(const Key('total-hours')), findsOneWidget);
      expect(find.text('18 H LIVE'), findsOneWidget, reason: '12 sessions × 90 min');
      expect(find.text('Design · Level 1'.toUpperCase()), findsWidgets);

      await _scrollTo(tester, find.text('Run a user interview'));
      expect(find.text("What you'll learn"), findsOneWidget);
      await _scrollTo(tester, find.text('A laptop'));
      expect(find.text('Requirements'), findsOneWidget);
      await _scrollTo(tester, find.text('Career switchers'));
      expect(find.text("Who it's for"), findsOneWidget);
      await _scrollTo(tester, find.text('How to notice friction.'));

      await _scrollTo(tester, find.text('Are sessions recorded?'));
      expect(find.text('Yes, every session is recorded.'), findsNothing);
      await tester.tap(find.text('Are sessions recorded?'));
      await settle(tester, 8);
      expect(find.text('Yes, every session is recorded.'), findsOneWidget);

      await _scrollTo(tester, find.byKey(const Key('rating-summary')));
      expect(find.text('2 reviews'), findsOneWidget);
      await _scrollTo(tester, find.text('Thank you, Omar!'));
      expect(find.text("TEACHER'S REPLY"), findsOneWidget);
      expect(find.byKey(const Key('reply-r1')), findsNothing, reason: 'signed out: no reply');
      expect(find.byKey(const Key('write-review')), findsNothing);

      await _scrollTo(tester, find.byKey(const Key('related-courses')));
      expect(find.text('You might also like'), findsOneWidget);
      expect(find.text('UX Writing'), findsWidgets);
    });

    testWidgets('share sends the public course link', (tester) async {
      final shared = <Uri>[];
      await _pumpDetail(tester, reviews: FakeReviewsRepository(page: _page()), extra: [
        shareLinkProvider.overrideWithValue((uri, {subject}) async => shared.add(uri)),
      ]);
      await tester.tap(find.byKey(const Key('share-course')));
      await settle(tester);
      expect(shared.single.toString(), 'https://azza.academy/courses/product-design');
      expect(find.byKey(const Key('save-course')), findsOneWidget, reason: 'the heart shows signed out too; it asks for an account');
    });

    testWidgets('"load more" fetches the next page of reviews', (tester) async {
      final repo = FakeReviewsRepository(page: _page(total: 3), morePages: {
        2: const ReviewsPage(items: [CourseReview(id: 'r3', rating: 3, body: 'Okay.', userName: 'Ali')], total: 3, page: 2),
      });
      await _pumpDetail(tester, reviews: repo);
      await _scrollTo(tester, find.byKey(const Key('load-more-reviews')));
      await tester.tap(find.byKey(const Key('load-more-reviews')));
      await settle(tester, 8);
      expect(repo.pagesRequested, contains(2));
      await _scrollTo(tester, find.text('Okay.'));
      expect(find.byKey(const Key('load-more-reviews')), findsNothing);
    });

    testWidgets('a student who attended writes a review', (tester) async {
      final repo = FakeReviewsRepository(page: _page(canReview: true));
      await _pumpDetail(tester, reviews: repo, user: student);
      await _scrollTo(tester, find.byKey(const Key('write-review')));
      await tester.tap(find.byKey(const Key('write-review')));
      await settle(tester, 10);

      await tester.tap(find.byKey(const Key('post-review')));
      await settle(tester);
      expect(find.text('Pick a star rating.'), findsOneWidget);
      expect(repo.saves, isEmpty);

      await tester.tap(find.byKey(const Key('star-4')));
      await tester.enterText(find.byKey(const Key('review-body')), 'Clear and practical.');
      await tester.tap(find.byKey(const Key('post-review')));
      await settle(tester, 12);

      expect(repo.saves.single, (courseId: 'c1', rating: 4, body: 'Clear and practical.'));
      expect(find.text('Thanks for your review.'), findsOneWidget);
      await _scrollTo(tester, find.text('Your review'));
      expect(find.byKey(const Key('edit-my-review')), findsOneWidget);
      expect(find.byKey(const Key('write-review')), findsNothing);
    });

    testWidgets('the course teacher replies to a review', (tester) async {
      final repo = FakeReviewsRepository(page: _page());
      await _pumpDetail(tester, reviews: repo, user: teacher);
      await _scrollTo(tester, find.byKey(const Key('reply-r2')));
      await tester.tap(find.byKey(const Key('reply-r2')));
      await settle(tester, 8);
      await tester.enterText(find.byKey(const Key('reply-text')), 'Glad it worked for you.');
      await tester.tap(find.byKey(const Key('send-reply')));
      await settle(tester, 8);
      expect(repo.replies.single, ('r2', 'Glad it worked for you.'));
      expect(find.byKey(const Key('hide-r2')), findsNothing, reason: 'only admins moderate');
    });

    testWidgets('an admin hides a review', (tester) async {
      final repo = FakeReviewsRepository(page: _page());
      await _pumpDetail(tester, reviews: repo, user: admin);
      await _scrollTo(tester, find.byKey(const Key('hide-r1')));
      await tester.tap(find.byKey(const Key('hide-r1')));
      await settle(tester, 8);
      expect(repo.moderations.single, ('r1', true));
    });

    testWidgets('save toggle hearts the course, and unhearts it', (tester) async {
      final repo = FakeReviewsRepository(page: _page());
      await _pumpDetail(tester, reviews: repo, user: student);
      expect(find.byTooltip('Save'), findsOneWidget);

      await tester.tap(find.byKey(const Key('save-course')));
      await settle(tester, 8);
      expect(repo.saveToggles, [('c1', true)]);
      expect(find.text('Saved.'), findsOneWidget);
      expect(find.byTooltip('Remove from saved'), findsOneWidget);

      await tester.tap(find.byKey(const Key('save-course')));
      await settle(tester, 8);
      expect(repo.saveToggles.last, ('c1', false));
      expect(find.byTooltip('Save'), findsOneWidget);
    });
  });

  group('explore', () {
    Future<FakeCatalogRepository> pumpExplore(WidgetTester tester, {String locale = 'en', List<Course> featured = const []}) async {
      final repo = FakeCatalogRepository(
        categoryList: const [_design, _languages],
        searchResults: const [_course],
        featuredList: featured,
      );
      await pumpScreen(
        tester,
        const ExploreScreen(),
        prefs: await testPrefs({'azza.locale': locale, 'azza.onboarded': true}),
        overrides: [
          catalogRepositoryProvider.overrideWithValue(repo),
          fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
        ],
      );
      await settle(tester, 10);
      return repo;
    }

    testWidgets('the filter sheet sends its choices as query params and badges the count', (tester) async {
      final repo = await pumpExplore(tester);
      expect(find.byKey(const Key('featured-courses')), findsNothing, reason: 'no featured courses → no rail');

      await tester.tap(find.byKey(const Key('open-filters')));
      await settle(tester, 10);
      await tester.tap(find.byKey(const Key('sort-rating')));
      await tester.tap(find.byKey(const Key('level-INTERMEDIATE')));
      await tester.tap(find.byKey(const Key('language-AR')));
      await settle(tester, 2);
      await tester.drag(find.descendant(of: find.byType(CourseFiltersSheet), matching: find.byType(ListView)), const Offset(0, -500));
      await settle(tester, 4);
      await tester.tap(find.byKey(const Key('rating-4.0')));
      await settle(tester, 2);

      await tester.enterText(find.byKey(const Key('min-price')), '100');
      await tester.enterText(find.byKey(const Key('max-price')), '500');
      await tester.tap(find.byKey(const Key('apply-filters')));
      await settle(tester, 10);

      expect(repo.queries.lastWhere((q) => !q.featured).toQuery(), {
        'level': 'INTERMEDIATE',
        'language': 'AR',
        'minPriceAed': 100,
        'maxPriceAed': 500,
        'minRating': 4.0,
        'sort': 'rating',
      });
      expect(find.descendant(of: find.byKey(const Key('filters-badge')), matching: find.text('5')), findsOneWidget);

      // Reset clears the sheet's filters.
      await tester.tap(find.byKey(const Key('open-filters')));
      await settle(tester, 10);
      await tester.tap(find.byKey(const Key('reset-filters')));
      await tester.tap(find.byKey(const Key('apply-filters')));
      await settle(tester, 10);
      expect(repo.queries.lastWhere((q) => !q.featured), const CourseFilters());
    });

    testWidgets('the category rail filters by slug', (tester) async {
      final repo = await pumpExplore(tester);
      await tester.tap(find.byKey(const Key('category-languages')));
      await settle(tester, 8);
      expect(repo.queries.lastWhere((q) => !q.featured).toQuery(), {'category': 'languages'});
    });

    testWidgets('categories render their localised names, with counts', (tester) async {
      await pumpExplore(tester, locale: 'ar', featured: const [Course(id: 'c9', slug: 'f', titleEn: 'Featured one', titleAr: 'دورة مختارة', category: 'design')]);
      expect(find.text('التصميم 3'), findsOneWidget);
      expect(find.text('اللغات 2'), findsOneWidget);
      expect(find.textContaining('التصميم ·'), findsWidgets, reason: 'course card meta line');
      expect(find.byKey(const Key('featured-courses')), findsOneWidget);
      expect(find.text('دورة مختارة'), findsWidgets);
    });
  });

  testWidgets('saved courses: empty state, then the list', (tester) async {
    final repo = FakeReviewsRepository();
    await pumpScreen(tester, const SavedCoursesScreen(), overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
      reviewsRepositoryProvider.overrideWithValue(repo),
      fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
    ]);
    await settle(tester, 8);
    expect(find.text('Nothing saved yet.'), findsOneWidget);
  });

  testWidgets('saved courses list shows rating on the card', (tester) async {
    await pumpScreen(tester, const SavedCoursesScreen(), overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
      reviewsRepositoryProvider.overrideWithValue(FakeReviewsRepository(saved: const [_course])),
      fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
    ]);
    await settle(tester, 8);
    expect(find.text('Product Design Foundations'), findsWidgets);
    expect(find.text('(2)'), findsOneWidget);
  });

  test('course parses the catalog-depth fields; the draft sends them', () {
    final c = Course.fromJson({
      'id': 'c1',
      'slug': 's',
      'titleEn': 'T',
      'category': 'design',
      'categoryRef': {'slug': 'design', 'nameEn': 'Design', 'nameAr': 'التصميم', 'icon': 'pen-tool'},
      'outcomesEn': ['a'],
      'outcomesAr': ['أ'],
      'faq': [
        {'qEn': 'Q?', 'aEn': 'A.'},
      ],
      'ratingAvg': 4.3,
      'ratingCount': 7,
      'featuredRank': 1,
      'modules': [
        {'order': 1, 'titleEn': 'M', 'descriptionEn': 'D'},
      ],
    });
    expect(c.categoryName(AppLocale.ar), 'التصميم');
    expect(c.outcomes(AppLocale.ar), ['أ']);
    expect(c.outcomes(AppLocale.en), ['a']);
    expect(c.faq.single.answer(AppLocale.ar), 'A.', reason: 'falls back to English');
    expect(c.ratingCount, 7);
    expect(c.modules.single.description(AppLocale.en), 'D');

    final body = CourseDraft(
      titleEn: 'T',
      outcomesEn: const ['  Learn  ', ''],
      faq: const [CourseFaq(qEn: 'Q?', aEn: 'A.', qAr: '')],
      modules: const [ModuleDraft(titleEn: 'M', descriptionEn: 'D')],
    ).toJson();
    expect(body['outcomesEn'], ['Learn']);
    expect(body['faq'], [
      {'qEn': 'Q?', 'aEn': 'A.'},
    ]);
    expect((body['modules'] as List).single['descriptionEn'], 'D');
  });
}
