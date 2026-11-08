import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/utils/links.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/phone_field.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';

/// Email + password sign-in / sign-up against better-auth.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key, this.signUp = false, this.from});
  final bool signUp;

  /// Where a guest was when an action asked for an account. The router returns there once signed in.
  final String? from;

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _phone = PhoneController();
  bool _busy = false;
  String? _error;

  /// Fields check themselves as they're edited once the first submit has been tried; quiet before that.
  bool _triedSubmit = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_triedSubmit) setState(() => _triedSubmit = true);
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = ref.read(authControllerProvider.notifier);
      if (widget.signUp) {
        final user = await auth.signUp(_name.text, _email.text, _password.text, _phone.e164);
        if (mounted && !user.emailVerified) {
          context.go(Uri(path: Routes.verifyEmail, queryParameters: {'email': user.email, 'from': ?widget.from}).toString());
        }
      } else {
        await auth.signIn(_email.text, _password.text);
      }
      // Accepted: the platform may now offer to save the password (or update a saved one).
      TextInput.finishAutofillContext();
      // The router redirects on auth change: back to `from` when there is one, else the role's home.
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
      // One autofill context: password managers fill email and password together and offer to save on sign-up.
      body: AutofillGroup(child: SafeArea(
        child: Form(
          key: _form,
          autovalidateMode: _triedSubmit ? AutovalidateMode.onUserInteraction : AutovalidateMode.disabled,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 24, AzzaSpace.gutter, 24),
            children: [
              Row(children: [
                const Expanded(child: Align(alignment: AlignmentDirectional.centerStart, child: AzzaWordmark(size: 36))),
                // Not now: back to what the guest was looking at, or to Welcome (browse, language).
                IconButton(
                  key: const Key('auth-close'),
                  tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                  onPressed: () {
                    final back = widget.from;
                    context.go(back != null && Routes.isGuestPath(Uri.parse(back).path) ? back : Routes.welcome);
                  },
                  icon: const Icon(Icons.close_rounded),
                ),
              ]),
              const SizedBox(height: 20),
              SceneImage(up ? 'signup' : 'signin', height: 190, alignment: const Alignment(0, -0.2)),
              const SizedBox(height: 24),
              DisplayText(up ? l.signUpTitle : l.signInTitle, size: 44),
              const SizedBox(height: 10),
              Text(up ? l.signUpSubtitle : l.signInSubtitle, style: t.bodyMedium?.copyWith(color: p.muted)),
              if (widget.from != null) ...[
                const SizedBox(height: 12),
                Row(key: const Key('resume-notice'), children: [
                  Icon(Icons.keyboard_return_rounded, size: 18, color: p.success),
                  const SizedBox(width: 8),
                  Expanded(child: Text(l.guestResumeNotice, style: t.bodySmall?.copyWith(color: p.success))),
                ]),
              ],
              const SizedBox(height: 28),
              if (up) ...[
                TextFormField(
                  controller: _name,
                  textInputAction: TextInputAction.next,
                  keyboardType: TextInputType.name,
                  textCapitalization: TextCapitalization.words,
                  autofillHints: const [AutofillHints.name],
                  decoration: fieldDecoration(label: l.fullName, icon: Icons.person_outline_rounded, action: ClearFieldButton(controller: _name)),
                  validator: (v) => (v ?? '').trim().length < 2 ? l.nameTooShort : null,
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                key: const Key('email'),
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autocorrect: false,
                autofillHints: [AutofillHints.email, if (!up) AutofillHints.username],
                decoration: fieldDecoration(label: l.email, icon: Icons.mail_outline_rounded, action: ClearFieldButton(controller: _email)),
                validator: (v) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch((v ?? '').trim()) ? null : l.invalidEmail,
              ),
              if (up) ...[
                const SizedBox(height: 12),
                PhoneField(key: const Key('signup-phone'), controller: _phone, required: true, textInputAction: TextInputAction.next),
              ],
              const SizedBox(height: 12),
              PasswordField(
                key: const Key('password'),
                controller: _password,
                label: l.password,
                // Sign-up states the rule under the field rather than as a placeholder.
                helper: up ? l.newPasswordHint : null,
                newPassword: up,
                textInputAction: TextInputAction.done,
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
                Text(_error!, style: t.bodyMedium?.copyWith(color: AzzaPalette.of(context).danger)),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: p.onPrimary))
                    : Text(up ? l.createAccount : l.signIn),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.go(up ? Routes.signInFrom(widget.from) : Routes.signUpFrom(widget.from)),
                child: Text(up ? l.haveAccount : l.noAccount),
              ),
              if (up)
                // The application needs an account: a quiet pointer to where it lives once signed up.
                TextButton.icon(
                  key: const Key('teach-sign-up-link'),
                  style: TextButton.styleFrom(foregroundColor: p.muted, minimumSize: const Size(44, 44)),
                  onPressed: () => showToast(context, l.teachSignUpHint),
                  icon: const Icon(Icons.co_present_outlined, size: 18),
                  label: Text(l.teachSignUpLink),
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
      )),
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
          decoration: fieldDecoration(label: l.email, icon: Icons.mail_outline_rounded, hint: l.emailHint, action: ClearFieldButton(controller: _email)),
          onSubmitted: (_) => _send(),
        ),
        const SizedBox(height: 16),
        FilledButton(key: const Key('reset-send'), onPressed: _busy ? null : _send, child: Text(l.sendResetLink)),
      ]),
    );
  }
}
