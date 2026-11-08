import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../instructors/data/instructors_repository.dart';
import '../../support/data/support_repository.dart';
import '../../teacher/data/proposals_repository.dart';
import '../data/admin_queue.dart';
import '../data/admin_repository.dart';
import 'admin_widgets.dart';

/// Admin overview, in the order an admin acts: decisions waiting on you, rooms on air (problems first),
/// then the health numbers. Every row opens the screen or tab where it is handled.
class AdminOverviewScreen extends ConsumerWidget {
  const AdminOverviewScreen({super.key});

  static void refreshAll(WidgetRef ref) => ref
    ..invalidate(adminDashboardProvider)
    ..invalidate(rescheduleRequestsProvider)
    ..invalidate(liveRoomsProvider)
    ..invalidate(transfersProvider)
    ..invalidate(payoutRunsProvider)
    ..invalidate(pendingCoursesProvider)
    ..invalidate(pendingBatchesProvider)
    ..invalidate(pendingApplicationsProvider)
    ..invalidate(openTicketsCountProvider);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final user = ref.watch(currentUserProvider);
    final dash = ref.watch(adminDashboardProvider);
    final now = DateTime.now();

    return Scaffold(
      body: SafeArea(
        child: AsyncView<AdminDashboard>(
          value: dash,
          onRetry: () => refreshAll(ref),
          data: (d) => RefreshList(
            onRefresh: () async => refreshAll(ref),
            children: [
              Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Kicker('${f.dayLabel(now)} · ${f.time(now)}'),
                    DisplayText(l.opsGreeting(user?.firstName ?? ''), size: 32),
                  ]),
                ),
                IconButton(
                  key: const Key('admin-announcements'),
                  tooltip: l.announcementsTitle,
                  onPressed: () => context.push(Routes.announcements),
                  icon: const Icon(Icons.campaign_outlined),
                ),
                Builder(builder: (context) {
                  final open = ref.watch(openTicketsCountProvider).value ?? 0;
                  return IconButton(
                    key: const Key('admin-support'),
                    tooltip: l.supportInbox,
                    onPressed: () => context.push(Routes.adminSupport),
                    icon: Badge(isLabelVisible: open > 0, label: Text(f.n(open)), child: const Icon(Icons.support_agent_rounded)),
                  );
                }),
                const SizedBox(width: 4),
                InitialsAvatar(user?.name ?? '', size: 44, imageUrl: user?.image),
              ]),
              const _DecisionQueue(),
              _LiveNow(dashboard: d),
              _Health(dashboard: d),
            ],
          ),
        ),
      ),
    );
  }
}

/// Counts of what is waiting on an admin, biggest first. Each row opens the right tab, already filtered.
class _DecisionQueue extends ConsumerWidget {
  const _DecisionQueue();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final q = ref.watch(adminQueueProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    final rows = [
      (key: 'queue-proposals', n: q.proposals, icon: Icons.rate_review_outlined, title: l.adminQueueProposals, sub: l.adminQueueProposalsSub, urgent: false,
          open: () => context.go(Routes.adminApprovalsTab('review'))),
      (key: 'queue-transfers', n: q.transfers, icon: Icons.receipt_long_outlined, title: l.adminQueueTransfers, sub: l.adminQueueTransfersSub, urgent: true,
          open: () => context.go(Routes.adminApprovalsTab('transfers'))),
      (key: 'queue-payouts', n: q.payoutRuns, icon: Icons.account_balance_wallet_outlined, title: l.adminQueuePayouts, sub: l.adminQueuePayoutsSub, urgent: false,
          open: () => context.go(Routes.adminApprovalsTab('payouts'))),
      (key: 'queue-reschedules', n: q.reschedules, icon: Icons.event_repeat_rounded, title: l.adminQueueReschedules, sub: l.adminQueueReschedulesSub, urgent: true,
          open: () => context.go(Routes.adminApprovalsTab('alerts'))),
      (key: 'queue-tickets', n: q.tickets, icon: Icons.support_agent_rounded, title: l.adminQueueTickets, sub: l.adminQueueTicketsSub, urgent: false,
          open: () => context.push(Routes.adminSupport)),
      (key: 'queue-applications', n: q.applications, icon: Icons.school_outlined, title: l.adminQueueApplications, sub: l.adminQueueApplicationsSub, urgent: false,
          open: () => context.go(Routes.adminApprovalsTab('review'))),
      (key: 'queue-alerts', n: q.otherAlerts, icon: Icons.warning_amber_rounded, title: l.adminQueueAlerts, sub: l.adminQueueAlertsSub, urgent: false,
          open: () => context.go(Routes.adminApprovalsTab('alerts'))),
    ].where((r) => r.n > 0).toList()
      ..sort((a, b) => b.n.compareTo(a.n));
    final total = rows.fold<int>(0, (s, r) => s + r.n);

    return Column(key: const Key('decision-queue'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionHeader(total == 0 ? l.needsYou : l.adminNeedsYouCount(f.n(total)), padding: const EdgeInsets.only(top: 24, bottom: 10)),
      if (rows.isEmpty)
        RaisedCard(
          key: const Key('queue-clear'),
          child: Row(children: [
            Icon(Icons.task_alt_rounded, color: p.success),
            const SizedBox(width: 12),
            Expanded(child: Text(l.adminAllClear, style: t.bodyMedium)),
          ]),
        )
      else
        CardGroup(children: [
          for (final r in rows)
            HubRow(key: Key(r.key), icon: r.icon, title: r.title, subtitle: r.sub, count: f.n(r.n), urgent: r.urgent, onTap: r.open),
        ]),
    ]);
  }
}

