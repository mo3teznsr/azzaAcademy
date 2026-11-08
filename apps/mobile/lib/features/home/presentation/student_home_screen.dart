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
import '../../auth/presentation/guest_gate.dart';
import '../../chat/data/chat_repository.dart';
import '../../chat/presentation/messages_button.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../certificates/data/certificates_repository.dart';
import '../../certificates/domain/certificate_models.dart';
import '../../learn/data/learn_repository.dart';
import '../../learn/data/lesson_progress_repository.dart';
import '../../learn/data/lessons_repository.dart';
import '../../learn/domain/lesson_models.dart';
import '../../learn/presentation/progress_widgets.dart';
import '../../learn/presentation/recorded_course_card.dart';
import '../../subscriptions/presentation/plan_banner.dart';
import '../../subscriptions/data/subscription_repository.dart' show mySubscriptionsProvider;
import '../../learn/data/quizzes_repository.dart';
import '../../learn/domain/quiz_models.dart';
import '../../../core/utils/links.dart';
import '../../me/data/me_repository.dart';
import '../../me/domain/me_models.dart';
import '../../waitlist/data/waitlist_repository.dart';
import '../../waitlist/presentation/waitlist_section.dart';

String greeting(AppLocalizations l, String name, DateTime now) {
  if (now.hour < 12) return l.greetingMorning(name);
  if (now.hour < 17) return l.greetingAfternoon(name);
  return l.greetingEvening(name);
}

/// Student Home, learning first (VOICE.md): a session you can join right now leads, because it's time-bound;
/// then continue learning (per course), practice due, this week's live sessions, and at the bottom
/// recordings to catch up on, class announcements and a new certificate.
class StudentHomeScreen extends ConsumerWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    if (ref.watch(isGuestProvider)) {
      return GuestTab(heading: l.navHome, title: l.guestHomeTitle, body: l.guestHomeBody, icon: Icons.auto_stories_outlined);
    }
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
      ref.invalidate(assignmentsProvider);
      ref.invalidate(courseLessonsProvider);
      ref.invalidate(learningProgressProvider);
      ref.invalidate(mySubscriptionsProvider);
      ref.invalidate(myCertificatesProvider);
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
            final joinable = sessions.where((s) => s.lobbyOpen(now)).firstOrNull;
            final week = sessions
                .where((s) => s.id != joinable?.id && s.status == SessionStatus.scheduled && s.endsAt.isAfter(now))
                .take(2)
                .toList();
            final locale = ref.watch(localeProvider);
            final recorded = ref.watch(recordedCoursesProvider);
            final progressLoading = ref.watch(learningProgressProvider).isLoading;
            // One card per course: two classes of one course share the same lessons.
            final byCourse = <String, Enrollment>{};
            for (final e in active) {
              byCourse.putIfAbsent(e.batch.courseId, () => e);
            }
            return RefreshList(
              onRefresh: refresh,
              children: [
                Kicker(f.dayLabel(now)),
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
                const PlanBanners(),
                if (joinable != null) ...[_LiveNowCard(session: joinable, fmt: f, locale: locale), const SizedBox(height: 4)],
                if (active.isEmpty && pending.isEmpty && recorded.isEmpty && progressLoading) ...[
                  // Recorded courses are still on their way: don't tell a subscriber to go and find a course.
                  const SizedBox(height: 24),
                  const LoadingState(key: Key('home-progress-loading'), compact: true),
                ] else if (active.isEmpty && pending.isEmpty && recorded.isEmpty) ...[
                  const SizedBox(height: 24),
                  EmptyState(
                    title: l.noBatchesTitle,
                    body: l.noBatchesBody,
                    action: l.exploreCta,
                    onAction: () => context.go(Routes.studentExplore),
                  ),
                  const WaitlistSection(),
                ] else ...[
                  SectionHeader(l.studentContinueLearning, action: l.myBatches, onAction: () => context.go(Routes.studentLibrary)),
                  for (final (i, e) in byCourse.values.indexed) ...[
                    FadeSlideIn(index: i, child: _ContinueCard(enrollment: e)),
                    const SizedBox(height: 10),
                  ],
                  for (final (i, c) in recorded.indexed) ...[
                    FadeSlideIn(index: byCourse.length + i, child: RecordedCourseCard(item: c)),
                    const SizedBox(height: 10),
                  ],
                  for (final e in pending) ...[
                    _PendingTile(enrollment: e),
                    const SizedBox(height: 10),
                  ],
                  _PracticeDue(active: active),
                  if (week.isNotEmpty) _ThisWeek(sessions: week),
                  const WaitlistSection(),
                  const _CatchUp(),
                  const LatestAnnouncementsStrip(),
                  const _CertificateBanner(),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

/// The course and session number, never the bare codes (B07 · S05).
String sessionLabel(AppLocalizations l, Fmt f, AppLocale locale, SessionSummary s) =>
    [if (s.course(locale).isNotEmpty) s.course(locale), l.studentSessionN(f.n(s.number))].join(' · ');

/// Shown only while the session can be joined (lobby open or live).
class _LiveNowCard extends StatelessWidget {
  const _LiveNowCard({required this.session, required this.fmt, required this.locale});
  final SessionSummary session;
  final Fmt fmt;
  final AppLocale locale;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final live = session.isLive;
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
                  child: Ticker(builder: (_, now) => Kicker('${l.liveNow} · ${Fmt.timecode(now.difference(session.startsAt))}', color: fg)),
                ),
              ] else
                Expanded(child: Kicker('${l.upNext} · ${fmt.time(session.startsAt)}', color: fg)),
            ],
          ),
          const SizedBox(height: 14),
          DisplayText(session.title, size: 30, color: fg),
          const SizedBox(height: 6),
          Text(
            [sessionLabel(l, fmt, locale, session), if (session.participantCount != null) l.inRoom(fmt.n(session.participantCount!))].join(' · '),
            style: TextStyle(color: live ? fg : p.muted),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            key: const Key('home-join'),
            style: live ? FilledButton.styleFrom(backgroundColor: AzzaColors.inkDeep, foregroundColor: AzzaColors.ivory) : null,
            onPressed: () => context.push(Routes.lobby(session.id)),
            icon: const Icon(Icons.sensors_rounded),
            label: Text(l.joinLiveRoom),
          ),
        ],
      ),
    );
  }
}

