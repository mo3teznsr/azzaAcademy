import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/me_repository.dart';

/// Language & region: app language (RTL), numerals, preview.
class LanguageSettingsScreen extends ConsumerWidget {
  const LanguageSettingsScreen({super.key});

  Future<void> _setLocale(WidgetRef ref, AppLocale locale) async {
    await ref.read(localeProvider.notifier).set(locale);
    try {
      final updated = await ref.read(meRepositoryProvider).updateProfile(locale: locale);
      ref.read(authControllerProvider.notifier).updateUser(updated);
    } catch (_) {
      // Persisted locally; the server copy syncs on next sign-in.
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final arabicDigits = ref.watch(arabicDigitsPrefProvider);
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final sample = DateTime.now().add(const Duration(days: 2));
    return Scaffold(
      appBar: AppBar(title: Text(l.languageRegion)),
      body: ListView(
        padding: const EdgeInsets.all(AzzaSpace.gutter),
        children: [
          Kicker(l.appLanguage),
          const SizedBox(height: 10),
          OptionTile(title: 'العربية', subtitle: l.rightToLeft, selected: locale == AppLocale.ar, onTap: () => _setLocale(ref, AppLocale.ar)),
          const SizedBox(height: 8),
          OptionTile(title: 'English', subtitle: l.leftToRight, selected: locale == AppLocale.en, onTap: () => _setLocale(ref, AppLocale.en)),
          if (locale == AppLocale.ar) ...[
            const SizedBox(height: 24),
            Kicker(l.numerals),
            const SizedBox(height: 10),
            OptionTile(title: l.numeralsArabic, selected: arabicDigits, onTap: () => ref.read(arabicDigitsPrefProvider.notifier).set(true)),
            const SizedBox(height: 8),
            OptionTile(title: l.numeralsWestern, selected: !arabicDigits, onTap: () => ref.read(arabicDigitsPrefProvider.notifier).set(false)),
          ],
          const SizedBox(height: 24),
          Kicker(l.preview),
          const SizedBox(height: 10),
          RaisedCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(f.longDate(sample), style: t.titleSmall),
              Text('${f.dayTime(sample)} · ${l.sessionN(f.n(6))}', style: t.bodySmall),
              const SizedBox(height: 8),
              Text(f.aed(88000), style: t.titleMedium),
            ]),
          ),
        ],
      ),
    );
  }
}
