import 'package:azza/core/l10n/l10n.dart';
import 'package:azza/core/prefs/app_prefs.dart';
import 'package:azza/core/theme/app_theme.dart';
import 'package:azza/core/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<SharedPreferences> testPrefs([Map<String, Object> values = const {'azza.locale': 'en', 'azza.onboarded': true}]) async {
  SharedPreferences.setMockInitialValues(values);
  return SharedPreferences.getInstance();
}

const localizationDelegates = [
  AppLocalizations.delegate,
  GlobalMaterialLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
];

/// Pumps a single screen with the student ink theme, l10n and the given overrides.
Future<void> pumpScreen(
  WidgetTester tester,
  Widget child, {
  required List<Override> overrides,
  SharedPreferences? prefs,
}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final p = prefs ?? await testPrefs();
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [sharedPreferencesProvider.overrideWithValue(p), ...overrides],
    child: MaterialApp(
      theme: AzzaTheme.build(ThemeVariant.studentInk),
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: localizationDelegates,
      home: child,
    ),
  ));
}

/// Pumps a few frames without waiting for infinite "live" animations to settle.
Future<void> settle(WidgetTester tester, [int frames = 6]) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}
