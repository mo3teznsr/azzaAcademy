import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../learn/data/learn_repository.dart';
import '../../me/data/me_repository.dart';
import '../../me/domain/me_models.dart';

String greeting(AppLocalizations l, String name, DateTime now) {
  if (now.hour < 12) return l.greetingMorning(name);
  if (now.hour < 17) return l.greetingAfternoon(name);
  return l.greetingEvening(name);
}

/// Student Home: what's on air now, my batches, pick up a recording.
class StudentHomeScreen extends ConsumerWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final user = ref.watch(currentUserProvider);
    final enrollments = ref.watch(enrollmentsProvider);
    final upcoming = ref.watch(upcomingScheduleProvider);
    final now = DateTime.now();

    Future<void> refresh() async {
      ref.invalidate(enrollmentsProvider);
      ref.invalidate(upcomingScheduleProvider);
      ref.invalidate(recordingsProvider);
      await ref.read(enrollmentsProvider.future);
    }

    return Scaffold(
      body: SafeArea(
        child: AsyncView<List<Enrollment>>(
          value: enrollments,
          onRetry: () => ref.invalidate(enrollmentsProvider),
          data: (list) {
            final active = list.where((e) => e.isActive).toList();
            final pending = list.where((e) => e.status == EnrollmentStatus.awaitingTransfer || e.status == EnrollmentStatus.verifying).toList();
            final sessions = upcoming.value ?? const <SessionSummary>[];
            final hero = sessions.where((s) => s.lobbyOpen(now)).firstOrNull ?? sessions.where((s) => s.status == SessionStatus.scheduled).firstOrNull;
            return RefreshList(
              onRefresh: refresh,
              children: [
                MonoLabel(f.dayLabel(now)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(child: DisplayText(greeting(l, user?.firstName ?? '', now), size: 32)),
                    IconButton(
                      tooltip: l.inbox,
                      onPressed: () => context.push(Routes.notifications),
                      icon: Badge(
                        isLabelVisible: ref.watch(unreadCountProvider) > 0,
                        child: const Icon(Icons.notifications_none_rounded),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                if (hero != null) _HeroSession(session: hero, fmt: f, locale: ref.watch(localeProvider)),
                if (active.isEmpty && pending.isEmpty) ...[
                  const SizedBox(height: 24),
                  EmptyState(
                    title: l.noBatchesTitle,
                    body: l.noBatchesBody,
                    action: l.exploreCta,
                    onAction: () => context.go(Routes.studentExplore),
                  ),
                ] else ...[
                  SectionHeader(l.myBatches, action: l.seeAll, onAction: () => context.go(Routes.studentSchedule)),
                  for (final e in [...active, ...pending]) ...[
                    _BatchTile(enrollment: e, fmt: f, now: now),
                    const SizedBox(height: 10),
                  ],
                  const _ContinueWatching(),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _HeroSession extends StatelessWidget {
  const _HeroSession({required this.session, required this.fmt, required this.locale});
  final SessionSummary session;
  final Fmt fmt;
  final AppLocale locale;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final live = session.isLive;
    final canJoin = session.lobbyOpen(DateTime.now());
    final fg = live ? AzzaColors.ink : AzzaPalette.of(context).text;
    return RaisedCard(
      key: const Key('home-hero'),
      color: live ? AzzaColors.onAir : null,
      border: !live,
      padding: const EdgeInsets.all(20),
      onTap: () => context.push(Routes.lobby(session.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (live) ...[
                const SignalMark(size: 18, color: AzzaColors.ink, live: true),
                const SizedBox(width: 6),
                Expanded(
                  child: Ticker(builder: (_, now) => MonoLabel('${l.liveNow} · ${Fmt.timecode(now.difference(session.startsAt))}', color: fg)),
                ),
              ] else
                Expanded(child: MonoLabel('${l.upNext} · ${fmt.dayTime(session.startsAt)}', color: fg)),
              const SizedBox(width: 8),
              MonoLabel(Fmt.slate(session.batchCode, session.number), color: fg),
            ],
          ),
          const SizedBox(height: 14),
          DisplayText(session.title, size: 30, color: fg),
          const SizedBox(height: 6),
          Text(
            [session.course(locale), if (session.participantCount != null) l.inRoom(fmt.n(session.participantCount!))].join(' · '),
            style: TextStyle(color: live ? AzzaColors.ink : AzzaPalette.of(context).muted),
          ),
          if (canJoin) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              style: live ? FilledButton.styleFrom(backgroundColor: AzzaColors.ink, foregroundColor: AzzaColors.ivory) : null,
              onPressed: () => context.push(Routes.lobby(session.id)),
              icon: const Icon(Icons.sensors_rounded),
              label: Text(l.joinLiveRoom),
            ),
          ],
        ],
      ),
    );
  }
}

class _BatchTile extends ConsumerWidget {
  const _BatchTile({required this.enrollment, required this.fmt, required this.now});
  final Enrollment enrollment;
  final Fmt fmt;
  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final b = enrollment.batch;
    final next = b.nextSession(now);
    final locale = ref.watch(localeProvider);
    final pendingPayment = !enrollment.isActive;
    final orderId = enrollment.latestOrderId;
    return RaisedCard(
      // A seat that isn't paid yet opens its order (upload receipt / status); otherwise the schedule.
      onTap: () => context.push(pendingPayment && orderId != null ? Routes.order(orderId) : Routes.batchSchedule(b.id)),
      child: Row(
        children: [
          Slate('${b.code} · ${fmt.n(enrollment.done(now))}/${fmt.n(enrollment.total)}'),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(b.course?.title(locale) ?? b.code, style: Theme.of(context).textTheme.titleSmall),
                if (pendingPayment)
                  Text(
                    switch (enrollment.latestOrderStatus) {
                      OrderStatus.awaitingReceipt => l.orderAwaitingReceipt,
                      OrderStatus.awaitingPayment => l.orderAwaitingPayment,
                      OrderStatus.amountMismatch => l.orderAmountMismatch,
                      _ => l.orderVerifying,
                    },
                    style: Theme.of(context).textTheme.bodySmall,
                  )
                else if (next != null)
                  Text(l.nextAt(fmt.dayTime(next.startsAt)), style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

class _ContinueWatching extends ConsumerWidget {
  const _ContinueWatching();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recordings = ref.watch(recordingsProvider).value ?? const [];
    final rec = recordings.where((r) => r.url != null).firstOrNull;
    if (rec == null) return const SizedBox.shrink();
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(l.continueWatching),
        RaisedCard(
          onTap: () => context.go(Routes.studentLibrary),
          child: Row(
            children: [
              Container(
                width: 64,
                height: 64,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: AzzaPalette.of(context).line, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.play_arrow_rounded, size: 32),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MonoLabel('${Fmt.slate(rec.batchCode, rec.number)} · ${l.rec}'),
                    Text(rec.title, style: Theme.of(context).textTheme.titleSmall),
                    if (rec.durationSec != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: LinearProgressIndicator(value: rec.progress, minHeight: 3, borderRadius: BorderRadius.circular(2)),
                      ),
                    if (rec.recordedAt != null) Text(f.shortDate(rec.recordedAt!), style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
