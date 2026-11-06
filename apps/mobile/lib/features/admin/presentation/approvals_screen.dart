import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../checkout/domain/checkout_models.dart';
import '../../live/domain/live_models.dart';
import '../data/admin_repository.dart';
import 'review_queue.dart';

/// Alerts & approvals: teacher proposals to review, transfers to verify, payout runs, reschedule requests and other alerts.
class ApprovalsScreen extends ConsumerWidget {
  const ApprovalsScreen({super.key, this.initialTab = 0});

  /// 1 opens "To review" (from an `INSTRUCTOR_APPLIED` notification).
  final int initialTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return DefaultTabController(
      length: 4,
      initialIndex: initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.navApprovals),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: AzzaPalette.of(context).text,
            indicatorColor: AzzaPalette.of(context).text,
            tabs: [Tab(text: l.needsYou), Tab(text: l.toReviewTab), Tab(text: l.transfersToVerify), Tab(text: l.payoutRuns)],
          ),
        ),
        body: const TabBarView(children: [_AlertsTab(), ReviewQueueTab(), _TransfersTab(), _PayoutRunsTab()]),
      ),
    );
  }
}

class _AlertsTab extends ConsumerWidget {
  const _AlertsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final dash = ref.watch(adminDashboardProvider);
    final requests = ref.watch(rescheduleRequestsProvider);
    Future<void> refresh() async {
      ref
        ..invalidate(adminDashboardProvider)
        ..invalidate(rescheduleRequestsProvider);
    }

    return AsyncView<AdminDashboard>(
      value: dash,
      onRetry: refresh,
      isEmpty: (d) => d.alerts.isEmpty && (requests.value?.isEmpty ?? true),
      empty: EmptyState(title: l.noAlerts, icon: Icons.task_alt_rounded),
      data: (d) => RefreshList(
        onRefresh: refresh,
        children: [
          for (final r in requests.value ?? const <RescheduleRequest>[]) RescheduleRequestTile(request: r),
          for (final a in d.alerts) AlertTile(alert: a),
        ],
      ),
    );
  }
}

/// One aggregated dashboard alert (`{ type, severity, count }`) with a shortcut to where it is handled.
class AlertTile extends ConsumerWidget {
  const AlertTile({super.key, required this.alert});
  final AdminAlert alert;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final a = alert;
    final n = f.n(a.count);
    final title = switch (a.type) {
      'TRANSFERS_TO_VERIFY' => l.alertTransfersToVerify(n),
      'SEAT_HOLDS_EXPIRING' => l.alertSeatHoldsExpiring(n),
      'TEACHER_BANK_UNVERIFIED' => l.alertTeacherBankUnverified(n),
      'PAYOUTS_HELD' => l.alertPayoutsHeld(n),
      _ => '${a.type.replaceAll('_', ' ')} · $n',
    };
    final tab = a.isTransfer ? 2 : (a.isPayouts ? 3 : null);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: RaisedCard(
        color: a.urgent ? AzzaPalette.of(context).warningBg : null,
        onTap: tab == null
            ? null
            : () {
                final controller = DefaultTabController.maybeOf(context);
                if (controller != null) {
                  controller.animateTo(tab);
                } else {
                  context.go(Routes.adminApprovals);
                }
              },
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              MonoLabel(a.type.replaceAll('_', ' '), color: a.urgent ? AzzaPalette.of(context).warning : null),
              const SizedBox(height: 6),
              Text(title, style: t.titleSmall),
            ]),
          ),
          if (tab != null) const Icon(Icons.chevron_right_rounded),
        ]),
      ),
    );
  }
}

/// A teacher's pending reschedule request: current → proposed time, approve / decline.
class RescheduleRequestTile extends ConsumerStatefulWidget {
  const RescheduleRequestTile({super.key, required this.request});
  final RescheduleRequest request;

  @override
  ConsumerState<RescheduleRequestTile> createState() => _RescheduleRequestTileState();
}

class _RescheduleRequestTileState extends ConsumerState<RescheduleRequestTile> {
  bool _busy = false;

