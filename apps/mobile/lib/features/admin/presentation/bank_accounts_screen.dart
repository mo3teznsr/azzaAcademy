import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

/// Bank accounts students transfer to. Deactivate instead of deleting (orders keep pointing at them).
class BankAccountsScreen extends ConsumerWidget {
  const BankAccountsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final accounts = ref.watch(adminBankAccountsProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    Future<void> edit([AdminBankAccount? a]) async {
      final saved = await showFormSheet<bool>(context, (_) => _BankAccountSheet(account: a));
      if (saved == true && context.mounted) {
        ref.invalidate(adminBankAccountsProvider);
        showToast(context, l.adminBankAccountSaved);
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.adminBankAccountsTitle), actions: [
        IconButton(key: const Key('new-bank-account'), tooltip: l.adminNewBankAccount, icon: const Icon(Icons.add_rounded), onPressed: edit),
      ]),
      body: AsyncView<List<AdminBankAccount>>(
        value: accounts,
        onRetry: () => ref.invalidate(adminBankAccountsProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.adminNoBankAccounts, action: l.adminNewBankAccount, onAction: edit),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(adminBankAccountsProvider),
          children: [
            for (final a in list) ...[
              RaisedCard(
                key: Key('bank-${a.id}'),
                onTap: () => edit(a),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(a.account.bankName, style: t.titleSmall)),
                    StatusChip(
                      label: a.active ? l.adminActive : l.adminInactive,
                      color: a.active ? p.successBg : p.muted,
                      textColor: a.active ? p.success : null,
                      look: a.active ? ChipLook.filled : ChipLook.outline,
                    ),
                  ]),
                  Text(a.account.accountName, style: t.bodySmall),
                  const SizedBox(height: 6),
                  MonoLabel(a.account.iban),
                ]),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

class _BankAccountSheet extends ConsumerStatefulWidget {
  const _BankAccountSheet({this.account});
  final AdminBankAccount? account;

  @override
  ConsumerState<_BankAccountSheet> createState() => _BankAccountSheetState();
}

class _BankAccountSheetState extends ConsumerState<_BankAccountSheet> {
  late final _bank = TextEditingController(text: widget.account?.account.bankName ?? '');
  late final _name = TextEditingController(text: widget.account?.account.accountName ?? '');
  late final _iban = TextEditingController(text: widget.account?.account.iban ?? '');
  late final _swift = TextEditingController(text: widget.account?.account.swift ?? '');
  late final _branch = TextEditingController(text: widget.account?.account.branch ?? '');
  late final _instructions = TextEditingController(text: widget.account?.account.instructions ?? '');
  late final _order = TextEditingController(text: '${widget.account?.sortOrder ?? 0}');
  late bool _active = widget.account?.active ?? true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_bank, _name, _iban, _swift, _branch, _instructions, _order]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final l = context.l10n;
    final iban = _iban.text.replaceAll(' ', '').toUpperCase();
    final swift = _swift.text.trim().toUpperCase();
    if (_bank.text.trim().length < 2 || _name.text.trim().length < 2) return setState(() => _error = l.adminNameRequired);
    if (!RegExp(r'^AE\d{21}$').hasMatch(iban)) return setState(() => _error = l.adminIbanInvalid);
    if (!RegExp(r'^[A-Z0-9]{8}([A-Z0-9]{3})?$').hasMatch(swift)) return setState(() => _error = l.adminSwiftInvalid);
    String? opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
    final body = {
      'bankName': _bank.text.trim(),
      'accountName': _name.text.trim(),
      'iban': iban,
      'swift': swift,
      'branch': ?opt(_branch),
      'instructions': ?opt(_instructions),
      'active': _active,
      'sortOrder': int.tryParse(_order.text.trim()) ?? 0,
    };
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(backOfficeRepositoryProvider).saveBankAccount(widget.account?.id, body);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget field(Key key, TextEditingController c, String label, IconData icon, {String? hint, bool ltr = false, int maxLines = 1, List<TextInputFormatter>? formatters}) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            key: key,
            controller: c,
            maxLines: maxLines,
            textDirection: ltr ? TextDirection.ltr : null,
            inputFormatters: formatters,
            decoration: fieldDecoration(label: label, icon: icon, hint: hint),
          ),
        );
    return FormSheet(
      title: widget.account == null ? l.adminNewBankAccount : l.adminEditBankAccount,
      children: [
        field(const Key('bank-name'), _bank, l.adminBankName, Icons.account_balance_outlined, hint: 'Emirates NBD'),
        field(const Key('bank-account-name'), _name, l.adminAccountName, Icons.badge_outlined, hint: 'Azza Learning FZ-LLC'),
        field(const Key('bank-iban'), _iban, 'IBAN', Icons.numbers_rounded, hint: 'AE070331234567890123456', ltr: true,
            formatters: [FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9 ]')), LengthLimitingTextInputFormatter(29)]),
        field(const Key('bank-swift'), _swift, 'SWIFT', Icons.swap_horiz_rounded, hint: 'EBILAEAD', ltr: true,
            formatters: [FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')), LengthLimitingTextInputFormatter(11)]),
        field(const Key('bank-branch'), _branch, l.adminBranch, Icons.place_outlined, hint: l.adminOptional),
        field(const Key('bank-instructions'), _instructions, l.adminInstructions, Icons.notes_rounded, hint: l.adminInstructionsHint, maxLines: 3),
        field(const Key('bank-order'), _order, l.adminOrder, Icons.sort_rounded, hint: '0', ltr: true, formatters: [FilteringTextInputFormatter.digitsOnly]),
        SwitchListTile(
          key: const Key('bank-active'),
          contentPadding: EdgeInsets.zero,
          title: Text(l.adminShowAtCheckout),
          value: _active,
          onChanged: (v) => setState(() => _active = v),
        ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: AzzaPalette.of(context).danger))],
        const SizedBox(height: 12),
        FilledButton(
          key: const Key('save-bank-account'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _save,
          child: Text(l.save),
        ),
      ],
    );
  }
}
