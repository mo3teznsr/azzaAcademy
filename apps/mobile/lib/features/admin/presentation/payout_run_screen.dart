import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/error_text.dart';
import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/admin_repository.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

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

  void _refresh() => ref
    ..invalidate(payoutRunProvider(widget.runId))
    ..invalidate(payoutRunsProvider)
    ..invalidate(adminDashboardProvider);

  /// APPROVED → PAID once finance has sent the bank transfers.
  Future<void> _markPaid(PayoutRun run) async {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    final reference = await showFormSheet<String>(context, (_) => _MarkPaidSheet(total: f.aed(run.readyTotalFils), count: run.ready.length));
    if (reference == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(backOfficeRepositoryProvider).markRunPaid(widget.runId, reference);
      _refresh();
      if (mounted) showToast(context, l.adminRunMarkedPaid);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// DRAFT runs only: a bonus (+) or deduction (−) on one teacher's payout.
  Future<void> _adjust(PayoutLine line) async {
    final l = context.l10n;
    final changed = await showFormSheet<bool>(context, (_) => _AdjustSheet(line: line));
    if (changed != true || !mounted) return;
    _refresh();
    showToast(context, l.adminAdjustmentSaved);
  }

  /// Confirms the teacher's IBAN; their HELD payouts in draft runs are re-evaluated.
  Future<void> _verifyBank(PayoutLine line) async {
    final l = context.l10n;
    final ok = await confirmAction(
      context,
      title: l.adminVerifyBankTitle(line.teacherName),
      body: l.adminVerifyBankBody(line.bankName ?? '—', line.accountHolder ?? '—', line.iban ?? '—'),
      confirm: l.adminVerifyBank,
      destructive: false,
    );
    if (!ok || !mounted) return;
    try {
      await ref.read(backOfficeRepositoryProvider).verifyTeacherBank(line.teacherId);
      _refresh();
      if (mounted) showToast(context, l.adminBankVerified(line.teacherName));
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
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
            Kicker(f.n(l.totalTeachers(r.payouts.length))),
            DisplayText(f.aed(r.grandTotalFils), size: 40, weight: FontWeight.w800),
            Text(f.dateRange(r.periodStart, r.periodEnd), style: t.bodySmall),
            const SizedBox(height: 16),
            if (r.payouts.isEmpty) EmptyState(title: l.emptyGeneric),
            if (r.payouts.isNotEmpty)
              SectionCard(
                margin: EdgeInsets.zero,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  for (final (i, line) in r.payouts.indexed)
                    InkWell(
                      key: Key('payout-${line.id}'),
                      onTap: r.status == PayoutRunStatus.draft ? () => _adjust(line) : null,
                      child: Container(
                      constraints: const BoxConstraints(minHeight: 56),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Row(children: [
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
                          Kicker(
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
                      if (line.courses.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Column(key: Key('payout-courses-${line.id}'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                            for (final c in line.courses)
                              Row(children: [
                                Expanded(child: Text(c.title(ref.watch(localeProvider)), style: t.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis)),
                                const SizedBox(width: 12),
                                Text(f.aed(c.amountFils), style: t.bodySmall),
                              ]),
                          ]),
                        ),
                      if (line.awaitsBankCheck && r.status == PayoutRunStatus.draft)
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: TextButton.icon(
                            key: Key('verify-bank-${line.id}'),
                            style: TextButton.styleFrom(minimumSize: const Size(44, 44), padding: const EdgeInsets.symmetric(horizontal: 8)),
                            onPressed: () => _verifyBank(line),
                            icon: const Icon(Icons.verified_outlined, size: 18),
                            label: Text(l.adminVerifyBank),
                          ),
                        ),
                      ]),
                    ),
                    ),
                ]),
              ),
            if (r.status == PayoutRunStatus.draft && r.payouts.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(l.adminAdjustHint, style: t.bodySmall),
            ],
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
                  child: Text(f.n(l.approvePayouts(run.requireValue.ready.length, f.aed(run.requireValue.readyTotalFils)))),
                ),
              if (run.requireValue.status == PayoutRunStatus.approved)
                FilledButton.icon(
                  key: const Key('mark-paid'),
                  onPressed: _busy ? null : () => _markPaid(run.requireValue),
                  icon: const Icon(Icons.task_alt_rounded),
                  label: Text(l.adminMarkPaid),
                ),
              const SizedBox(height: 8),
              OutlinedButton.icon(onPressed: _export, icon: const Icon(Icons.download_rounded), label: Text(l.downloadFile)),
            ])
          : null,
    );
  }
}