/// A course to keep learning: lessons done out of the total (`GET /me/learning-progress`) and "Resume: {next lesson}",
/// which opens that lesson directly; "All lessons done" at 100%. Until progress loads (or if it fails), the card shows
/// the course's shape (lessons and modules) and opens its lessons.
class _ContinueCard extends ConsumerWidget {
  const _ContinueCard({required this.enrollment});
  final Enrollment enrollment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final b = enrollment.batch;
    final CourseProgress? item = ref.watch(learningProgressProvider).value?.where((c) => c.courseId == b.courseId).firstOrNull;
    final progress = item?.progress;
    final lessons = progress == null ? ref.watch(courseLessonsProvider(b.courseId)).value : null;
    final modules = lessons?.modules.where((m) => m.lessons.isNotEmpty).length ?? 0;
    final fallback = lessons == null
        ? null
        : lessons.lessonCount == 0
            ? l.noLessons
            : '${f.n(l.lessonsCountN(lessons.lessonCount))} · ${f.n(l.studentModulesN(modules))}';
    final next = progress?.nextLesson;
    void openLessons() => context.push(Routes.courseLessons(b.courseId));
    void resume() => next == null ? openLessons() : context.push(Routes.lesson(b.courseId, next.id));
    final title = b.course?.title(locale) ?? item?.title(locale) ?? lessons?.title(locale) ?? '';
    return RaisedCard(
      key: Key('continue-${b.courseId}'),
      onTap: progress == null ? openLessons : resume,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: p.successBg, borderRadius: BorderRadius.circular(12)),
              child: Icon(progress?.allDone ?? false ? Icons.task_alt_rounded : Icons.menu_book_rounded, color: p.success),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Kicker(l.lessonsTitle),
                  Text(title, style: t.titleSmall),
                  if (progress == null && fallback != null) Text(fallback, style: t.bodySmall),
                ],
              ),
            ),
            if (progress == null || progress.total == 0)
              Flexible(
                child: TextButton(
                  key: Key('lessons-${b.id}'),
                  style: TextButton.styleFrom(minimumSize: const Size(48, 44)),
                  onPressed: openLessons,
                  child: Text(l.studentOpenLessons, textAlign: TextAlign.end),
                ),
              ),
          ],
        ),
        if (progress != null && progress.total > 0) ...[
          const SizedBox(height: 14),
          CourseProgressBar(progress: progress, dense: true),
          const SizedBox(height: 10),
          if (next != null)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: Key('resume-${b.courseId}'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 44), padding: const EdgeInsets.symmetric(horizontal: 8)),
                onPressed: resume,
                icon: const Icon(Icons.play_arrow_rounded, size: 20),
                label: Text(
                  progress.completed == 0 ? l.progressStart(next.title(locale)) : l.progressResume(next.title(locale)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            )
          else
            Row(key: Key('all-done-${b.courseId}'), children: [
              Icon(Icons.check_circle_rounded, size: 18, color: p.success),
              const SizedBox(width: 6),
              Expanded(child: Text(l.progressAllDone, style: t.titleSmall?.copyWith(color: p.success))),
              TextButton(
                key: Key('lessons-${b.id}'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 44)),
                onPressed: openLessons,
                child: Text(l.studentOpenLessons),
              ),
            ]),
        ],
      ]),
    );
  }
}

