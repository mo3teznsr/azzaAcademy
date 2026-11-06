import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/device_timezone.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/me_repository.dart';
import 'avatar_picker.dart';
import 'delete_account.dart';

/// Account: photo, name & timezone, password, and the danger zone (delete account).
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late final _name = TextEditingController(text: ref.read(currentUserProvider)?.name ?? '');
  late final _email = TextEditingController(text: ref.read(currentUserProvider)?.email ?? '');
  late String _timezone = ref.read(currentUserProvider)?.timezone ?? '';
  String? _device;
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _passwordForm = GlobalKey<FormState>();
  bool _saving = false;
  bool _changingPassword = false;

  @override
  void initState() {
    super.initState();
    deviceTimezone().then((tz) {
      if (mounted) setState(() => _device = tz);
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _current.dispose();
    _next.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l = context.l10n;
    final name = _name.text.trim();
    if (name.length < 2) return showToast(context, l.nameTooShort);
    setState(() => _saving = true);
    try {
      final updated = await ref.read(meRepositoryProvider).updateProfile(name: name, timezone: _timezone.isEmpty ? null : _timezone);
      ref.read(authControllerProvider.notifier).updateUser(updated);
      if (mounted) showToast(context, l.profileSaved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    final l = context.l10n;
    if (!(_passwordForm.currentState?.validate() ?? false)) return;
    setState(() => _changingPassword = true);
    try {
      await ref.read(authRepositoryProvider).changePassword(current: _current.text, next: _next.text);
      _current.clear();
      _next.clear();
      if (mounted) showToast(context, l.passwordChanged);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _changingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final user = ref.watch(currentUserProvider);
    if (user != null && _email.text.isEmpty) {
      // Opened before the session finished restoring: fill in once the user is known.
      _email.text = user.email;
      if (_name.text.isEmpty) _name.text = user.name;
      if (_timezone.isEmpty) _timezone = user.timezone;
    }
    return Scaffold(
      appBar: AppBar(title: Text(l.accountTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 40),
        children: [
          const Center(child: AvatarEditor()),
          const SizedBox(height: 8),
          Center(child: Text(l.changePhoto, style: t.bodySmall)),
          SectionHeader(l.profileSection),
          TextField(
            key: const Key('profile-name'),
            controller: _name,
            textCapitalization: TextCapitalization.words,
            autofillHints: const [AutofillHints.name],
            decoration: fieldDecoration(label: l.fullName, icon: Icons.person_outline_rounded, action: ClearFieldButton(controller: _name)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            readOnly: true,
            enableInteractiveSelection: true,
            decoration: fieldDecoration(
              label: l.email,
              icon: Icons.mail_outline_rounded,
              helper: l.emailLockedNote,
              action: user?.emailVerified ?? true ? Icon(Icons.verified_outlined, color: p.accent, size: 20) : null,
            ),
          ),
          const SizedBox(height: 12),
          InputDecorator(
            decoration: fieldDecoration(
              label: l.timezone,
              icon: Icons.public_rounded,
              helper: l.timezoneHint,
              action: _device != null && _device != _timezone
                  ? FieldActionButton(
                      key: const Key('use-device-timezone'),
                      label: l.useThisPhone,
                      onPressed: () => setState(() => _timezone = _device!),
                    )
                  : null,
            ),
            child: Text(_timezone.isEmpty ? '—' : _timezone, style: t.bodyLarge),
          ),
          const SizedBox(height: 16),
          FilledButton(key: const Key('profile-save'), onPressed: _saving ? null : _save, child: Text(l.saveChanges)),
          SectionHeader(l.changePassword),
          Form(
            key: _passwordForm,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              PasswordField(
                key: const Key('current-password'),
                controller: _current,
                label: l.currentPassword,
                textInputAction: TextInputAction.next,
                validator: (v) => (v ?? '').isEmpty ? l.currentPasswordRequired : null,
              ),
              const SizedBox(height: 12),
              PasswordField(
                key: const Key('new-password'),
                controller: _next,
                label: l.newPassword,
                newPassword: true,
                helper: l.changePasswordNote,
                onSubmitted: (_) => _changePassword(),
                validator: (v) => (v ?? '').length < 8 ? l.passwordTooShort : null,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                key: const Key('change-password'),
                onPressed: _changingPassword ? null : _changePassword,
                icon: const Icon(Icons.key_rounded, size: 18),
                label: Text(l.changePassword),
              ),
            ]),
          ),
          SectionHeader(l.dangerZone),
          _DangerZone(isStudent: user?.role == Role.student),
        ],
      ),
    );
  }
}

/// Red-outlined card that holds the irreversible action.
class _DangerZone extends ConsumerWidget {
  const _DangerZone({required this.isStudent});
  final bool isStudent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final danger = p.danger;
    return Container(
      key: const Key('danger-zone'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
        border: Border.all(color: danger.withValues(alpha: 0.6)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.warning_amber_rounded, color: danger, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(l.deleteAccount, style: t.titleSmall)),
        ]),
        const SizedBox(height: 6),
        Text(isStudent ? l.deleteAccountSummary : l.deleteAccountTeacher, style: t.bodySmall),
        const SizedBox(height: 14),
        OutlinedButton.icon(
          key: const Key('delete-account'),
          style: OutlinedButton.styleFrom(foregroundColor: danger, side: BorderSide(color: danger)),
          onPressed: () => confirmDeleteAccount(context, ref),
          icon: const Icon(Icons.delete_forever_outlined, size: 18),
          label: Text(l.deleteAccount),
        ),
      ]),
    );
  }
}
