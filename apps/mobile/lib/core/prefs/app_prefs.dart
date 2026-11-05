import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/enums.dart';

/// Overridden in `main()` (and tests) with a loaded [SharedPreferences].
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider must be overridden'),
);

abstract final class _Keys {
  static const locale = 'azza.locale';
  static const onboarded = 'azza.onboarded';
  static const currency = 'azza.display_currency';
  static const arabicDigits = 'azza.arabic_digits';
  static const interests = 'azza.interests';
  static const timezone = 'azza.timezone';
  static const bestTimes = 'azza.best_times';
  static const themeMode = 'azza.theme_mode';
}

/// App language (persisted). Drives `MaterialApp.locale`, RTL and fonts.
class LocaleController extends Notifier<AppLocale> {
  @override
  AppLocale build() {
    final saved = ref.watch(sharedPreferencesProvider).getString(_Keys.locale);
    if (saved != null) return AppLocale.parse(saved);
    final device = WidgetsBinding.instance.platformDispatcher.locale.languageCode;
    return device == 'ar' ? AppLocale.ar : AppLocale.en;
  }

  Future<void> set(AppLocale locale) async {
    state = locale;
    await ref.read(sharedPreferencesProvider).setString(_Keys.locale, locale.wire);
  }
}

final localeProvider = NotifierProvider<LocaleController, AppLocale>(LocaleController.new);

/// Appearance: System (default) follows the phone's light/dark setting.
class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => switch (ref.watch(sharedPreferencesProvider).getString(_Keys.themeMode)) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };

  Future<void> set(ThemeMode mode) async {
    state = mode;
    await ref.read(sharedPreferencesProvider).setString(_Keys.themeMode, mode.name);
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(ThemeModeController.new);

/// Arabic-Indic numerals (٠١٢٣) toggle; only applied while the locale is Arabic.
class ArabicDigitsController extends Notifier<bool> {
  @override
  bool build() => ref.watch(sharedPreferencesProvider).getBool(_Keys.arabicDigits) ?? true;

  Future<void> set(bool value) async {
    state = value;
    await ref.read(sharedPreferencesProvider).setBool(_Keys.arabicDigits, value);
  }
}

final arabicDigitsPrefProvider = NotifierProvider<ArabicDigitsController, bool>(ArabicDigitsController.new);

/// Whether numbers should render as Arabic-Indic right now.
final useArabicDigitsProvider = Provider<bool>(
  (ref) => ref.watch(localeProvider) == AppLocale.ar && ref.watch(arabicDigitsPrefProvider),
);

class DisplayCurrencyController extends Notifier<DisplayCurrency> {
  @override
  DisplayCurrency build() => DisplayCurrency.parse(ref.watch(sharedPreferencesProvider).getString(_Keys.currency));

  Future<void> set(DisplayCurrency c) async {
    state = c;
    await ref.read(sharedPreferencesProvider).setString(_Keys.currency, c.wire);
  }
}

final displayCurrencyProvider =
    NotifierProvider<DisplayCurrencyController, DisplayCurrency>(DisplayCurrencyController.new);

/// First-run onboarding answers (stored locally, synced to `PATCH /me` after sign-in).
@immutable
class OnboardingAnswers {
  const OnboardingAnswers({
    required this.completed,
    this.interests = const [],
    this.timezone,
    this.bestTimes = const [],
  });

  final bool completed;
  final List<String> interests;
  final String? timezone;
  final List<String> bestTimes;
}

class OnboardingController extends Notifier<OnboardingAnswers> {
  @override
  OnboardingAnswers build() {
    final p = ref.watch(sharedPreferencesProvider);
    return OnboardingAnswers(
      completed: p.getBool(_Keys.onboarded) ?? false,
      interests: p.getStringList(_Keys.interests) ?? const [],
      timezone: p.getString(_Keys.timezone),
      bestTimes: p.getStringList(_Keys.bestTimes) ?? const [],
    );
  }

  Future<void> complete({List<String> interests = const [], String? timezone, List<String> bestTimes = const []}) async {
    final p = ref.read(sharedPreferencesProvider);
    await p.setBool(_Keys.onboarded, true);
    await p.setStringList(_Keys.interests, interests);
    await p.setStringList(_Keys.bestTimes, bestTimes);
    if (timezone != null) await p.setString(_Keys.timezone, timezone);
    state = OnboardingAnswers(completed: true, interests: interests, timezone: timezone, bestTimes: bestTimes);
  }
}

final onboardingProvider = NotifierProvider<OnboardingController, OnboardingAnswers>(OnboardingController.new);
