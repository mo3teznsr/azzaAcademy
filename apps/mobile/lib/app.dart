import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/domain/enums.dart';
import 'core/l10n/l10n.dart';
import 'core/prefs/app_prefs.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/tokens.dart';
import 'features/auth/presentation/auth_controller.dart';
import 'router/app_router.dart';

ThemeVariant variantFor(Role? role) => switch (role) {
      Role.teacher => ThemeVariant.teacherInk,
      Role.admin => ThemeVariant.adminCream,
      _ => ThemeVariant.studentInk,
    };

class AzzaApp extends ConsumerWidget {
  const AzzaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);
    final role = ref.watch(currentRoleProvider);
    final arabic = locale == AppLocale.ar;

    return MaterialApp.router(
      title: 'Azza',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: AzzaTheme.build(variantFor(role), arabic: arabic),
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
