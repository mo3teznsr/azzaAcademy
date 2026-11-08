import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/count_stepper.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

String enrollmentLabel(AppLocalizations l, EnrollmentStatus s) => switch (s) {
      EnrollmentStatus.pendingPayment => l.adminEnrolPending,
      EnrollmentStatus.awaitingTransfer => l.adminEnrolAwaitingTransfer,
      EnrollmentStatus.verifying => l.orderVerifying,
      EnrollmentStatus.active => l.adminEnrolActive,
      EnrollmentStatus.waitlisted => l.waitlist,
      EnrollmentStatus.cancelled => l.adminEnrolCancelled,
      EnrollmentStatus.refunded => l.orderRefunded,
      EnrollmentStatus.expired => l.orderExpired,
    };

/// Admin-only additions on the batch screen: open enrolment for a draft, shift the schedule, and every enrolment.
class BatchAdminTools extends ConsumerWidget {
  const BatchAdminTools({super.key, required this.batch});
  final Batch batch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final b = batch;
    final now = DateTime.now();
    final shiftable = b.sessions.where((s) => s.status == SessionStatus.scheduled && s.startsAt.isAfter(now)).toList();
    final closed = b.status == BatchStatus.completed || b.status == BatchStatus.cancelled;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionCard(
        key: const Key('batch-admin-tools'),
        title: l.adminBatchTools,
        margin: const EdgeInsets.only(top: 24),
        child: Wrap(spacing: 8, runSpacing: 8, children: [
          if (b.status == BatchStatus.draft)
            FilledButton.icon(
              key: const Key('batch-open-enrolment'),
              style: FilledButton.styleFrom(minimumSize: const Size(44, 48)),
              onPressed: () async {
                try {
                  await ref.read(backOfficeRepositoryProvider).updateBatch(b.id, {'status': BatchStatus.enrolling.wire});
                  ref.invalidate(batchProvider(b.id));
                  if (context.mounted) showToast(context, l.adminEnrolmentOpened);
                } catch (e) {
                  if (context.mounted) showToast(context, errorText(context, e));
                }
              },
              icon: const Icon(Icons.lock_open_rounded, size: 18),
              label: Text(l.adminOpenEnrolment),
            ),
          OutlinedButton.icon(
            key: const Key('shift-schedule'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(44, 48)),
            onPressed: closed || shiftable.isEmpty
                ? null
                : () async {
                    final shifted = await showFormSheet<bool>(context, (_) => _ShiftSheet(batch: b, sessions: shiftable));
                    if (shifted == true && context.mounted) {
                      ref.invalidate(batchProvider(b.id));
                      showToast(context, l.adminScheduleShifted);
                    }
                  },
            icon: const Icon(Icons.date_range_rounded, size: 18),
            label: Text(l.adminShiftSchedule),
          ),
          OutlinedButton.icon(
            key: const Key('batch-roster'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(44, 48)),
            onPressed: () => context.push(Routes.roster(b.id)),
            icon: const Icon(Icons.groups_outlined, size: 18),
            label: Text(l.adminAttendance),
          ),
        ]),
      ),
      _Enrollments(batchId: b.id),
    ]);
  }
}

class _Enrollments extends ConsumerWidget {
  const _Enrollments({required this.batchId});
  final String batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final rows = ref.watch(batchEnrollmentsProvider(batchId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return Column(key: const Key('batch-enrollments'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionHeader(l.adminEnrollments),
      AsyncView<List<EnrollmentRow>>(
        value: rows,
        compact: true,
        onRetry: () => ref.invalidate(batchEnrollmentsProvider(batchId)),
        isEmpty: (list) => list.isEmpty,
        empty: Text(l.adminNoEnrollments, style: t.bodySmall),
        data: (list) {
          final active = list.where((e) => e.status == EnrollmentStatus.active).length;
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Kicker(l.adminEnrollmentSummary(f.n(active), f.n(list.length))),
            const SizedBox(height: 8),
            CardGroup(children: [
              for (final e in list)
                InkWell(
                  key: Key('enrollment-${e.id}'),
                  onTap: e.orders.isEmpty ? null : () => context.go(Routes.adminOrder(e.orders.first.id)),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 56),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(children: [
                        InitialsAvatar(e.student.name, size: 32, imageUrl: e.student.image),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(e.student.name, style: t.titleSmall),
                            Text(
                              [?e.email, if (e.orders.isNotEmpty) '${e.orders.first.reference} · ${f.aed(e.orders.first.totalFils)}'].join(' · '),
                              style: t.bodySmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ]),
                        ),
                        Kicker(enrollmentLabel(l, e.status), color: e.status == EnrollmentStatus.active ? p.success : null),
                      ]),
                    ),
                  ),
                ),
            ]),
          ]);
        },
      ),
    ]);
  }
}

/// Moves every scheduled session from one session onward by N days (same local time); students are notified.
class _ShiftSheet extends ConsumerStatefulWidget {
  const _ShiftSheet({required this.batch, required this.sessions});
  final Batch batch;
  final List<SessionSummary> sessions;

  @override
  ConsumerState<_ShiftSheet> createState() => _ShiftSheetState();
}

class _ShiftSheetState extends ConsumerState<_ShiftSheet> {
  late int _from = widget.sessions.first.number;
  int _days = 7;
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    final l = context.l10n;
    if (_days == 0) return setState(() => _error = l.adminShiftZero);
    final moved = widget.sessions.where((s) => s.number >= _from).length;
    final ok = await confirmAction(
      context,
      title: l.adminShiftConfirmTitle(widget.batch.code),
      body: l.adminShiftConfirmBody(moved, '$_days'),
      confirm: l.adminShiftSchedule,
      destructive: false,
    );
    if (!ok || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(backOfficeRepositoryProvider).shiftBatch(widget.batch.id, fromSessionNumber: _from, days: _days);
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
      title: l.adminShiftSchedule,
      subtitle: l.adminShiftBody,
      children: [
        DropdownButtonFormField<int>(
          key: const Key('shift-from'),
          initialValue: _from,
          isExpanded: true,
          decoration: fieldDecoration(label: l.adminShiftFrom, icon: Icons.first_page_rounded),
          items: [
            for (final s in widget.sessions)
              DropdownMenuItem(value: s.number, child: Text('${Fmt.slate(widget.batch.code, s.number)} · ${f.dayTime(s.startsAt)}', overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (v) => setState(() => _from = v ?? _from),
        ),
        const SizedBox(height: 12),
        CountStepper(
          key: const ValueKey('shift-days'),
          label: l.adminShiftDays,
          icon: Icons.swap_vert_rounded,
          value: _days,
          min: -60,
          max: 60,
          helper: l.adminShiftDaysHelper,
          arabicDigits: f.arabicDigits,
          onChanged: (v) => setState(() => _days = v),
        ),
        if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: AzzaPalette.of(context).danger))],
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('shift-submit'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _submit,
          child: Text(l.adminShiftSchedule),
        ),
      ],
    );
  }
}
