import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import 'auth_controller.dart';

/// Where the visitor is now (path and query), for `?from=`; null outside a router (isolated widget tests).
String? currentLocation(BuildContext context) {
  try {
    return GoRouterState.of(context).uri.toString();
  } catch (_) {
    return null;
  }
}

/// Gate for actions that need an account (enroll, save, review, message).
/// Signed in → true. A guest is sent to sign-in with the way back ([from], default: here) and gets false.
bool requireAccount(BuildContext context, WidgetRef ref, {String? from}) {
  if (!ref.read(isGuestProvider)) return true;
  context.go(Routes.signInFrom(Routes.safeFrom(from ?? currentLocation(context))));
  return false;
}

/// The friendly state a tab shows to a guest instead of data that needs an account.
class GuestPrompt extends StatelessWidget {
  const GuestPrompt({super.key, required this.title, required this.body, this.icon = Icons.lock_open_rounded, this.from, this.showBrowse = true});
  final String title;
  final String body;
  final IconData icon;

  /// Where to come back to after signing in (default: here).
  final String? from;
  final bool showBrowse;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final back = Routes.safeFrom(from ?? currentLocation(context));
    return SectionCard(
      key: const Key('guest-prompt'),
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: p.successBg, shape: BoxShape.circle),
            child: Icon(icon, color: p.success, size: 26),
          ),
        ),
        const SizedBox(height: 16),
        DisplayText(title, size: 24),
        const SizedBox(height: 8),
        Text(body, style: t.bodyMedium?.copyWith(color: p.muted)),
        const SizedBox(height: 20),
        FilledButton(
          key: const Key('guest-sign-in'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: () => context.go(Routes.signInFrom(back)),
          child: Text(l.signIn),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          key: const Key('guest-sign-up'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: () => context.go(Routes.signUpFrom(back)),
          child: Text(l.createAccount),
        ),
        if (showBrowse) ...[
          const SizedBox(height: 4),
          TextButton(
            key: const Key('guest-browse'),
            style: TextButton.styleFrom(minimumSize: const Size.fromHeight(44)),
            onPressed: () => context.go(Routes.studentExplore),
            child: Text(l.guestBrowseCourses),
          ),
        ],
      ]),
    );
  }
}

/// A full tab for guests: [GuestPrompt] on the page ground.
class GuestTab extends StatelessWidget {
  const GuestTab({super.key, required this.title, required this.body, this.icon = Icons.lock_open_rounded, this.heading, this.footer = const []});
  final String title;
  final String body;
  final IconData icon;
  final String? heading;
  final List<Widget> footer;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 16, AzzaSpace.gutter, 32),
          children: [
            if (heading != null) DisplayText(heading!, size: 32),
            GuestPrompt(title: title, body: body, icon: icon, showBrowse: true),
            ...footer,
          ],
        ),
      ),
    );
  }
}

/// Privacy policy · Terms of service, as two 44pt text links.
class LegalLinks extends ConsumerWidget {
  const LegalLinks({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final config = ref.read(appConfigProvider);
    Widget link(Key key, String label, String url) => TextButton(
          key: key,
          style: TextButton.styleFrom(minimumSize: const Size(44, 44), padding: const EdgeInsets.symmetric(horizontal: 8)),
          onPressed: () => openExternal(context, url),
          child: Text(label, style: t.bodySmall?.copyWith(decoration: TextDecoration.underline)),
        );
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        link(const Key('legal-privacy'), l.privacyPolicy, config.privacyUrl),
        Text('·', style: t.bodySmall),
        link(const Key('legal-terms'), l.termsOfService, config.termsUrl),
      ],
    );
  }
}
