import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../theme/tokens.dart';

/// Input group: a leading icon that names the field, the label, and optional trailing actions
/// (clear, show/hide, apply, send) inside the field. Every form in the app uses this.
InputDecoration fieldDecoration({
  required String label,
  required IconData icon,
  Widget? action,
  String? hint,
  String? helper,
  String? prefixText,
  bool labelIsHint = false,
}) =>
    InputDecoration(
      labelText: labelIsHint ? null : label,
      hintText: labelIsHint ? label : hint,
      helperText: helper,
      prefixText: prefixText,
      prefixIcon: Icon(icon, size: 20),
      suffixIcon: action,
    );

/// Trailing "×" that appears only while the field has text.
class ClearFieldButton extends StatelessWidget {
  const ClearFieldButton({super.key, required this.controller, this.onCleared});
  final TextEditingController controller;
  final VoidCallback? onCleared;

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<TextEditingValue>(
        valueListenable: controller,
        builder: (context, value, _) => value.text.isEmpty
            ? const SizedBox.shrink()
            : IconButton(
                tooltip: context.l10n.clear,
                icon: const Icon(Icons.close_rounded, size: 20),
                onPressed: () {
                  controller.clear();
                  onCleared?.call();
                },
              ),
      );
}

/// A compact text action inside the field's trailing edge (e.g. "Apply" on a coupon).
class FieldActionButton extends StatelessWidget {
  const FieldActionButton({super.key, required this.label, required this.onPressed});
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 6),
      child: TextButton(
        style: TextButton.styleFrom(
          foregroundColor: p.isDark ? p.accent : p.text,
          minimumSize: const Size(44, 40),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
        onPressed: onPressed,
        child: Text(label),
      ),
    );
  }
}

/// Password input with a lock icon and a show/hide toggle.
class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    required this.label,
    this.newPassword = false,
    this.validator,
    this.onSubmitted,
    this.textInputAction,
    this.helper,
  });
  final TextEditingController controller;
  final String label;
  final bool newPassword;
  final FormFieldValidator<String>? validator;
  final ValueChanged<String>? onSubmitted;
  final TextInputAction? textInputAction;
  final String? helper;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return TextFormField(
      controller: widget.controller,
      obscureText: _obscure,
      enableSuggestions: false,
      autocorrect: false,
      autofillHints: [widget.newPassword ? AutofillHints.newPassword : AutofillHints.password],
      textInputAction: widget.textInputAction,
      onFieldSubmitted: widget.onSubmitted,
      validator: widget.validator,
      decoration: fieldDecoration(
        label: widget.label,
        icon: Icons.lock_outline_rounded,
        helper: widget.helper,
        action: IconButton(
          tooltip: _obscure ? l.showPassword : l.hidePassword,
          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      ),
    );
  }
}
