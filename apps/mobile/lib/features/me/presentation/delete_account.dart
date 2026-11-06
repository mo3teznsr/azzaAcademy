import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/presentation/auth_controller.dart';

/// Delete-account flow: students confirm by typing DELETE; teachers/admins are sent to support.
Future<void> confirmDeleteAccount(BuildContext context, WidgetRef ref) async {
  final l = context.l10n;
  final user = ref.read(currentUserProvider);
  if (user != null && user.role != Role.student) {
    showToast(context, l.deleteAccountTeacher);
    return;
  }
  final confirmed = await showDialog<bool>(context: context, builder: (_) => const _DeleteAccountDialog());
  if (confirmed != true || !context.mounted) return;
  try {
    await ref.read(authControllerProvider.notifier).deleteAccount();
  } on AppException catch (e) {
    if (!context.mounted) return;
    showToast(context, switch (e.code) {
      'ORDER_IN_PROGRESS' => l.deleteAccountOrderPending,
      'HAS_ACTIVE_TEACHING' || 'HAS_UNPAID_EARNINGS' || 'ADMIN_ACCOUNT' => l.deleteAccountTeacher,
      _ => l.deleteAccountFailed,
    });
  } catch (_) {
    if (context.mounted) showToast(context, l.deleteAccountFailed);
  }
}

/// Typed confirmation, so the destructive action can't happen from a stray tap.
class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog();

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final ok = _ctrl.text.trim() == 'DELETE';
    return AlertDialog(
      title: Text(l.deleteAccountTitle),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(l.deleteAccountBody),
        const SizedBox(height: 16),
        TextField(
          key: const Key('delete-confirm-field'),
          controller: _ctrl,
          autocorrect: false,
          decoration: InputDecoration(hintText: l.deleteAccountTypeHint),
          onChanged: (_) => setState(() {}),
        ),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
        TextButton(
          key: const Key('delete-confirm'),
          style: TextButton.styleFrom(foregroundColor: AzzaPalette.of(context).danger),
          onPressed: ok ? () => Navigator.pop(context, true) : null,
          child: Text(l.deleteAccountConfirm),
        ),
      ],
    );
  }
}
