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
import '../../announcements/data/announcements_repository.dart';
import '../../announcements/presentation/announcement_widgets.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../chat/data/chat_repository.dart';
import '../../chat/presentation/messages_button.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../learn/data/learn_repository.dart';
import '../../learn/data/quizzes_repository.dart';
import '../../learn/domain/quiz_models.dart';
import '../../learn/presentation/my_quizzes_screen.dart';
import '../../me/data/me_repository.dart';
import '../../me/domain/me_models.dart';
import '../../waitlist/data/waitlist_repository.dart';
import '../../waitlist/presentation/waitlist_section.dart';

String greeting(AppLocalizations l, String name, DateTime now) {
  if (now.hour < 12) return l.greetingMorning(name);
  if (now.hour < 17) return l.greetingAfternoon(name);
  return l.greetingEvening(name);
}

/// Student Home, learning first: your courses and progress, practice due, then the next live session
/// and recordings to catch up on. A session you can join right now still leads, because it's time-bound.
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
      ref.invalidate(myQuizzesProvider);
      ref.invalidate(waitlistProvider);
      ref.invalidate(myAnnouncementsProvider);
      ref.invalidate(conversationsProvider);
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
            final joinable = hero != null && hero.lobbyOpen(now);
            final locale = ref.watch(localeProvider);
            return RefreshList(
              onRefresh: refresh,
              children: [
                MonoLabel(f.dayLabel(now)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(child: DisplayText(greeting(l, user?.firstName ?? '', now), size: 32)),
                    const MessagesButton(),
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
                if (joinable) ...[_HeroSession(session: hero, fmt: f, locale: locale, labelled: true), const SizedBox(height: 4)],
                if (active.isEmpty && pending.isEmpty) ...[
                  if (hero != null && !joinable) _HeroSession(session: hero, fmt: f, locale: locale, labelled: true),
                  const SizedBox(height: 24),
                  EmptyState(
                    title: l.noBatchesTitle,
                    body: l.noBatchesBody,
                    action: l.exploreCta,
                    onAction: () => context.go(Routes.studentExplore),
                  ),
                  const WaitlistSection(),
                ] else ...[
                  SectionHeader(l.myBatches, action: l.seeAll, onAction: () => context.go(Routes.studentSchedule)),
                  for (final (i, e) in [...active, ...pending].indexed) ...[
                    FadeSlideIn(index: i, child: _BatchTile(enrollment: e, fmt: f, now: now)),
                    const SizedBox(height: 10),
                  ],
                  const LatestAnnouncementsStrip(),
                  const _PracticeDue(),
                  if (hero != null && !joinable) ...[
                    SectionHeader(l.upNext),
                    _HeroSession(session: hero, fmt: f, locale: locale),
                  ],
                  const WaitlistSection(),
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
  const _HeroSession({required this.session, required this.fmt, required this.locale, this.labelled = false});
  final SessionSummary session;
  final Fmt fmt;
  final AppLocale locale;

  /// Prefix the time with "Next live session" when no section header above already says it.
  final bool labelled;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final live = session.isLive;
    final canJoin = session.lobbyOpen(DateTime.now());
    final p = AzzaPalette.of(context);
    final fg = live ? p.onLive : p.text;
    return RaisedCard(
      key: const Key('home-hero'),
      color: live ? p.live : null,
      border: !live,
      padding: const EdgeInsets.all(20),
      onTap: () => context.push(Routes.lobby(session.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (live) ...[
                SignalMark(size: 18, color: fg, live: true),
                const SizedBox(width: 6),
                Expanded(
                  child: Ticker(builder: (_, now) => MonoLabel('${l.liveNow} · ${Fmt.timecode(now.difference(session.startsAt))}', color: fg)),
                ),
              ] else
                Expanded(child: MonoLabel(labelled ? '${l.upNext} · ${fmt.dayTime(session.startsAt)}' : fmt.dayTime(session.startsAt), color: fg)),
              const SizedBox(width: 8),
              MonoLabel(Fmt.slate(session.batchCode, session.number), color: fg),
            ],
          ),
          const SizedBox(height: 14),
          DisplayText(session.title, size: 30, color: fg),
          const SizedBox(height: 6),
          Text(
            [session.course(locale), if (session.participantCount != null) l.inRoom(fmt.n(session.participantCount!))].join(' · '),
            style: TextStyle(color: live ? fg : p.muted),
          ),
          if (canJoin) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              style: live ? FilledButton.styleFrom(backgroundColor: AzzaColors.inkDeep, foregroundColor: AzzaColors.ivory) : null,
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
          if (!pendingPayment)
            TextButton(
              key: Key('lessons-${b.id}'),
              style: TextButton.styleFrom(minimumSize: const Size(48, 44)),
              onPressed: () => context.push(Routes.courseLessons(b.courseId)),
              child: Text(l.lessonsTitle),
            )
          else
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

/// Quizzes still to do across the student's classes, soonest due first. Hidden when there's nothing due.
class _PracticeDue extends ConsumerWidget {
  const _PracticeDue();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizzes = ref.watch(myQuizzesProvider).value ?? const <QuizSummary>[];
    bool todo(QuizSummary q) => (q.mine?.canStart ?? false) || q.mine?.status == QuizStatus.inProgress;
    final due = quizzes.where(todo).toList()..sort((a, b) => (a.dueAt ?? DateTime(9999)).compareTo(b.dueAt ?? DateTime(9999)));
    if (due.isEmpty) return const SizedBox.shrink();
    final l = context.l10n;
    return Column(
      key: const Key('home-practice'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.practiceDue, action: due.length > 2 ? l.seeAll : null, onAction: () => context.push(Routes.myQuizzes)),
        for (final q in due.take(2)) ...[QuizSummaryCard(quiz: q), const SizedBox(height: 10)],
      ],
    );
  }
}
