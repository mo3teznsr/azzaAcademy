import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/domain/enums.dart';
import '../../../core/money/money.dart';
import '../../../core/widgets/price.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/providers.dart';
import '../../../core/push/push_service.dart';
import '../../../core/site/site_settings.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/guest_gate.dart';
import '../data/me_repository.dart';

/// "Me" — shared by every role, with role-specific rows.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final user = ref.watch(currentUserProvider);
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final supportEmail = ref.watch(supportEmailProvider);
    final pf = ref.watch(priceFormatProvider);
    // A stored currency that is no longer listed shows (and is used) as AED.
    final currency = pf.fx == null ? pf.currency : pf.shown;
    final push = ref.watch(pushServiceProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    if (user == null) return ref.watch(isGuestProvider) ? _guest(context, ref) : const Scaffold(body: LoadingState());
    final batches = user.role == Role.student ? ref.watch(enrollmentsProvider).value?.where((e) => e.isActive).length : null;

    Widget row(String label, String value, {VoidCallback? onTap, IconData? icon}) => ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      minTileHeight: 56,
      leading: icon == null ? null : Icon(icon, color: p.muted),
      title: Text(label),
      // Capped so a long value ("Photo, password, delete") ellipsizes instead of crowding out the label.
      trailing: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 170),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(value, style: t.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
            if (onTap != null) const Icon(Icons.chevron_right_rounded),
          ],
        ),
      ),
      onTap: onTap,
    );

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 16, AzzaSpace.gutter, 32),
          children: [
            Row(
              children: [
                InitialsAvatar(user.name, size: 64, color: p.accent, imageUrl: user.image),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      DisplayText(user.name, size: 26),
                      Text([user.email, if (batches != null) f.n(l.batchesN(batches))].join(' · '), style: t.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            CardGroup(
              children: [
                row(l.accountTitle, l.accountRowHint, icon: Icons.manage_accounts_outlined, onTap: () => context.push(Routes.editProfile)),
                row(l.timezone, user.timezone, icon: Icons.public_rounded, onTap: () => context.push(Routes.editProfile)),
                row(
                  l.language,
                  locale == AppLocale.ar ? 'العربية' : 'English',
                  icon: Icons.translate_rounded,
                  onTap: () => context.push(Routes.languageSettings),
                ),
                row(l.appearance, _modeLabel(l, ref.watch(themeModeProvider)), icon: Icons.contrast_rounded, onTap: () => _pickThemeMode(context, ref)),
                if (user.role == Role.student)
                  row(l.displayCurrency, currency.wire, icon: Icons.currency_exchange_rounded, onTap: () => _pickCurrency(context, ref)),
              ],
            ),
            CardGroup(
              title: l.notifications,
              children: [
                if (push.enabled)
                  row(
                    l.pushNotifications,
                    switch (ref.watch(pushPermittedProvider).value) {
                      true => l.pushOn,
                      false => l.pushOff,
                      null => '',
                    },
                    icon: Icons.notifications_none_rounded,
                    onTap: () => _openNotificationSettings(context, ref),
                  ),
                row(l.inbox, '', icon: Icons.inbox_outlined, onTap: () => context.push(Routes.notifications)),
              ],
            ),
            CardGroup(
              title: l.account,
              children: [
                if (user.role == Role.admin)
                  row(l.supportInbox, '', icon: Icons.support_agent_rounded, onTap: () => context.push(Routes.adminSupport))
                else
                  row(l.helpSupport, l.helpSupportHint, icon: Icons.support_agent_rounded, onTap: () => context.push(Routes.support)),
                if (user.role == Role.student) ...[
                  // Saving courses is a learner's wishlist; teachers and admins don't browse to buy.
                  row(l.savedCoursesTitle, '', icon: Icons.favorite_border_rounded, onTap: () => context.push(Routes.savedCourses)),
                  row(l.myOrders, '', icon: Icons.receipt_long_outlined, onTap: () => context.push(Routes.myOrders)),
                  row(l.plansTitle, '', icon: Icons.autorenew_rounded, onTap: () => context.push(Routes.myPlans)),
                  row(l.certificatesTitle, '', icon: Icons.workspace_premium_outlined, onTap: () => context.push(Routes.certificates)),
                  row(l.assignments, '', icon: Icons.assignment_outlined, onTap: () => context.push(Routes.assignments)),
                  row(l.myQuizzesTitle, '', icon: Icons.quiz_outlined, onTap: () => context.push(Routes.myQuizzes)),
                ],
                if (user.role == Role.student)
                  row(l.teachOnAzza, l.teachRowHint, icon: Icons.co_present_outlined, onTap: () => context.push(Routes.teachOnAzza)),
                if (user.role == Role.teacher)
                  row(l.payoutMethod, '', icon: Icons.account_balance_outlined, onTap: () => context.go(Routes.teacherPayoutMethod)),
              ],
            ),
            CardGroup(
              title: l.legal,
              children: [
                row(l.privacyPolicy, '', icon: Icons.privacy_tip_outlined, onTap: () => openExternal(context, ref.read(appConfigProvider).privacyUrl)),
                row(l.termsOfService, '', icon: Icons.description_outlined, onTap: () => openExternal(context, ref.read(appConfigProvider).termsUrl)),
                row(
                  l.contactSupport,
                  supportEmail,
                  icon: Icons.mail_outline_rounded,
                  onTap: () => openExternal(context, 'mailto:$supportEmail'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              key: const Key('sign-out'),
              onPressed: () async {
                await ref.read(authControllerProvider.notifier).signOut();
                if (context.mounted) context.go(Routes.welcome);
              },
              icon: const Icon(Icons.logout_rounded),
              label: Text(l.signOut),
            ),
          ],
        ),
      ),
    );
  }

  /// A guest's Me tab: why an account helps, the device settings that need none, and the legal links.
  Widget _guest(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final locale = ref.watch(localeProvider);
    Widget row(Key key, String label, String value, IconData icon, VoidCallback onTap) => ListTile(
          key: key,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          minTileHeight: 56,
          leading: Icon(icon, color: p.muted),
          title: Text(label),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            if (value.isNotEmpty)
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 150),
                child: Text(value, style: Theme.of(context).textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
            const Icon(Icons.chevron_right_rounded),
          ]),
          onTap: onTap,
        );
    final config = ref.read(appConfigProvider);
    final supportEmail = ref.watch(supportEmailProvider);
    return GuestTab(
      heading: l.navMe,
      title: l.guestMeTitle,
      body: l.guestMeBody,
      icon: Icons.person_outline_rounded,
      footer: [
        CardGroup(title: l.appearance, children: [
          row(const Key('guest-language'), l.language, locale == AppLocale.ar ? 'العربية' : 'English', Icons.translate_rounded,
              () => ref.read(localeProvider.notifier).set(locale == AppLocale.ar ? AppLocale.en : AppLocale.ar)),
          row(const Key('guest-appearance'), l.appearance, _modeLabel(l, ref.watch(themeModeProvider)), Icons.contrast_rounded, () => _pickThemeMode(context, ref)),
          row(const Key('guest-teach'), l.teachOnAzza, '', Icons.co_present_outlined, () => context.push(Routes.teachOnAzza)),
        ]),
        CardGroup(title: l.legal, children: [
          row(const Key('guest-privacy'), l.privacyPolicy, '', Icons.privacy_tip_outlined, () => openExternal(context, config.privacyUrl)),
          row(const Key('guest-terms'), l.termsOfService, '', Icons.description_outlined, () => openExternal(context, config.termsUrl)),
          row(const Key('guest-contact'), l.contactSupport, supportEmail, Icons.mail_outline_rounded,
              () => openExternal(context, 'mailto:$supportEmail')),
        ]),
      ],
    );
  }

  /// Notification choices live in the OS settings; asking first if the user was never prompted.
  Future<void> _openNotificationSettings(BuildContext context, WidgetRef ref) async {
    final push = ref.read(pushServiceProvider);
    if (!await push.permitted() && await push.requestPermission()) {
      ref.invalidate(pushPermittedProvider);
      return;
    }
    if (Platform.isIOS) {
      await launchUrl(Uri.parse('app-settings:'));
    } else if (context.mounted) {
      showToast(context, context.l10n.pushSettingsHint);
    }
    ref.invalidate(pushPermittedProvider);
  }

  static String _modeLabel(AppLocalizations l, ThemeMode m) => switch (m) {
    ThemeMode.light => l.themeLight,
    ThemeMode.dark => l.themeDark,
    ThemeMode.system => l.themeSystem,
  };

  Future<void> _pickThemeMode(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final current = ref.read(themeModeProvider);
    final picked = await showModalBottomSheet<ThemeMode>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final m in const [ThemeMode.system, ThemeMode.light, ThemeMode.dark])
              ListTile(
                key: Key('theme-${m.name}'),
                title: Text(_modeLabel(l, m)),
                subtitle: m == ThemeMode.system ? Text(l.themeSystemHint) : null,
                trailing: m == current ? const Icon(Icons.check_rounded) : null,
                onTap: () => Navigator.pop(context, m),
              ),
          ],
        ),
      ),
    );
    if (picked != null) await ref.read(themeModeProvider.notifier).set(picked);
  }

  Future<void> _pickCurrency(BuildContext context, WidgetRef ref) async {
    final pf = ref.read(priceFormatProvider);
    final fx = pf.fx ?? FxRates.fallback;
    final current = pf.fx == null ? pf.currency : pf.shown;
    final arabic = ref.read(localeProvider) == AppLocale.ar;
    final picked = await showModalBottomSheet<DisplayCurrency>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final c in fx.currencies)
              ListTile(
                key: Key('currency-${c.wire}'),
                minTileHeight: 56,
                title: Text(c.wire),
                subtitle: fx.nameOf(c, arabic: arabic) == null ? null : Text(fx.nameOf(c, arabic: arabic)!),
                trailing: c == current ? const Icon(Icons.check_rounded) : null,
                onTap: () => Navigator.pop(context, c),
              ),
          ],
        ),
      ),
    );
    if (picked == null) return;
    await ref.read(displayCurrencyProvider.notifier).set(picked);
    try {
      final updated = await ref.read(meRepositoryProvider).updateProfile(displayCurrency: picked);
      ref.read(authControllerProvider.notifier).updateUser(updated);
    } catch (_) {}
  }
}
