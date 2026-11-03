import 'package:azza/core/domain/enums.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/features/auth/presentation/auth_controller.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/home/presentation/student_home_screen.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
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
  final batch = Batch(
    id: 'b7',
    code: 'B07',
    courseId: 'c1',
    course: course,
    capacity: 24,
    seatsTaken: 23,
    sessionCount: 12,
    sessions: [
      liveSession,
      SessionSummary(
        id: 's6',
        batchId: 'b7',
        number: 6,
        title: 'Prototyping in Figma',
        startsAt: now.add(const Duration(days: 2)),
        endsAt: now.add(const Duration(days: 2, minutes: 90)),
        batchCode: 'B07',
      ),
    ],
  );

  Future<void> pumpHome(WidgetTester tester, FakeMeRepository me) => pumpScreen(
        tester,
        const StudentHomeScreen(),
        overrides: [
          currentUserProvider.overrideWithValue(student),
          meRepositoryProvider.overrideWithValue(me),
          learnRepositoryProvider.overrideWithValue(FakeLearnRepository()),
          waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
        ],
      );

  testWidgets('shows the live session hero, join button and my batches', (tester) async {
    await pumpHome(
      tester,
      FakeMeRepository(
        enrollmentList: [Enrollment(id: 'e1', status: EnrollmentStatus.active, batch: batch, sessionsDone: 4, sessionsTotal: 12)],
        sessions: [liveSession],
      ),
    );
    await settle(tester);

    expect(find.textContaining('Sara'), findsOneWidget);
    expect(find.byKey(const Key('home-hero')), findsOneWidget);
    expect(find.textContaining('LIVE NOW'), findsOneWidget);
    expect(find.text('Wireframes that argue'), findsOneWidget);
    expect(find.text('Join live room'), findsOneWidget);
    expect(find.textContaining('23 in room'), findsOneWidget);
    expect(find.text('My batches'), findsOneWidget);
    expect(find.text('B07 · 4/12'), findsOneWidget);
    expect(find.textContaining('Next ·'), findsOneWidget);
  });

  testWidgets('empty state invites the student to explore', (tester) async {
    await pumpHome(tester, FakeMeRepository());
    await settle(tester);

    expect(find.text('No batches yet'), findsOneWidget);
    expect(find.text('Explore courses'), findsOneWidget);
    expect(find.byKey(const Key('home-hero')), findsNothing);
  });

  testWidgets('error state shows the message and retries', (tester) async {
    final me = FakeMeRepository(error: const AppException('NETWORK', 'No connection to Azza. Check your network.'));
    await pumpHome(tester, me);
    await settle(tester);

    expect(find.text('Something went off-air.'), findsOneWidget);
    expect(find.text('No connection to Azza. Check your network.'), findsOneWidget);

    me
      ..error = null
      ..enrollmentList = [Enrollment(id: 'e1', status: EnrollmentStatus.active, batch: batch)];
    await tester.tap(find.text('Try again'));
    await settle(tester);

    expect(find.text('Something went off-air.'), findsNothing);
    expect(find.text('My batches'), findsOneWidget);
  });
}
