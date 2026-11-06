import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/error_text.dart';
import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/teacher_repository.dart';

/// Payout method (UAE bank, AED only, verified by finance) + payout history.
class PayoutMethodScreen extends ConsumerWidget {
  const PayoutMethodScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final bank = ref.watch(bankDetailsProvider);
    final payouts = ref.watch(payoutsProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.payoutMethod)),
      body: RefreshList(
        onRefresh: () async {
          ref.invalidate(bankDetailsProvider);
          ref.invalidate(payoutsProvider);
        },
        children: [
          AsyncView<TeacherBankDetails?>(
            value: bank,
            compact: true,
            onRetry: () => ref.invalidate(bankDetailsProvider),
            isEmpty: (b) => b == null,
            empty: Column(children: [
              EmptyState(title: l.noBankDetails, icon: Icons.account_balance_outlined),
              FilledButton(onPressed: () => _edit(context, ref, null), child: Text(l.addBank)),
            ]),
            data: (b) => RaisedCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(l.payoutMethod, style: t.titleMedium)),
                  b!.verified
                      ? StatusChip(label: l.verified, color: AzzaPalette.of(context).successBg, textColor: AzzaPalette.of(context).success)
                      : StatusChip(label: l.unverified, color: AzzaPalette.of(context).warning, look: ChipLook.dashed),
                ]),
                const SizedBox(height: 8),
                KeyValueRow(l.bankName, b.bankName),
                KeyValueRow(l.accountHolder, b.accountHolder),
                KeyValueRow(l.iban, b.maskedIban, mono: true),
                KeyValueRow(l.swift, b.swift, mono: true),
                KeyValueRow(l.payoutCurrency, 'AED'),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: () => _edit(context, ref, b), child: Text(l.changeBank)),
                const SizedBox(height: 8),
                Text(l.changeBankNote, style: t.bodySmall),
              ]),
            ),
          ),
          SectionCard(
            title: l.history,
            margin: const EdgeInsets.only(top: 24),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: AsyncView<List<PayoutEntry>>(
              value: payouts,
              compact: true,
              onRetry: () => ref.invalidate(payoutsProvider),
              isEmpty: (list) => list.isEmpty,
              empty: Text(l.noPayouts, style: t.bodySmall),
              data: (list) => Column(children: [
                for (final (i, e) in list.indexed)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
                    child: Row(children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(e.paidAt != null ? f.shortDate(e.paidAt!) : (e.periodEnd != null ? f.monthYear(e.periodEnd!) : '—'), style: t.titleSmall),
                          if (e.reference != null) MonoLabel(e.reference!),
                          if (e.holdReason != null) Text(e.holdReason!, style: t.bodySmall),
                        ]),
                      ),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(f.aed(e.amountFils), style: t.titleSmall),
                        MonoLabel(switch (e.status) {
                          PayoutStatus.paid => l.paidLabel,
                          PayoutStatus.held => l.held,
                          PayoutStatus.carriedOver => l.carriedOver,
                          PayoutStatus.ready => l.ready,
                        }),
                      ]),
                    ]),
                  ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _edit(BuildContext context, WidgetRef ref, TeacherBankDetails? current) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _BankForm(current: current),
    );
    ref.invalidate(bankDetailsProvider);
  }
}

class _BankForm extends ConsumerStatefulWidget {
  const _BankForm({this.current});
  final TeacherBankDetails? current;

  @override
  ConsumerState<_BankForm> createState() => _BankFormState();
}

class _BankFormState extends ConsumerState<_BankForm> {
  final _form = GlobalKey<FormState>();
  late final _bank = TextEditingController(text: widget.current?.bankName);
  late final _holder = TextEditingController(text: widget.current?.accountHolder);
  final _iban = TextEditingController();
  late final _swift = TextEditingController(text: widget.current?.swift);
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_bank, _holder, _iban, _swift]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      await ref.read(teacherRepositoryProvider).saveBankDetails(TeacherBankDetails(
            bankName: _bank.text.trim(),
            accountHolder: _holder.text.trim(),
            iban: _iban.text.replaceAll(' ', '').toUpperCase(),
            swift: _swift.text.trim().toUpperCase(),
          ));
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Form(
        key: _form,
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextFormField(controller: _bank, decoration: fieldDecoration(label: l.bankName, icon: Icons.account_balance_outlined), validator: (v) => (v ?? '').trim().length < 2 ? l.nameTooShort : null),
          const SizedBox(height: 10),
          TextFormField(controller: _holder, decoration: fieldDecoration(label: l.accountHolder, icon: Icons.badge_outlined), validator: (v) => (v ?? '').trim().length < 2 ? l.nameTooShort : null),
          const SizedBox(height: 10),
          TextFormField(
            controller: _iban,
            textCapitalization: TextCapitalization.characters,
            decoration: fieldDecoration(label: l.iban, icon: Icons.numbers_rounded, hint: 'AE07 0331 2345 6789 0123 456'),
            validator: (v) => TeacherBankDetails.ibanPattern.hasMatch((v ?? '').replaceAll(' ', '').toUpperCase()) ? null : l.ibanInvalid,
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _swift,
            textCapitalization: TextCapitalization.characters,
            decoration: fieldDecoration(label: l.swift, icon: Icons.swap_horiz_rounded),
            validator: (v) => TeacherBankDetails.swiftPattern.hasMatch((v ?? '').trim().toUpperCase()) ? null : l.swiftInvalid,
          ),
          const SizedBox(height: 10),
          Text(l.changeBankNote, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 14),
          FilledButton(onPressed: _busy ? null : _save, child: Text(l.save)),
        ]),
      ),
    );
  }
}
