import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/utils/links.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';

/// Email + password sign-in / sign-up against better-auth.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key, this.signUp = false});
  final bool signUp;

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = ref.read(authControllerProvider.notifier);
      if (widget.signUp) {
        final user = await auth.signUp(_name.text, _email.text, _password.text);
        if (mounted && !user.emailVerified) {
          context.go(Uri(path: Routes.verifyEmail, queryParameters: {'email': user.email}).toString());
        }
      } else {
        await auth.signIn(_email.text, _password.text);
      }
      // The router redirects to the role's home on auth change.
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgotPassword() async {
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ResetPasswordSheet(initialEmail: _email.text.trim()),
    );
    if (sent == true && mounted) showToast(context, context.l10n.resetLinkSent);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final up = widget.signUp;

    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 24, AzzaSpace.gutter, 24),
            children: [
              const Align(alignment: AlignmentDirectional.centerStart, child: AzzaWordmark(size: 30)),
              const SizedBox(height: 40),
              DisplayText(up ? l.signUpTitle : l.signInTitle, size: 44),
              const SizedBox(height: 10),
              Text(l.signInSubtitle, style: t.bodyMedium?.copyWith(color: p.muted)),
              const SizedBox(height: 28),
              if (up) ...[
                TextFormField(
                  controller: _name,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.name],
                  decoration: fieldDecoration(label: l.fullName, icon: Icons.person_outline_rounded),
                  validator: (v) => (v ?? '').trim().length < 2 ? l.nameTooShort : null,
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                key: const Key('email'),
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                decoration: fieldDecoration(label: l.email, icon: Icons.mail_outline_rounded),
                validator: (v) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch((v ?? '').trim()) ? null : l.invalidEmail,
              ),
              const SizedBox(height: 12),
              PasswordField(
                key: const Key('password'),
                controller: _password,
                label: l.password,
                newPassword: up,
                onSubmitted: (_) => _submit(),
                validator: (v) => (v ?? '').length < 8 ? l.passwordTooShort : null,
              ),
              if (!up)
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: TextButton(key: const Key('forgot-password'), onPressed: _forgotPassword, child: Text(l.forgotPassword)),
                ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: t.bodyMedium?.copyWith(color: AzzaColors.peach)),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: p.onAccent))
                    : Text(up ? l.createAccount : l.signIn),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.go(up ? Routes.signIn : Routes.signUp),
                child: Text(up ? l.haveAccount : l.noAccount),
              ),
              const SizedBox(height: 20),
              Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(l.termsLead, style: t.bodySmall),
                  TextButton(
                    style: TextButton.styleFrom(minimumSize: const Size(44, 44), padding: const EdgeInsets.symmetric(horizontal: 6)),
                    onPressed: () => openExternal(context, ref.read(appConfigProvider).termsUrl),
                    child: Text(l.termsOfService, style: t.bodySmall?.copyWith(decoration: TextDecoration.underline)),
                  ),
                  Text(l.andLabel, style: t.bodySmall),
                  TextButton(
                    style: TextButton.styleFrom(minimumSize: const Size(44, 44), padding: const EdgeInsets.symmetric(horizontal: 6)),
                    onPressed: () => openExternal(context, ref.read(appConfigProvider).privacyUrl),
                    child: Text(l.privacyPolicy, style: t.bodySmall?.copyWith(decoration: TextDecoration.underline)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Forgot password?" sheet: owns its field so it outlives the closing animation.
class _ResetPasswordSheet extends ConsumerStatefulWidget {
  const _ResetPasswordSheet({required this.initialEmail});
  final String initialEmail;

  @override
  ConsumerState<_ResetPasswordSheet> createState() => _ResetPasswordSheetState();
}

class _ResetPasswordSheetState extends ConsumerState<_ResetPasswordSheet> {
  late final _email = TextEditingController(text: widget.initialEmail);
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final address = _email.text.trim();
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(address)) {
      return showToast(context, context.l10n.invalidEmail);
    }
    setState(() => _busy = true);
    final web = ref.read(appConfigProvider).webBaseUrl.replaceFirst(RegExp(r'/$'), '');
    try {
      await ref.read(authRepositoryProvider).requestPasswordReset(address, redirectTo: '$web/reset-password');
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showToast(context, errorText(context, e));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        DisplayText(l.forgotPassword, size: 26),
        const SizedBox(height: 8),
        Text(l.forgotPasswordBody, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 16),
        TextField(
          key: const Key('reset-email'),
          controller: _email,
          autofocus: true,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          decoration: fieldDecoration(label: l.email, icon: Icons.mail_outline_rounded, action: ClearFieldButton(controller: _email)),
          onSubmitted: (_) => _send(),
        ),
        const SizedBox(height: 16),
        FilledButton(key: const Key('reset-send'), onPressed: _busy ? null : _send, child: Text(l.sendResetLink)),
      ]),
    );
  }
}