/// A seat that isn't paid yet: opens its order (upload receipt / status).
class _PendingTile extends ConsumerWidget {
  const _PendingTile({required this.enrollment});
  final Enrollment enrollment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final b = enrollment.batch;
    final orderId = enrollment.latestOrderId;
    return RaisedCard(
      onTap: orderId == null ? null : () => context.push(Routes.order(orderId)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(b.course?.title(locale) ?? b.code, style: Theme.of(context).textTheme.titleSmall),
                Text(
                  switch (enrollment.latestOrderStatus) {
                    OrderStatus.awaitingReceipt => l.orderAwaitingReceipt,
                    OrderStatus.awaitingPayment => l.orderAwaitingPayment,
                    OrderStatus.amountMismatch => l.orderAmountMismatch,
                    _ => l.orderVerifying,
                  },
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

/// One thing to practise: a quiz or an assignment.
class _PracticeItem {
  const _PracticeItem({required this.id, required this.title, required this.course, required this.isQuiz, required this.route, this.dueAt, this.overdue = false});
  final String id;
  final String title;
  final String course;
  final bool isQuiz;
  final String route;
  final DateTime? dueAt;
  final bool overdue;
}

/// Quizzes and assignments still to do across the student's classes, merged and soonest due first
/// (overdue ones lead). Hidden when there's nothing due.
class _PracticeDue extends ConsumerWidget {
  const _PracticeDue({required this.active});
  final List<Enrollment> active;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final now = DateTime.now();
    final quizzes = ref.watch(myQuizzesProvider).value ?? const <QuizSummary>[];
    bool todo(QuizSummary q) => (q.mine?.canStart ?? false) || q.mine?.status == QuizStatus.inProgress;
    final items = <_PracticeItem>[
      for (final q in quizzes.where(todo))
        _PracticeItem(
          id: q.id,
          title: q.title,
          course: q.courseTitle(locale),
          isQuiz: true,
          route: Routes.quiz(q.id),
          dueAt: q.dueAt,
          overdue: q.dueAt != null && q.dueAt!.isBefore(now),
        ),
      for (final e in active)
        for (final a in (ref.watch(assignmentsProvider(e.batch.id)).value ?? const <Assignment>[]).where((a) => a.state == AssignmentState.due))
          _PracticeItem(
            id: a.id,
            title: a.title,
            course: e.batch.course?.title(locale) ?? '',
            isQuiz: false,
            route: Uri(path: Routes.assignments, queryParameters: {'batchId': e.batch.id}).toString(),
            dueAt: a.dueAt,
            overdue: a.isOverdue(now),
          ),
    ]..sort((a, b) => (a.dueAt ?? DateTime(9999)).compareTo(b.dueAt ?? DateTime(9999)));
    if (items.isEmpty) return const SizedBox.shrink();
    final shown = items.take(4).toList();
    final hidden = items.skip(4).toList();
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return Column(
      key: const Key('home-practice'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          l.practiceDue,
          action: hidden.isEmpty ? null : l.seeAll,
          onAction: () => context.push(hidden.any((i) => i.isQuiz) ? Routes.myQuizzes : Routes.assignments),
        ),
        CardGroup(children: [
          for (final i in shown)
            ListTile(
              key: Key('practice-${i.id}'),
              minTileHeight: 56,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              leading: Icon(i.isQuiz ? Icons.quiz_outlined : Icons.assignment_outlined, color: i.overdue ? p.danger : p.muted),
              title: Text(i.title, style: t.titleSmall),
              subtitle: Text(
                [
                  i.isQuiz ? l.studentPracticeQuiz : l.studentPracticeAssignment,
                  if (i.course.isNotEmpty) i.course,
                  if (i.dueAt == null)
                    l.studentNoDueDate
                  else if (i.overdue)
                    l.studentWasDue(f.dayTime(i.dueAt!))
                  else
                    l.dueAt(f.dayTime(i.dueAt!)),
                ].join(' · '),
                style: t.bodySmall?.copyWith(color: i.overdue ? p.danger : null),
              ),
              trailing: i.overdue
                  ? Row(mainAxisSize: MainAxisSize.min, children: [
                      StatusChip(key: Key('overdue-${i.id}'), label: l.studentOverdue, color: p.dangerBg, textColor: p.danger),
                    ])
                  : const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push(i.route),
            ),
        ]),
      ],
    );
  }
}

/// The next one or two live sessions, labelled by course and session number.
class _ThisWeek extends ConsumerWidget {
  const _ThisWeek({required this.sessions});
  final List<SessionSummary> sessions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    return Column(
      key: const Key('home-week'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.thisWeek, action: l.seeAll, onAction: () => context.go(Routes.studentSchedule)),
        CardGroup(children: [
          for (final s in sessions)
            ListTile(
              key: Key('week-${s.id}'),
              minTileHeight: 56,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              leading: const Icon(Icons.event_rounded),
              title: Text(s.title.isEmpty ? sessionLabel(l, f, locale, s) : s.title, style: t.titleSmall),
              subtitle: Text('${sessionLabel(l, f, locale, s)} · ${f.dayTime(s.startsAt)}', style: t.bodySmall),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push(Routes.lobby(s.id)),
            ),
        ]),
      ],
    );
  }
}

