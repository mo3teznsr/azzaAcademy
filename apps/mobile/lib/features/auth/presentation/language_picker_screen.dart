import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/device_timezone.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import 'guest_gate.dart';

/// Welcome: the language choice (sets direction, fonts and numerals app-wide), then create an account, sign in,
/// or browse courses as a guest. [from] is where a guest was sent from; signing in or up goes back there.
class LanguagePickerScreen extends ConsumerWidget {
  const LanguagePickerScreen({super.key, this.from});
  final String? from;

  /// Sign-in and browsing skip the interests step: it only personalises a new account.
  Future<void> _finishQuietly(WidgetRef ref) async {
    if (ref.read(onboardingProvider).completed) return;
    await ref.read(onboardingProvider.notifier).complete(timezone: await deviceTimezone());
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final current = ref.watch(localeProvider);
    final p = AzzaPalette.of(context);
    Widget option(AppLocale locale, String name, String dir) {
      final selected = current == locale;
      return OptionTile(
        title: name,
        subtitle: dir,
        selected: selected,
        leading: Text(
          locale == AppLocale.ar ? 'ع' : 'A',
          style: AzzaFonts.display(arabic: locale == AppLocale.ar, size: 28, color: selected ? p.accent : p.muted),
        ),
        onTap: () => ref.read(localeProvider.notifier).set(locale),
      );
    }

    final onboarded = ref.watch(onboardingProvider).completed;
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 24, AzzaSpace.gutter, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Align(alignment: AlignmentDirectional.centerStart, child: AzzaWordmark(size: 40)),
                    const SizedBox(height: 32),
                    DisplayText(l.chooseLanguage, size: 40),
                    const SizedBox(height: 6),
                    Text(current == AppLocale.ar ? 'Choose your language' : 'اختر لغتك', style: TextStyle(color: p.muted)),
                    const SizedBox(height: 28),
                    option(AppLocale.ar, 'العربية', l.rightToLeft),
                    const SizedBox(height: 12),
                    option(AppLocale.en, 'English', l.leftToRight),
                    const SizedBox(height: 20),
                    Text(l.languageHint, style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 20),
                    Expanded(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: 120),
                        child: const SceneImage('welcome', alignment: Alignment(0, -0.3)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      key: const Key('welcome-sign-up'),
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                      // A new account first passes the interests step, which personalises Explore.
                      onPressed: () => context.go(onboarded
                          ? Routes.signUpFrom(from)
                          : Uri(path: Routes.interests, queryParameters: {'next': Routes.signUp, 'from': ?from}).toString()),
                      child: Text(l.createAccount),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton(
                      key: const Key('welcome-sign-in'),
                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                      onPressed: () async {
                        await _finishQuietly(ref);
                        if (context.mounted) context.go(Routes.signInFrom(from));
                      },
                      child: Text(l.signIn),
                    ),
                    const SizedBox(height: 4),
                    TextButton(
                      key: const Key('welcome-browse'),
                      style: TextButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                      onPressed: () async {
                        await _finishQuietly(ref);
                        if (context.mounted) context.go(Routes.studentExplore);
                      },
                      child: Text(l.guestBrowseCourses),
                    ),
                    const LegalLinks(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
