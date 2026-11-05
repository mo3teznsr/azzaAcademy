import 'dart:convert';
import 'dart:io';

import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/money/money.dart';
import 'package:azza/core/network/app_exception.dart';
import 'package:azza/core/network/error_text.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:azza/features/auth/data/auth_repository.dart';
import 'package:azza/features/auth/presentation/sign_in_screen.dart';
import 'package:azza/features/catalog/data/catalog_repository.dart';
import 'package:azza/features/catalog/domain/catalog_models.dart';
import 'package:azza/features/catalog/presentation/course_detail_screen.dart';
import 'package:azza/features/checkout/data/checkout_repository.dart';
import 'package:azza/features/me/data/me_repository.dart';
import 'package:azza/features/me/presentation/edit_profile_screen.dart';
import 'package:azza/features/me/presentation/profile_screen.dart';
import 'package:azza/router/redirect.dart';
import 'package:azza/router/routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';
import '../helpers/harness.dart';
import '../router/role_router_test.dart' show bootApp;

Map<String, dynamic> _json(String name) => (jsonDecode(File('test/fixtures/$name.json').readAsStringSync()) as Map).cast();

Color _ground(WidgetTester tester) =>
    Theme.of(tester.element(find.byType(Scaffold).first)).scaffoldBackgroundColor;

void main() {
  group('appearance', () {
    testWidgets('follows the phone: light → cream ground, dark → ink ground', (tester) async {
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      await bootApp(tester, student);
      expect(_ground(tester), AzzaColors.cream);

      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      await settle(tester, 10);
      expect(_ground(tester), AzzaColors.ink);
    });

    testWidgets('Profile → Appearance → Dark is saved and wins over the phone', (tester) async {
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      final prefs = await testPrefs();
      await pumpScreen(tester, const ProfileScreen(), prefs: prefs, overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
        meRepositoryProvider.overrideWithValue(FakeMeRepository()),
      ]);
      await settle(tester, 12);

      await tester.tap(find.text('Appearance'));
      await settle(tester);
      await tester.tap(find.byKey(const Key('theme-dark')));
      await settle(tester);
      expect(prefs.getString('azza.theme_mode'), 'dark');
      expect(find.text('Dark'), findsOneWidget);
    });

    test('light accents are readable as text on cream (WCAG AA)', () {
      double contrast(Color a, Color b) {
        final la = a.computeLuminance(), lb = b.computeLuminance();
        return (( la > lb ? la : lb) + 0.05) / ((la > lb ? lb : la) + 0.05);
      }

      for (final p in [AzzaPalette.studentLight, AzzaPalette.teacherLight, AzzaPalette.adminLight]) {
        expect(contrast(p.accent, p.ground), greaterThanOrEqualTo(4.5));
        expect(contrast(p.onAccent, p.accent), greaterThanOrEqualTo(4.5));
        expect(contrast(p.text, p.ground), greaterThanOrEqualTo(4.5));
      }
    });
  });

  testWidgets('course detail: clean cover, header title appears only after scrolling', (tester) async {
    final course = Course.fromJson(_json('course_detail'));
    await pumpScreen(tester, const CourseDetailScreen(courseId: 'c1'), overrides: [
      courseProvider('c1').overrideWith((ref) async => course),
      catalogRepositoryProvider.overrideWithValue(FakeCatalogRepository()),
      fxRatesProvider.overrideWith((ref) async => FxRates.fallback),
    ]);
    await settle(tester, 12);

    // Title once, in the body — none painted on the cover.
    expect(find.text('Product Design Foundations'), findsOneWidget);

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
    await settle(tester, 12);
    expect(find.text('Product Design Foundations'), findsWidgets);
    final header = find.descendant(of: find.byType(SliverAppBar), matching: find.text('Product Design Foundations'));
    expect(header, findsOneWidget);
  });

  testWidgets('forgot password sends a reset link for the typed email', (tester) async {
    final auth = FakeAuthRepository();
    await pumpScreen(tester, const SignInScreen(), overrides: [authRepositoryProvider.overrideWithValue(auth)]);
    await settle(tester);

    await tester.enterText(find.byKey(const Key('email')), 'sara@example.com');
    await tester.tap(find.byKey(const Key('forgot-password')));
    await settle(tester);
    expect(tester.widget<TextField>(find.byKey(const Key('reset-email'))).controller!.text, 'sara@example.com');
    await tester.tap(find.byKey(const Key('reset-send')));
    await settle(tester);

    expect(auth.resetRequests, ['sara@example.com']);
    expect(find.textContaining('reset link is on its way'), findsOneWidget);
  });

  testWidgets('errors read in the app language; server English is not shown in Arabic', (tester) async {
    late BuildContext ar;
    await tester.pumpWidget(MaterialApp(
      locale: const Locale('ar'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: localizationDelegates,
      home: Builder(builder: (c) {
        ar = c;
        return const SizedBox();
      }),
    ));
    expect(const AppException('NETWORK', 'No connection').describe(ar), contains('لا يوجد اتصال'));
    expect(const AppException('BUSINESS_RULE', 'Batch is full', statusCode: 422).describe(ar), 'حدث خطأ ما. حاول مجددًا.');
  });

  group('profile photo', () {
    test('students without a photo are held on the photo step; teachers are not', () {
      final noPhoto = student.copyWithImage(null);
      String? go(user, String at) => computeRedirect(auth: AsyncData(user), onboarded: true, location: at);
      expect(go(noPhoto, Routes.studentHome), Routes.profilePhoto);
      expect(go(noPhoto, Routes.profilePhoto), isNull);
      expect(go(student, Routes.profilePhoto), Routes.studentHome);
      expect(go(teacher, Routes.homeFor(teacher.role)), isNull);
    });
  });

  testWidgets('account screen: photo, profile, password and danger zone', (tester) async {
    await pumpScreen(tester, const EditProfileScreen(), overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuthRepository(student)),
      meRepositoryProvider.overrideWithValue(FakeMeRepository()),
    ]);
    await settle(tester, 12);
    expect(find.byKey(const Key('avatar-editor')), findsOneWidget);
    expect(find.text('sara@example.com'), findsOneWidget);
    expect(find.byIcon(Icons.person_outline_rounded), findsOneWidget);

    // Password input group: lock icon + show/hide action.
    final current = find.byKey(const Key('current-password'));
    await tester.scrollUntilVisible(current, 200, scrollable: find.byType(Scrollable).first);
    expect(find.descendant(of: current, matching: find.byIcon(Icons.lock_outline_rounded)), findsOneWidget);
    await tester.enterText(current, 'secret-pass');
    await tester.tap(find.descendant(of: current, matching: find.byTooltip('Show password')));
    await settle(tester);
    expect(find.descendant(of: current, matching: find.byTooltip('Hide password')), findsOneWidget);

    await tester.scrollUntilVisible(find.byKey(const Key('danger-zone')), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Danger zone'), findsOneWidget);
  });
}
