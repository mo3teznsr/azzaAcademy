import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;

import '../../../core/prefs/app_prefs.dart';
import '../../../core/push/push_service.dart';
import '../../checkout/data/checkout_repository.dart' show fxRatesProvider;
import '../../checkout/presentation/apple_purchase_coordinator.dart';
import '../../me/data/me_repository.dart';
import '../domain/app_user.dart';
import 'auth_controller.dart';

/// Production session hooks.
/// - Sign-up: save the language/timezone/currency chosen during onboarding to the new profile (`PATCH /me`).
/// - Sign-in / restore: the account's saved profile wins — adopt its locale and display currency locally,
///   so one person's device choices are never written into another account signing in on the same phone.
/// - Both: register the FCM token at `POST /me/devices` (when push is configured), and on iOS start the App Store
///   transaction listener, which re-posts purchases left unfinished by a killed app (needs the session).
List<Override> productionSessionHooks() => [
      postSignUpHookProvider.overrideWith((ref) => (AppUser user) async {
            final me = ref.read(meRepositoryProvider);
            final locale = ref.read(localeProvider);
            final onboarding = ref.read(onboardingProvider);
            final currency = ref.read(displayCurrencyProvider);
            if (locale != user.locale ||
                (onboarding.timezone != null && onboarding.timezone != user.timezone) ||
                currency != user.displayCurrency) {
              // The currency goes separately, and only if it is still offered, so a rejected currency
              // never blocks the locale and timezone sync.
              unawaited(me.updateProfile(locale: locale, timezone: onboarding.timezone).then<void>((_) {}, onError: (_) {}));
              if (currency != user.displayCurrency) {
                unawaited(() async {
                  try {
                    final fx = await ref.read(fxRatesProvider.future);
                    if (fx.has(currency)) await me.updateProfile(displayCurrency: currency);
                  } catch (_) {}
                }());
              }
            }
            unawaited(ref.read(appleIapCoordinatorProvider).start());
            await _registerDevice(ref, user);
          }),
      postSignInHookProvider.overrideWith((ref) => (AppUser user) async {
            if (ref.read(localeProvider) != user.locale) await ref.read(localeProvider.notifier).set(user.locale);
            if (ref.read(displayCurrencyProvider) != user.displayCurrency) {
              await ref.read(displayCurrencyProvider.notifier).set(user.displayCurrency);
            }
            unawaited(ref.read(appleIapCoordinatorProvider).start());
            await _registerDevice(ref, user);
          }),
      preSignOutHookProvider.overrideWith((ref) => (AppUser user) async {
            final push = ref.read(pushServiceProvider);
            if (!push.enabled) return;
            final token = await push.token();
            if (token != null) await ref.read(meRepositoryProvider).unregisterDevice(token);
          }),
    ];

Future<void> _registerDevice(Ref ref, AppUser user) async {
  final push = ref.read(pushServiceProvider);
  if (!push.enabled) return;
  // Asked only once someone is signed in and knows what the app is for — not on first launch.
  if (!await push.requestPermission()) return;
  final me = ref.read(meRepositoryProvider);
  final token = await push.token();
  if (token != null) await me.registerDevice(token, push.platform);
  push.tokenRefresh.listen((t) => me.registerDevice(t, push.platform).then<void>((_) {}, onError: (_) {}));
}