  Future<void> _decide(bool approve) async {
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      final repo = ref.read(adminRepositoryProvider);
      approve ? await repo.approveReschedule(widget.request.id) : await repo.declineReschedule(widget.request.id);
      ref
        ..invalidate(rescheduleRequestsProvider)
        ..invalidate(adminDashboardProvider);
      if (mounted) showToast(context, l.reviewDone);
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
    final r = widget.request;
    final s = r.session;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: RaisedCard(
        color: AzzaColors.sun.withValues(alpha: 0.18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            MonoLabel(l.reschedule.toUpperCase(), color: AzzaPalette.of(context).warning),
            const Spacer(),
            if (r.createdAt != null) MonoLabel(f.shortDate(r.createdAt!)),
          ]),
          const SizedBox(height: 6),
          Text(l.rescheduleRequestTitle(r.requestedByName, Fmt.slate(s.batchCode, s.number)), style: t.titleSmall),
          Text(s.title, style: t.bodySmall),
          const SizedBox(height: 6),
          MonoLabel('${f.dayTime(s.startsAt)}  →  ${f.dayTime(r.startsAt)}'),
          if (r.reason != null) ...[const SizedBox(height: 4), Text(r.reason!, style: t.bodySmall)],
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                key: Key('decline-${r.id}'),
                onPressed: _busy ? null : () => _decide(false),
                child: Text(l.decline),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton(
                key: Key('approve-${r.id}'),
                onPressed: _busy ? null : () => _decide(true),
                child: Text(l.approve),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}

class _TransfersTab extends ConsumerWidget {
  const _TransfersTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final transfers = ref.watch(transfersProvider);
    final t = Theme.of(context).textTheme;
    return AsyncView<List<Order>>(
      value: transfers,
      onRetry: () => ref.invalidate(transfersProvider),
      isEmpty: (list) => list.isEmpty,
      empty: EmptyState(title: l.noTransfers, icon: Icons.task_alt_rounded),
      data: (list) => RefreshList(
        onRefresh: () async => ref.invalidate(transfersProvider),
        children: [
          for (final o in list) ...[
            RaisedCard(
              onTap: () => context.go(Routes.adminTransfer(o.id)),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    MonoLabel(o.reference),
                    Text(o.student?.name ?? '', style: t.titleSmall),
                    Text('${o.batch?.course?.title(locale) ?? ''} · ${o.batch?.code ?? ''}', style: t.bodySmall),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(f.aed(o.totalFils), style: t.titleSmall),
                  StatusChip.order(context, o.status),
                ]),
              ]),
            ),
            const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}

class _PayoutRunsTab extends ConsumerWidget {
  const _PayoutRunsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final runs = ref.watch(payoutRunsProvider);
    final t = Theme.of(context).textTheme;
    Future<void> create() async {
      // Last full calendar month (the API rejects a period that already has a run with 409).
      final now = DateTime.now();
      final start = DateTime(now.year, now.month - 1);
      final end = DateTime(now.year, now.month, 0);
      try {
        final run = await ref.read(adminRepositoryProvider).createPayoutRun(periodStart: start, periodEnd: end);
        ref.invalidate(payoutRunsProvider);
        if (context.mounted) context.go(Routes.adminPayoutRun(run.id));
      } catch (e) {
        if (context.mounted) showToast(context, errorText(context, e));
      }
    }

    return AsyncView<List<PayoutRun>>(
      value: runs,
      onRetry: () => ref.invalidate(payoutRunsProvider),
      isEmpty: (list) => list.isEmpty,
      empty: EmptyState(title: l.noPayoutRuns, action: l.newPayoutRun, onAction: create),
      data: (list) => RefreshList(
        onRefresh: () async => ref.invalidate(payoutRunsProvider),
        children: [
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: TextButton.icon(onPressed: create, icon: const Icon(Icons.add_rounded), label: Text(l.newPayoutRun)),
          ),
          for (final r in list) ...[
            RaisedCard(
              onTap: () => context.go(Routes.adminPayoutRun(r.id)),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(f.monthYear(r.periodStart), style: t.titleSmall),
                    MonoLabel('${f.shortDate(r.periodStart)}–${f.shortDate(r.periodEnd)}'),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  if (r.totalFils != null || r.payouts.isNotEmpty) Text(f.aed(r.grandTotalFils), style: t.titleSmall),
                  StatusChip(
                    label: r.status == PayoutRunStatus.draft ? l.awaitingApproval : r.status.wire,
                    color: r.status == PayoutRunStatus.draft ? AzzaColors.green : AzzaPalette.of(context).successBg,
                    textColor: r.status == PayoutRunStatus.draft ? AzzaColors.inkDeep : AzzaPalette.of(context).success,
                  ),
                ]),
              ]),
            ),
            const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}
