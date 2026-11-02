import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../checkout/data/checkout_repository.dart';
import '../../checkout/domain/checkout_models.dart';
import '../data/admin_repository.dart';

/// Admin: verify a bank transfer — match amount, reference and account, then enroll.
class TransferVerifyScreen extends ConsumerStatefulWidget {
  const TransferVerifyScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<TransferVerifyScreen> createState() => _TransferVerifyScreenState();
}

class _TransferVerifyScreenState extends ConsumerState<TransferVerifyScreen> {
  final _received = TextEditingController();
  String? _reason;
  bool _busy = false;
  bool _hydrated = false;

  @override
  void dispose() {
    _received.dispose();
    super.dispose();
  }

  Future<void> _decide(TransferDecision decision) async {
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      final received = double.tryParse(_received.text.replaceAll(',', ''));
      await ref.read(adminRepositoryProvider).reviewTransfer(
            widget.orderId,
            decision,
            receivedFils: received == null ? null : Money.aedToFils(received),
            reason: _reason,
          );
      ref.invalidate(transfersProvider);
      if (!mounted) return;
      showToast(context, l.reviewDone);
      context.pop();
    } catch (e) {
      if (mounted) showToast(context, AppException.from(e).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final order = ref.watch(orderProvider(widget.orderId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final reasons = [l.reasonShort, l.reasonReference, l.reasonUnreadable, l.reasonNotReceived];

    return Scaffold(
      appBar: AppBar(title: order.hasValue ? Text(l.transferTitle(order.requireValue.reference)) : null),
      body: AsyncView<Order>(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
        data: (o) {
          if (!_hydrated) {
            _hydrated = true;
            _received.text = Money.filsToAed(o.receivedFils ?? o.totalFils).toStringAsFixed(2);
          }
          final received = double.tryParse(_received.text.replaceAll(',', ''));
          final matches = received != null && Money.aedToFils(received) == o.totalFils;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
            children: [
              RaisedCard(
                onTap: o.receiptUrl == null ? null : () => openExternal(context, o.receiptUrl),
                child: Row(children: [
                  Icon(Icons.receipt_long_rounded, color: p.muted, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(l.receiptPreview, style: t.titleSmall),
                      Text(o.receiptUrl == null ? l.noReceipt : l.openFullSize, style: t.bodySmall),
                    ]),
                  ),
                  if (o.receiptUrl != null) const Icon(Icons.open_in_new_rounded),
                ]),
              ),
              const SizedBox(height: 12),
              KeyValueRow(l.studentLabel, o.student?.name ?? '—'),
              KeyValueRow(l.batchLabel, '${o.batch?.course?.title(locale) ?? ''} · ${o.batch?.code ?? ''}'),
              KeyValueRow(l.reference, o.reference, mono: true),
              if (o.bankAccount != null) KeyValueRow(l.bankName, o.bankAccount!.bankName),
              KeyValueRow(l.expected, f.aed(o.totalFils), emphasize: true),
              const SizedBox(height: 8),
              TextField(
                controller: _received,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: l.receivedStatement,
                  prefixText: 'AED ',
                  suffixIcon: Icon(matches ? Icons.check_circle_rounded : Icons.error_outline_rounded, color: matches ? Colors.green.shade700 : AzzaColors.warnDeep),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _reason,
                decoration: InputDecoration(labelText: l.rejectReason),
                items: [for (final r in reasons) DropdownMenuItem(value: r, child: Text(r))],
                onChanged: (v) => setState(() => _reason = v),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _busy || _reason == null ? null : () => _decide(TransferDecision.requestNewReceipt),
                child: Text(l.requestNewReceipt),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: order.hasValue
          ? BottomActionBar(children: [
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy || _reason == null ? null : () => _decide(TransferDecision.reject),
                    child: Text(l.reject),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: _busy || double.tryParse(_received.text) == null ? null : () => _decide(TransferDecision.approve),
                    child: Text(l.approveEnroll),
                  ),
                ),
              ]),
            ])
          : null,
    );
  }
}