class _MarkPaidSheet extends StatefulWidget {
  const _MarkPaidSheet({required this.total, required this.count});
  final String total;
  final int count;

  @override
  State<_MarkPaidSheet> createState() => _MarkPaidSheetState();
}

class _MarkPaidSheetState extends State<_MarkPaidSheet> {
  final _ref = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _ref.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l = context.l10n;
    if (_ref.text.trim().length < 3) return setState(() => _error = l.adminTransferRefRequired);
    final ok = await confirmAction(context, title: l.adminMarkPaidConfirmTitle(widget.total), body: l.adminMarkPaidConfirmBody, confirm: l.adminMarkPaid, destructive: false);
    if (ok && mounted) Navigator.pop(context, _ref.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return FormSheet(
      title: l.adminMarkPaid,
      subtitle: l.adminMarkPaidBody(widget.count, widget.total),
      children: [
        TextField(
          key: const Key('transfer-reference'),
          controller: _ref,
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(label: l.adminTransferRef, icon: Icons.tag_rounded, hint: l.adminTransferRefHint),
        ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: AzzaPalette.of(context).danger))],
        const SizedBox(height: 16),
        FilledButton(key: const Key('mark-paid-submit'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)), onPressed: _submit, child: Text(l.adminMarkPaid)),
      ],
    );
  }
}

class _AdjustSheet extends ConsumerStatefulWidget {
  const _AdjustSheet({required this.line});
  final PayoutLine line;

  @override
  ConsumerState<_AdjustSheet> createState() => _AdjustSheetState();
}

class _AdjustSheetState extends ConsumerState<_AdjustSheet> {
  final _amount = TextEditingController();
  final _reason = TextEditingController();
  bool _deduct = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l = context.l10n;
    final aed = parseAed(_amount.text);
    if (aed == null) return setState(() => _error = l.adminAmountInvalid);
    if (_reason.text.trim().length < 3) return setState(() => _error = l.adminReasonRequired);
    setState(() {
      _busy = true;
      _error = null;
    });
    final fils = Money.aedToFils(aed) * (_deduct ? -1 : 1);
    try {
      await ref.read(backOfficeRepositoryProvider).adjustPayout(widget.line.id, amountFils: fils, reason: _reason.text);
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
    final f = ref.watch(fmtProvider);
    return FormSheet(
      title: l.adminAdjustTitle(widget.line.teacherName),
      subtitle: l.adminAdjustSubtitle(f.aed(widget.line.netFils)),
      children: [
        SegmentedButton<bool>(
          key: const Key('adjust-kind'),
          segments: [
            ButtonSegment(value: false, label: Text(l.adminBonus), icon: const Icon(Icons.add_rounded)),
            ButtonSegment(value: true, label: Text(l.adminDeduction), icon: const Icon(Icons.remove_rounded)),
          ],
          selected: {_deduct},
          style: SegmentedButton.styleFrom(minimumSize: const Size(44, 48)),
          onSelectionChanged: (v) => setState(() => _deduct = v.first),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('adjust-amount'),
          controller: _amount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          textDirection: TextDirection.ltr,
          decoration: fieldDecoration(label: l.adminAdjustAmount, icon: Icons.payments_outlined, prefixText: 'AED ', hint: '100'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('adjust-reason'),
          controller: _reason,
          decoration: fieldDecoration(label: l.reason, icon: Icons.notes_rounded, hint: l.adminAdjustReasonHint),
        ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: AzzaPalette.of(context).danger))],
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('adjust-submit'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _submit,
          child: Text(l.adminSaveAdjustment),
        ),
      ],
    );
  }
}
