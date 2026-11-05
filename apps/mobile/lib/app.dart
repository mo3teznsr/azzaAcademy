import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/domain/enums.dart';
import 'core/l10n/l10n.dart';
import 'core/prefs/app_prefs.dart';
import 'core/push/push_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/tokens.dart';
import 'features/auth/presentation/auth_controller.dart';
import 'features/me/domain/me_models.dart';
import 'router/app_router.dart';

ThemeVariant variantFor(Role? role) => switch (role) {
      Role.teacher => ThemeVariant.teacher,
      Role.admin => ThemeVariant.admin,
      _ => ThemeVariant.student,
    };

class AzzaApp extends ConsumerStatefulWidget {
  const AzzaApp({super.key});

  @override
  ConsumerState<AzzaApp> createState() => _AzzaAppState();
}

class _AzzaAppState extends ConsumerState<AzzaApp> {
  StreamSubscription<Map<String, String>>? _taps;
  Map<String, String>? _pendingTap;

  @override
  void initState() {
    super.initState();
    final push = ref.read(pushServiceProvider);
    _taps = push.opened.listen(_openPush);
    push.initialOpened().then((data) {
      if (data != null) _openPush(data);
    });
  }

  @override
  void dispose() {
    _taps?.cancel();
    super.dispose();
  }

  /// A tapped push opens its screen; before sign-in it waits until a user is there.
  void _openPush(Map<String, String> data) {
    if (ref.read(currentUserProvider) == null) {
      _pendingTap = data;
      return;
    }
    final route = notificationRoute(data['type'] ?? '', data);
    if (route != null) ref.read(routerProvider).push(route);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(currentUserProvider, (_, user) {
      final tap = _pendingTap;
      if (user != null && tap != null) {
        _pendingTap = null;
        _openPush(tap);
      }
    });
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);
    final role = ref.watch(currentRoleProvider);
    final arabic = locale == AppLocale.ar;

    return MaterialApp.router(
      title: 'Azza',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: AzzaTheme.light(variantFor(role), arabic: arabic),
      darkTheme: AzzaTheme.dark(variantFor(role), arabic: arabic),
      themeMode: ref.watch(themeModeProvider),
      themeAnimationDuration: AzzaMotion.quick,
      locale: Locale(locale.wire),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
