import 'dart:async';

import 'package:flutter_riverpod/misc.dart' show Override;

import '../../../core/prefs/app_prefs.dart';
import '../../../core/push/push_service.dart';
import '../../me/data/me_repository.dart';
import '../domain/app_user.dart';
import 'auth_controller.dart';

/// Production session hooks: sync locale/timezone/currency chosen during
/// onboarding to `PATCH /me`, and register the FCM token at `POST /me/devices`.
List<Override> productionSessionHooks() => [
      postSignInHookProvider.overrideWith((ref) => (AppUser user) async {
            final me = ref.read(meRepositoryProvider);
            final locale = ref.read(localeProvider);
            final onboarding = ref.read(onboardingProvider);
            final currency = ref.read(displayCurrencyProvider);
            if (locale != user.locale ||
                (onboarding.timezone != null && onboarding.timezone != user.timezone) ||
                currency != user.displayCurrency) {
              unawaited(me
                  .updateProfile(locale: locale, timezone: onboarding.timezone, displayCurrency: currency)
                  .then<void>((_) {}, onError: (_) {}));
            }
            final push = ref.read(pushServiceProvider);
            if (!push.enabled) return;
            final token = await push.token();
            if (token != null) await me.registerDevice(token, push.platform);
            push.tokenRefresh.listen((t) => me.registerDevice(t, push.platform).then<void>((_) {}, onError: (_) {}));
          }),
      preSignOutHookProvider.overrideWith((ref) => (AppUser user) async {
            final push = ref.read(pushServiceProvider);
            if (!push.enabled) return;
            final token = await push.token();
            if (token != null) await ref.read(meRepositoryProvider).unregisterDevice(token);
          }),
    ];
