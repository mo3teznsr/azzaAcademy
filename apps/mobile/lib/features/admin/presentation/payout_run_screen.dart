import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/error_text.dart';
import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/admin_repository.dart';

/// Admin: approve a monthly AED payout run to teachers' UAE bank accounts.
class PayoutRunScreen extends ConsumerStatefulWidget {
  const PayoutRunScreen({super.key, required this.runId});
  final String runId;

  @override
  ConsumerState<PayoutRunScreen> createState() => _PayoutRunScreenState();
}

class _PayoutRunScreenState extends ConsumerState<PayoutRunScreen> {
  bool _busy = false;

  Future<void> _approve() async {
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).approvePayoutRun(widget.runId);
      ref
        ..invalidate(payoutRunProvider(widget.runId))
        ..invalidate(payoutRunsProvider);
      if (mounted) showToast(context, context.l10n.runApproved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _export() async {
    try {
      final csv = await ref.read(adminRepositoryProvider).exportPayoutRun(widget.runId);
      await Clipboard.setData(ClipboardData(text: csv));
      if (mounted) showToast(context, context.l10n.copied);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final run = ref.watch(payoutRunProvider(widget.runId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: run.hasValue ? Text(l.payoutRunTitle(f.monthYear(run.requireValue.periodStart))) : null),
      body: AsyncView<PayoutRun>(
        value: run,
        onRetry: () => ref.invalidate(payoutRunProvider(widget.runId)),
        data: (r) => RefreshList(
          onRefresh: () async => ref.invalidate(payoutRunProvider(widget.runId)),
          children: [
            StatusChip(
              label: r.status == PayoutRunStatus.draft ? l.awaitingApproval : r.status.wire,
              color: r.status == PayoutRunStatus.draft ? AzzaColors.green : AzzaPalette.of(context).successBg,
              textColor: r.status == PayoutRunStatus.draft ? AzzaColors.inkDeep : AzzaPalette.of(context).success,
            ),
            const SizedBox(height: 12),
            MonoLabel(l.totalTeachers(f.n(r.payouts.length))),
            DisplayText(f.aed(r.grandTotalFils), size: 40, weight: FontWeight.w800),
            Text('${f.shortDate(r.periodStart)}–${f.shortDate(r.periodEnd)}', style: t.bodySmall),
            const SizedBox(height: 16),
            if (r.payouts.isEmpty) EmptyState(title: l.emptyGeneric),
            if (r.payouts.isNotEmpty)
              SectionCard(
                margin: EdgeInsets.zero,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  for (final (i, line) in r.payouts.indexed)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(line.teacherName, style: t.titleSmall),
                            Text(
                              [
                                ?line.bankName,
                                if (line.adjustmentsFils != 0) '${line.adjustmentsFils > 0 ? '+' : '−'} ${f.aed(line.adjustmentsFils.abs())}',
                                ?line.holdReason,
                              ].join(' · '),
                              style: t.bodySmall,
                            ),
                          ]),
                        ),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text(f.aed(line.netFils), style: t.titleSmall),
                          MonoLabel(
                            switch (line.status) {
                              PayoutStatus.ready => l.ready,
                              PayoutStatus.held => l.held,
                              PayoutStatus.paid => l.paidLabel,
                              PayoutStatus.carriedOver => l.carriedOver,
                            },
                            color: line.status == PayoutStatus.held ? AzzaPalette.of(context).warning : null,
                          ),
                        ]),
                      ]),
                    ),
                ]),
              ),
            if (r.held.isNotEmpty) ...[
              const SizedBox(height: 12),
              RaisedCard(color: AzzaPalette.of(context).warningBg, child: Text(l.heldNote(f.n(r.held.length)), style: t.bodyMedium)),
            ],
          ],
        ),
      ),
      bottomNavigationBar: run.hasValue
          ? BottomActionBar(children: [
              if (run.requireValue.status == PayoutRunStatus.draft)
                FilledButton(
                  onPressed: _busy || run.requireValue.ready.isEmpty ? null : _approve,
                  child: Text(l.approvePayouts(f.n(run.requireValue.ready.length), f.aed(run.requireValue.readyTotalFils))),
                ),
              const SizedBox(height: 8),
              OutlinedButton.icon(onPressed: _export, icon: const Icon(Icons.download_rounded), label: Text(l.downloadFile)),
            ])
          : null,
    );
  }
}
