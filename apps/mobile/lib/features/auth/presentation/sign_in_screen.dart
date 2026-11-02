import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
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
  bool _obscure = true;
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
      if (mounted) setState(() => _error = AppException.from(e).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
                  decoration: InputDecoration(labelText: l.fullName),
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
                decoration: InputDecoration(labelText: l.email),
                validator: (v) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch((v ?? '').trim()) ? null : l.invalidEmail,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const Key('password'),
                controller: _password,
                obscureText: _obscure,
                autofillHints: [up ? AutofillHints.newPassword : AutofillHints.password],
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: l.password,
                  suffixIcon: IconButton(
                    tooltip: l.password,
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) => (v ?? '').length < 8 ? l.passwordTooShort : null,
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
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: Divider(color: p.line)),
                Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: MonoLabel(l.orLabel)),
                Expanded(child: Divider(color: p.line)),
              ]),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => showToast(context, l.comingSoon),
                icon: const Icon(Icons.g_mobiledata_rounded, size: 28),
                label: Text(l.continueGoogle),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () => showToast(context, l.comingSoon),
                icon: const Icon(Icons.apple_rounded),
                label: Text(l.continueApple),
              ),
              const SizedBox(height: 20),
              Text(l.termsNote, style: t.bodySmall, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
