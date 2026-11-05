import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';

/// "Check your inbox" — verification link sent by better-auth, resend timer.
class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key, required this.email});
  final String email;

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  DateTime _canResendAt = DateTime.now().add(const Duration(seconds: 30));
  bool _busy = false;

  Future<void> _resend() async {
    try {
      await ref.read(authRepositoryProvider).sendVerificationEmail(widget.email);
      setState(() => _canResendAt = DateTime.now().add(const Duration(seconds: 30)));
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  Future<void> _continue() async {
    setState(() => _busy = true);
    await ref.read(authControllerProvider.notifier).retry();
    if (!mounted) return;
    setState(() => _busy = false);
    final user = ref.read(currentUserProvider);
    context.go(user == null ? Routes.signIn : Routes.homeFor(user.role));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(),
      body: ListView(
        padding: const EdgeInsets.all(AzzaSpace.gutter),
        children: [
          DisplayText(l.verifyTitle, size: 44),
          const SizedBox(height: 12),
          Text(l.verifyBody(widget.email), style: t.bodyLarge?.copyWith(color: p.muted)),
          const SizedBox(height: 24),
          Ticker(
            builder: (context, now) {
              final left = _canResendAt.difference(now);
              return Row(
                children: [
                  if (left.isNegative)
                    TextButton(onPressed: _resend, child: Text(l.resend))
                  else
                    MonoLabel(l.resendIn(Fmt.timecode(left).substring(3))),
                  const Spacer(),
                  TextButton(
                    // Signed in already: sign out first, or the router bounces sign-up straight back home.
                    onPressed: () async {
                      await ref.read(authControllerProvider.notifier).signOut();
                      if (context.mounted) context.go(Routes.signUp);
                    },
                    child: Text(l.changeEmail),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          RaisedCard(child: Text(l.verifyPermissions, style: t.bodyMedium)),
        ],
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton(onPressed: _busy ? null : _continue, child: Text(l.verifyContinue)),
      ]),
    );
  }
}
