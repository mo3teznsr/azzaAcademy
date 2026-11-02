import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../live/domain/live_models.dart';
import '../data/admin_repository.dart';
import 'approvals_screen.dart' show AlertTile, RescheduleRequestTile;

/// Admin overview: what's on air, what's selling, what needs a decision.
class AdminOverviewScreen extends ConsumerWidget {
  const AdminOverviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final user = ref.watch(currentUserProvider);
    final dash = ref.watch(adminDashboardProvider);
    final requests = ref.watch(rescheduleRequestsProvider).value ?? const <RescheduleRequest>[];
    // The dashboard counts rooms; people in them come from the live-rooms endpoint.
    final livePeople = ref.watch(liveRoomsProvider).value?.fold<int>(0, (sum, r) => sum + r.participants) ?? 0;
    final now = DateTime.now();
    final t = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: AsyncView<AdminDashboard>(
          value: dash,
          onRetry: () => ref.invalidate(adminDashboardProvider),
          data: (d) => RefreshList(
            onRefresh: () async => ref
              ..invalidate(adminDashboardProvider)
              ..invalidate(rescheduleRequestsProvider)
              ..invalidate(liveRoomsProvider),
            children: [
              Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    MonoLabel('${f.dayLabel(now)} · ${f.time(now)}'),
                    DisplayText(l.opsGreeting(user?.firstName ?? ''), size: 32),
                  ]),
                ),
                InitialsAvatar(user?.name ?? '', size: 44, imageUrl: user?.image),
              ]),
              const SizedBox(height: 20),
              Material(
                color: AzzaColors.ink,
                borderRadius: BorderRadius.circular(AzzaSpace.radius),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AzzaSpace.radius),
                  onTap: () => context.go(Routes.adminLive),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        SignalMark(size: 18, live: d.liveRooms > 0, color: d.liveRooms > 0 ? AzzaColors.onAir : AzzaColors.muted),
                        const SizedBox(width: 6),
                        MonoLabel(l.onAirLabel, color: AzzaColors.ivory),
                      ]),
                      const SizedBox(height: 10),
                      DisplayText(l.roomsPeople(f.n(d.liveRooms), f.n(livePeople)), size: 30, color: AzzaColors.ivory),
                    ]),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.45,
                children: [
                  _Kpi(label: l.sessionsToday, value: f.n(d.sessionsToday), sub: d.sessionsDone > 0 ? '${f.n(d.sessionsDone)} ${l.statusEnded.toLowerCase()} · ${f.n(d.sessionsLater)} ${l.laterToday.toLowerCase()}' : null),
                  _Kpi(label: l.activeBatches, value: f.n(d.activeBatches)),
                  _Kpi(label: l.revenueMonth, value: f.aed(d.revenueMonthFils)),
                  _Kpi(label: l.seatsFilled, value: f.percent(d.seatsFilledPct)),
                ],
              ),
              SectionHeader(l.needsYou, action: l.seeAll, onAction: () => context.go(Routes.adminApprovals)),
              if (d.alerts.isEmpty && requests.isEmpty) Text(l.noAlerts, style: t.bodySmall),
              for (final r in requests.take(2)) RescheduleRequestTile(request: r),
              for (final a in d.alerts.take(4)) AlertTile(alert: a),
            ],
          ),
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value, this.sub});
  final String label;
  final String value;
  final String? sub;

  @override
  Widget build(BuildContext context) => RaisedCard(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          MonoLabel(label),
          FittedBox(fit: BoxFit.scaleDown, alignment: AlignmentDirectional.centerStart, child: DisplayText(value, size: 26)),
          if (sub != null) Text(sub!, style: Theme.of(context).textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      );
}
