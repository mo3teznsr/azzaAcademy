import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';

/// First-run language choice; sets direction, fonts and numerals app-wide.
class LanguagePickerScreen extends ConsumerWidget {
  const LanguagePickerScreen({super.key});

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

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 24, AzzaSpace.gutter, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Align(alignment: AlignmentDirectional.centerStart, child: AzzaWordmark(size: 32)),
              const SizedBox(height: 48),
              DisplayText(l.chooseLanguage, size: 40),
              const SizedBox(height: 6),
              Text(current == AppLocale.ar ? 'Choose your language' : 'اختر لغتك', style: TextStyle(color: p.muted)),
              const SizedBox(height: 28),
              option(AppLocale.ar, 'العربية', l.rightToLeft),
              const SizedBox(height: 12),
              option(AppLocale.en, 'English', l.leftToRight),
              const SizedBox(height: 20),
              Text(l.languageHint, style: Theme.of(context).textTheme.bodySmall),
              const Spacer(),
              FilledButton(onPressed: () => context.go(Routes.interests), child: Text(l.continueLabel)),
            ],
          ),
        ),
      ),
    );
  }
}
