import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../checkout/data/checkout_repository.dart' show receiptPickerProvider;
import '../../checkout/domain/checkout_models.dart' show PickedFile;
import '../data/subscription_repository.dart';
import '../domain/subscription_models.dart';

/// Android: pay a plan by bank transfer. The exact amount, the reference to quote, the bank's details and the
/// receipt upload, as for a seat. The plan starts once the transfer is confirmed, usually within 1 working day.
class PlanTransferScreen extends ConsumerStatefulWidget {
  const PlanTransferScreen({super.key, required this.start});
  final TransferStart start;

  @override
  ConsumerState<PlanTransferScreen> createState() => _PlanTransferScreenState();
}

class _PlanTransferScreenState extends ConsumerState<PlanTransferScreen> {
  PickedFile? _file;
  bool _busy = false;
  bool _sent = false;

  Future<void> _copy(String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (mounted) showToast(context, context.l10n.copied);
  }

  Future<void> _pick() async {
    final file = await ref.read(receiptPickerProvider).pick();
    if (file == null || !mounted) return;
    if (file.tooLarge) return showToast(context, context.l10n.fileTooLarge);
    setState(() => _file = file);
  }

  Future<void> _submit() async {
    final file = _file;
    if (file == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(subscriptionRepositoryProvider).submitReceipt(widget.start.paymentId, file);
      ref.invalidate(mySubscriptionsProvider);
      if (mounted) setState(() => _sent = true);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final s = widget.start;
    final bank = s.bankAccount;

    return Scaffold(
      appBar: AppBar(title: Text(l.bankTransfer)),
      body: _sent
          ? ListView(padding: const EdgeInsets.all(AzzaSpace.gutter), children: [
              RaisedCard(
                key: const Key('receipt-sent'),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.check_circle_rounded, color: p.success, size: 32),
                  const SizedBox(height: 12),
                  Text(l.planReceiptSent, style: t.titleMedium),
                  const SizedBox(height: 4),
                  Text(l.planReceiptSentBody, style: t.bodyMedium),
                ]),
              ),
            ])
          : ListView(
              padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
              children: [
                Kicker(l.transferExactly),
                const SizedBox(height: 6),
                DisplayText(f.aed(s.amountFils), size: 48, weight: FontWeight.w800),
                const SizedBox(height: 16),
                RaisedCard(
                  child: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Kicker(l.reference),
                        const SizedBox(height: 4),
                        Text(s.reference, key: const Key('transfer-reference'), textDirection: TextDirection.ltr, style: AzzaFonts.mono(size: 18, color: p.text, tracking: 0.04)),
                      ]),
                    ),
                    TextButton.icon(
                      style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                      onPressed: () => _copy(s.reference),
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      label: Text(l.copy),
                    ),
                  ]),
                ),
                const SizedBox(height: 10),
                Text(l.referenceHint(f.aed(s.amountFils)), style: t.bodySmall),
                SectionHeader(l.chooseBank),
                OptionTile(
                  title: bank.bankName,
                  subtitle: '${bank.accountName}\n${bank.iban} · ${bank.swift}',
                  selected: true,
                  onTap: () {},
                ),
                if (!bank.ibanIsMasked)
                  TextButton.icon(
                    style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                    onPressed: () => _copy(bank.iban),
                    icon: const Icon(Icons.copy_rounded, size: 18),
                    label: Text(l.copyIbanOf(bank.bankName)),
                  ),
                if (s.expiresAt != null) ...[
                  const SizedBox(height: 4),
                  Text(l.planTransferBefore(f.dayTime(s.expiresAt!)), style: t.bodySmall),
                ],
                const SizedBox(height: 8),
                Text(l.planTransferNote, style: t.bodyMedium),
                SectionCard(
                  margin: const EdgeInsets.only(top: 12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Text(l.uploadReceipt, style: t.bodySmall),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      key: const Key('choose-receipt'),
                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                      onPressed: _pick,
                      icon: Icon(_file == null ? Icons.upload_file_rounded : Icons.check_circle_rounded),
                      label: Text(_file?.name ?? l.chooseFile, overflow: TextOverflow.ellipsis),
                    ),
                  ]),
                ),
              ],
            ),
      bottomNavigationBar: BottomActionBar(children: [
        if (_sent)
          FilledButton(key: const Key('transfer-done'), onPressed: () => context.pop(), child: Text(l.planBackToCourse))
        else
          FilledButton(
            key: const Key('sent-transfer'),
            onPressed: _file == null || _busy ? null : _submit,
            child: _busy
                ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: p.onPrimary))
                : Text(l.iSentTransfer),
          ),
      ]),
    );
  }
}
