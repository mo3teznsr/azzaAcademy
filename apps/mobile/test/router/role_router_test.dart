import 'package:azza/app.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/providers.dart';
import 'package:azza/features/admin/data/admin_repository.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/domain/app_user.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/learn/data/learn_repository.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/waitlist/data/waitlist_repository.dart';
import 'package:azza/router/app_router.dart';
import 'package:azza/router/routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';

/// Boots the whole app (real router + redirect) with a faked auth session.
Future<GoRouter> bootApp(WidgetTester tester, AppUser? user, {bool onboarded = true}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final prefs = await testPrefs({'azza.locale': 'en', 'azza.onboarded': onboarded});
  late GoRouter router;
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(user)),
      meRepositoryProvider.overrideWithValue(FakeMeRepository()),
      learnRepositoryProvider.overrideWithValue(FakeLearnRepository()),
      waitlistRepositoryProvider.overrideWithValue(FakeWaitlistRepository()),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository()),
      adminRepositoryProvider.overrideWithValue(FakeAdminRepository()),
      realtimeClientProvider.overrideWithValue(FakeRealtimeClient()),
    ],
    child: Consumer(builder: (context, ref, _) {
      router = ref.watch(routerProvider);
      return const AzzaApp();
    }),
  ));
  await settle(tester, 10);
  return router;
}

String location(GoRouter r) => r.routerDelegate.currentConfiguration.uri.path;

void main() {
  testWidgets('unauthenticated user is sent to sign-in', (tester) async {
    final router = await bootApp(tester, null);
    expect(location(router), Routes.signIn);
    expect(find.text('Take your seat.'), findsOneWidget);
  });

  testWidgets('first run without a session shows the language picker', (tester) async {
    final router = await bootApp(tester, null, onboarded: false);
    expect(location(router), Routes.welcome);
    expect(find.text('Choose your language'), findsOneWidget);
  });

  testWidgets('student lands in the student tree with student tabs', (tester) async {
    final router = await bootApp(tester, student);
    expect(location(router), Routes.studentHome);
    for (final tab in ['Home', 'Explore', 'Schedule', 'Library', 'Me']) {
      expect(find.descendant(of: find.byType(NavigationBar), matching: find.text(tab)), findsOneWidget);
    }
    expect(find.text('Earnings'), findsNothing);
  });

  testWidgets('teacher lands in the teacher tree with teacher tabs', (tester) async {
    final router = await bootApp(tester, teacher);
    expect(location(router), Routes.teacherToday);
    for (final tab in ['Today', 'Batches', 'Calendar', 'Earnings', 'Me']) {
      expect(find.descendant(of: find.byType(NavigationBar), matching: find.text(tab)), findsOneWidget);
    }
    expect(find.text('Explore'), findsNothing);
  });

  testWidgets('admin lands in the admin tree on the cream ground', (tester) async {
    final router = await bootApp(tester, admin);
    expect(location(router), Routes.adminOverview);
    for (final tab in ['Overview', 'Live', 'Batches', 'Approvals', 'Me']) {
      expect(find.descendant(of: find.byType(NavigationBar), matching: find.text(tab)), findsOneWidget);
    }
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
    expect(Theme.of(tester.element(find.byWidget(scaffold))).scaffoldBackgroundColor, const Color(0xFFF5EFE4));
  });

  testWidgets("deep link into another role's tree bounces to own home", (tester) async {
    final router = await bootApp(tester, student);
    router.go(Routes.adminApprovals);
    await settle(tester);
    expect(location(router), Routes.studentHome);

    router.go(Routes.teacherEarnings);
    await settle(tester);
    expect(location(router), Routes.studentHome);
  });
}