/// Recent recordings; each opens the recording itself.
class _CatchUp extends ConsumerWidget {
  const _CatchUp();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recordings = (ref.watch(recordingsProvider).value ?? const <Recording>[]).where((r) => r.url != null).toList()
      ..sort((a, b) => (b.recordedAt ?? DateTime(0)).compareTo(a.recordedAt ?? DateTime(0)));
    if (recordings.isEmpty) return const SizedBox.shrink();
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return Column(
      key: const Key('home-catchup'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.continueWatching, action: l.seeAll, onAction: () => context.go(Routes.studentLibrary)),
        CardGroup(children: [
          for (final r in recordings.take(2))
            ListTile(
              key: Key('recording-${r.sessionId}'),
              minTileHeight: 56,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              leading: Icon(Icons.play_circle_outline_rounded, color: p.accent),
              title: Text(r.title, style: t.titleSmall),
              subtitle: Text(
                [
                  if ((locale == AppLocale.ar ? (r.courseTitleAr ?? r.courseTitle) : r.courseTitle).isNotEmpty)
                    locale == AppLocale.ar ? (r.courseTitleAr ?? r.courseTitle) : r.courseTitle,
                  l.studentSessionN(f.n(r.number)),
                  if (r.recordedAt != null) f.shortDate(r.recordedAt!),
                ].join(' · '),
                style: t.bodySmall,
              ),
              trailing: const Icon(Icons.open_in_new_rounded, size: 18),
              onTap: () => openExternal(context, r.url),
            ),
        ]),
      ],
    );
  }
}

/// A certificate the student hasn't opened yet.
class _CertificateBanner extends ConsumerWidget {
  const _CertificateBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(myCertificatesProvider).value?.items ?? const <Certificate>[];
    final seen = ref.watch(seenCertificatesProvider);
    final cert = items.where((c) => seen.isNew(c.code)).firstOrNull;
    if (cert == null) return const SizedBox.shrink();
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: RaisedCard(
        key: const Key('home-certificate'),
        color: p.successBg,
        onTap: () => context.push(Routes.certificate(cert.code)),
        child: Row(children: [
          Icon(Icons.workspace_premium_rounded, color: p.success, size: 32),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(l.studentCertificateReadyTitle, style: t.titleSmall),
              Text(l.studentCertificateReadyBody(cert.courseName(locale)), style: t.bodySmall),
            ]),
          ),
          const Icon(Icons.chevron_right_rounded),
        ]),
      ),
    );
  }
}