/// Rooms on air: the summary card, then up to three rooms with quality problems first.
class _LiveNow extends ConsumerWidget {
  const _LiveNow({required this.dashboard});
  final AdminDashboard dashboard;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final rooms = [...?ref.watch(liveRoomsProvider).value]..sort((a, b) => (b.hasIssue ? 1 : 0).compareTo(a.hasIssue ? 1 : 0));
    final people = rooms.fold<int>(0, (s, r) => s + r.participants);
    final issues = rooms.where((r) => r.hasIssue).length;
    final live = dashboard.liveRooms;

    return Column(key: const Key('live-now'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionHeader(l.adminLiveNow, action: l.seeAll, onAction: () => context.push(Routes.adminLive)),
      Material(
        color: p.isDark ? AzzaColors.ink2 : AzzaColors.ink,
        borderRadius: BorderRadius.circular(AzzaSpace.radius),
        child: InkWell(
          key: const Key('live-summary'),
          borderRadius: BorderRadius.circular(AzzaSpace.radius),
          onTap: () => context.push(Routes.adminLive),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                SignalMark(size: 18, live: live > 0, color: live > 0 ? AzzaColors.onAir : AzzaColors.muted),
                const SizedBox(width: 6),
                Expanded(child: Kicker(l.onAirLabel, color: AzzaColors.cream)),
                if (issues > 0) Kicker(l.adminRoomIssues(f.n(issues)), color: AzzaColors.sun),
              ]),
              const SizedBox(height: 8),
              DisplayText(f.n(l.roomsPeople(live, people)), size: 28, color: AzzaColors.cream),
            ]),
          ),
        ),
      ),
      if (rooms.isNotEmpty) ...[
        const SizedBox(height: 10),
        CardGroup(children: [
          for (final r in rooms.take(3))
            InkWell(
              key: Key('live-room-${r.sessionId}'),
              onTap: () => context.push(Routes.adminLive),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 56),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(children: [
                    Icon(r.hasIssue ? Icons.signal_cellular_connected_no_internet_4_bar_rounded : Icons.sensors_rounded,
                        size: 20, color: r.hasIssue ? p.warning : p.live),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${Fmt.slate(r.batchCode, r.sessionNumber)} · ${r.courseTitle}', style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(
                          [?r.teacherName, l.adminPeopleInRoom(f.n(r.participants)), if (r.hasIssue) l.adminQualityIssue(r.quality ?? '')].join(' · '),
                          style: t.bodySmall?.copyWith(color: r.hasIssue ? p.warning : null),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ]),
                    ),
                  ]),
                ),
              ),
            ),
        ]),
      ],
    ]);
  }
}

/// Health KPIs as tappable tiles in a Wrap: tiles grow with the text instead of clipping at large type sizes.
class _Health extends ConsumerWidget {
  const _Health({required this.dashboard});
  final AdminDashboard dashboard;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final d = dashboard;
    final tiles = [
      (
        key: 'kpi-sessions',
        label: l.sessionsToday,
        value: f.n(d.sessionsToday),
        sub: d.sessionsDone > 0 ? '${f.n(d.sessionsDone)} ${l.statusEnded.toLowerCase()} · ${f.n(d.sessionsLater)} ${l.laterToday.toLowerCase()}' : null,
        open: () => context.push(Routes.adminLive),
      ),
      (key: 'kpi-batches', label: l.activeBatches, value: f.n(d.activeBatches), sub: null, open: () => context.go(Routes.adminBatches)),
      (key: 'kpi-revenue', label: l.revenueMonth, value: f.aed(d.revenueMonthFils), sub: null, open: () => context.go(Routes.adminPayments)),
      (key: 'kpi-seats', label: l.seatsFilled, value: f.percent(d.seatsFilledPct), sub: null, open: () => context.go(Routes.adminReports)),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionHeader(l.adminHealth, action: l.adminReportsTitle, onAction: () => context.go(Routes.adminReports)),
      LayoutBuilder(builder: (context, c) {
        // Two per row on phones, one per row when very narrow or the text is very large.
        final scale = MediaQuery.textScalerOf(context).scale(1);
        final perRow = c.maxWidth < 320 || scale > 1.6 ? 1 : 2;
        final w = (c.maxWidth - 10 * (perRow - 1)) / perRow;
        return Wrap(spacing: 10, runSpacing: 10, children: [
          for (final k in tiles) SizedBox(width: w, child: _Kpi(key: Key(k.key), label: k.label, value: k.value, sub: k.sub, onTap: k.open)),
        ]);
      }),
    ]);
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({super.key, required this.label, required this.value, this.sub, required this.onTap});
  final String label;
  final String value;
  final String? sub;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        child: RaisedCard(
          padding: const EdgeInsets.all(14),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 72),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Kicker(label)),
                Icon(Icons.chevron_right_rounded, size: 18, color: AzzaPalette.of(context).muted),
              ]),
              const SizedBox(height: 6),
              DisplayText(value, size: 24),
              if (sub != null) Text(sub!, style: Theme.of(context).textTheme.bodySmall),
            ]),
          ),
        ),
      );
}
