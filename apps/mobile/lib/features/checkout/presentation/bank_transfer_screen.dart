import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/checkout_repository.dart';
import '../domain/checkout_models.dart';

/// Bank transfer: exact AED amount, unique reference, seat held 48 h, receipt upload.
class BankTransferScreen extends ConsumerStatefulWidget {
  const BankTransferScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<BankTransferScreen> createState() => _BankTransferScreenState();
}

class _BankTransferScreenState extends ConsumerState<BankTransferScreen> {
  String? _bankId;
  PickedFile? _file;
  bool _busy = false;

  Future<void> _copy(String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (mounted) showToast(context, context.l10n.copied);
  }

  Future<void> _pick() async {
    final file = await ref.read(receiptPickerProvider).pick();
    if (file == null || !mounted) return;
    if (file.tooLarge) {
      showToast(context, context.l10n.fileTooLarge);
      return;
    }
    setState(() => _file = file);
  }

  Future<void> _submit() async {
    final file = _file;
    if (file == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(checkoutRepositoryProvider).submitReceipt(widget.orderId, file);
      ref.invalidate(orderProvider(widget.orderId));
      if (mounted) context.pushReplacement(Routes.order(widget.orderId));
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
    final order = ref.watch(orderProvider(widget.orderId));
    final banks = ref.watch(bankAccountsProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.bankTransfer),
        actions: [
          if (order.value?.expiresAt != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 16),
              child: Center(
                child: Ticker(
                  builder: (_, now) => MonoLabel(
                    l.seatHeld(Fmt.holdClock(order.requireValue.expiresAt!.difference(now))),
                    color: AzzaColors.sun,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: AsyncView<Order>(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
        data: (o) {
          final expired = o.status == OrderStatus.expired || (o.expiresAt != null && o.expiresAt!.isBefore(DateTime.now()));
          if (expired) {
            return EmptyState(title: l.holdExpired, action: l.retry, onAction: () => context.pushReplacement(Routes.checkout(o.batch?.id ?? '')));
          }
          final ref0 = o.reference;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
            children: [
              MonoLabel(l.transferExactly),
              const SizedBox(height: 6),
              DisplayText(f.aed(o.totalFils), size: 48, weight: FontWeight.w800),
              const SizedBox(height: 16),
              RaisedCard(
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      MonoLabel(l.reference),
                      const SizedBox(height: 4),
                      Text(ref0, key: const Key('transfer-reference'), textDirection: TextDirection.ltr, style: AzzaFonts.mono(size: 18, color: p.text, tracking: 0.04)),
                    ]),
                  ),
                  TextButton.icon(onPressed: () => _copy(ref0), icon: const Icon(Icons.copy_rounded, size: 18), label: Text(l.copy)),
                ]),
              ),
              const SizedBox(height: 10),
              Text(l.referenceHint(f.aed(o.totalFils)), style: t.bodySmall),
              SectionHeader(l.chooseBank),
              AsyncView<List<BankAccount>>(
                value: banks,
                compact: true,
                onRetry: () => ref.invalidate(bankAccountsProvider),
                isEmpty: (list) => list.isEmpty && o.bankAccount == null,
                empty: EmptyState(title: l.noBanks),
                data: (list) {
                  // The order is tied to the account chosen at checkout; GET /orders/:id carries its full IBAN.
                  // The public list (masked IBANs) is only a fallback for orders without one.
                  final all = o.bankAccount != null ? [o.bankAccount!] : list;
                  final selectedId = _bankId ?? all.firstOrNull?.id;
                  final selected = all.where((b) => b.id == selectedId).firstOrNull;
                  return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    for (final b in all) ...[
                      OptionTile(
                        title: b.bankName,
                        subtitle: '${b.accountName}\n${b.ibanIsMasked ? b.iban : b.maskedIban} · ${b.swift}',
                        selected: b.id == selectedId,
                        onTap: () => setState(() => _bankId = b.id),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (selected != null && !selected.ibanIsMasked)
                      TextButton.icon(
                        onPressed: () => _copy(selected.iban),
                        icon: const Icon(Icons.copy_rounded, size: 18),
                        label: Text(l.copyIbanOf(selected.bankName)),
                      ),
                  ]);
                },
              ),
              const SizedBox(height: 20),
              Text(l.uploadReceipt, style: t.bodySmall),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                key: const Key('choose-receipt'),
                onPressed: _pick,
                icon: Icon(_file == null ? Icons.upload_file_rounded : Icons.check_circle_rounded),
                label: Text(_file?.name ?? l.chooseFile, overflow: TextOverflow.ellipsis),
              ),
              if (o.status == OrderStatus.rejected || o.status == OrderStatus.amountMismatch) ...[
                const SizedBox(height: 12),
                RaisedCard(
                  color: AzzaColors.peach.withValues(alpha: 0.14),
                  child: Text(o.rejectionReason ?? l.rejectedTitle, style: t.bodyMedium),
                ),
              ],
            ],
          );
        },
      ),
      bottomNavigationBar: order.hasValue
          ? BottomActionBar(children: [
              FilledButton(
                key: const Key('sent-transfer'),
                onPressed: _file == null || _busy ? null : _submit,
                child: _busy
                    ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: p.onAccent))
                    : Text(l.iSentTransfer),
              ),
            ])
          : null,
    );
  }
}
