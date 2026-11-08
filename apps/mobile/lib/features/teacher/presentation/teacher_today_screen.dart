import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../chat/presentation/messages_button.dart';
import '../../home/presentation/student_home_screen.dart' show greeting;
import '../../live/domain/live_models.dart';
import '../../me/data/me_repository.dart';
import '../data/proposals_repository.dart';
import '../data/studio_repository.dart';
import '../data/teacher_repository.dart';
import 'teacher_batches_screen.dart';

/// "Today 18:00", "Tomorrow 18:00", "Thu 18:00" (this week), else "Tue Nov 24 · 18:00".
String teacherRelativeTime(AppLocalizations l, Fmt f, DateTime at, DateTime now) => f.relativeDay(l, at, now);

/// Reschedule decisions from the last week: the replies a teacher wants to see.
List<RescheduleRequest> recentRescheduleReplies(List<RescheduleRequest> all, DateTime now) =>
    all.where((r) => !r.pending && (r.decidedAt ?? r.createdAt ?? now).isAfter(now.subtract(const Duration(days: 7)))).toList();

/// Teacher "Today": the next session, what needs you, quick actions, your classes and your earnings.
class TeacherTodayScreen extends ConsumerWidget {
  const TeacherTodayScreen({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref
      ..invalidate(upcomingScheduleProvider)
      ..invalidate(teacherBatchesProvider)
      ..invalidate(gradingQueueProvider)
      ..invalidate(atRiskByBatchProvider)
      ..invalidate(myRescheduleRequestsProvider)
      ..invalidate(myCoursesProvider)
      ..invalidate(earningsProvider)
      ..invalidate(bankDetailsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final user = ref.watch(currentUserProvider);
    final upcoming = ref.watch(upcomingScheduleProvider);
    final now = DateTime.now();

    return Scaffold(
      body: SafeArea(
        child: RefreshList(
          onRefresh: () => _refresh(ref),
          children: [
            Kicker('${f.dayLabel(now)} · ${f.time(now)}', size: 12),
            const SizedBox(height: 4),
            Row(children: [
              Expanded(child: DisplayText(greeting(l, user?.firstName ?? '', now), size: 32)),
              const MessagesButton(),
            ]),
            const SizedBox(height: 16),
            AsyncView<List<SessionSummary>>(
              value: upcoming,
              compact: true,
              onRetry: () => ref.invalidate(upcomingScheduleProvider),
              data: (all) {
                final next = all
                    .where((s) => s.status == SessionStatus.live || (s.status == SessionStatus.scheduled && s.endsAt.isAfter(now)))
                    .firstOrNull;
                return next == null ? const _NoNextSession() : NextSessionCard(session: next);
              },
            ),
            const _NeedsYou(),
            const _QuickActions(),
            const _MyClasses(),
            const _EarningsSnapshot(),
          ],
        ),
      ),
    );
  }
}

class _NoNextSession extends StatelessWidget {
  const _NoNextSession();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return SectionCard(
      key: const Key('no-next-session'),
      margin: EdgeInsets.zero,
      child: Row(children: [
        Icon(Icons.wb_twilight_rounded, color: p.muted),
        const SizedBox(width: 12),
        Expanded(child: Text(l.teacherNoUpcomingSessions, style: Theme.of(context).textTheme.bodyMedium)),
      ]),
    );
  }
}

/// The next session: a relative time ("Tomorrow 18:00") until the last hour, then a live countdown.
class NextSessionCard extends ConsumerWidget {
  const NextSessionCard({super.key, required this.session});
  final SessionSummary session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final s = session;
    final p = AzzaPalette.of(context);
    // Live: the on-air fill; otherwise the brand green with inkDeep text.
    final fg = s.isLive ? p.onLive : AzzaColors.inkDeep;
    final outline = OutlinedButton.styleFrom(foregroundColor: fg, side: BorderSide(color: fg), minimumSize: const Size(44, 48));
    return Container(
      key: const Key('next-session'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: s.isLive ? p.live : AzzaColors.green, borderRadius: BorderRadius.circular(AzzaSpace.radius)),
      child: Ticker(
        builder: (context, now) {
          final open = s.lobbyOpen(now);
          final until = s.startsAt.difference(now);
          final withinHour = !s.isLive && until <= const Duration(hours: 1);
          final when = teacherRelativeTime(l, f, s.startsAt, now);
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              if (s.isLive) SignalMark(size: 16, color: fg, live: true),
              Expanded(
                child: Kicker(
                  s.isLive
                      ? '${l.liveNow} · ${Fmt.timecode(now.difference(s.startsAt))}'
                      : (open ? l.nextTakeLobbyOpen : l.teacherNextSession),
                  color: fg,
                  size: 12,
                ),
              ),
              MonoLabel(Fmt.slate(s.batchCode, s.number), color: fg, size: 12),
            ]),
            const SizedBox(height: 10),
            if (withinHour)
              Text(Fmt.timecode(until.isNegative ? Duration.zero : until), key: const Key('next-countdown'), style: AzzaFonts.mono(size: 44, color: fg, tracking: 0))
            else if (!s.isLive)
              Text(when, key: const Key('next-relative'), style: AzzaFonts.display(arabic: context.isArabic, size: 34, color: fg)),
            DisplayText(s.title, size: 24, color: fg),
            Text('${s.course(locale)} · ${f.timeRange(s.startsAt, s.endsAt)}', style: TextStyle(color: fg)),
            const SizedBox(height: 14),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AzzaColors.inkDeep, foregroundColor: AzzaColors.ivory, minimumSize: const Size.fromHeight(48)),
              onPressed: () => context.push(s.isLive ? Routes.liveRoom(s.id) : Routes.lobby(s.id)),
              child: Text(s.isLive ? l.joinLiveRoom : l.enterLobby),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: OutlinedButton(style: outline, onPressed: () => context.push(Routes.sessionPrep(s.id)), child: Text(l.prepTitle))),
              if (!s.isLive) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    key: const Key('next-reschedule'),
                    style: outline,
                    onPressed: () => context.push(Routes.reschedule(s.id)),
                    child: Text(l.teacherReschedule),
                  ),
                ),
              ],
            ]),
          ]);
        },
      ),
    );
  }
}

/// Lets the teacher pick one of their classes (for an announcement or a material). Null when dismissed.
Future<Batch?> pickTeacherClass(BuildContext context, List<Batch> classes, {required String title}) {
  return showModalBottomSheet<Batch>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: ListView(shrinkWrap: true, padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 16), children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        for (final b in classes)
          ListTile(
            key: Key('pick-class-${b.id}'),
            minTileHeight: 56,
            contentPadding: EdgeInsets.zero,
            leading: Slate(b.code),
            title: Text(b.course?.title(context.isArabic ? AppLocale.ar : AppLocale.en) ?? b.code),
            onTap: () => Navigator.pop(context, b),
          ),
      ]),
    ),
  );
}

class _NeedsYou extends ConsumerWidget {
  const _NeedsYou();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final now = DateTime.now();
    final grading = ref.watch(gradingQueueProvider);
    final atRisk = ref.watch(atRiskByBatchProvider);
    final requests = ref.watch(myRescheduleRequestsProvider);
    final courses = ref.watch(myCoursesProvider);
    final batches = ref.watch(teacherBatchesProvider);

    final toGrade = grading.value?.where((i) => !i.submission.graded).length;
    final atRiskList = atRisk.value ?? const <(Batch, int)>[];
    final atRiskCount = atRisk.hasValue ? atRiskList.fold(0, (s, e) => s + e.$2) : null;
    final replies = requests.hasValue ? recentRescheduleReplies(requests.requireValue, now) : const <RescheduleRequest>[];
    final notedCourses = (courses.value ?? const <Course>[]).where((c) => c.status == CourseStatus.draft && (c.reviewNote?.isNotEmpty ?? false)).toList();
    final notedBatches = (batches.value ?? const <Batch>[]).where((b) => b.status == BatchStatus.draft && (b.reviewNote?.isNotEmpty ?? false)).toList();
    final proposals = courses.hasValue || batches.hasValue ? notedCourses.length + notedBatches.length : null;

    Future<void> openAtRisk() async {
      if (atRiskList.isEmpty) return;
      final b = atRiskList.length == 1
          ? atRiskList.first.$1
          : await pickTeacherClass(context, [for (final e in atRiskList) e.$1], title: l.teacherNeedsAtRisk);
      if (b != null && context.mounted) await context.push(Routes.classHub(b.id, tab: 'students', atRisk: true));
    }

    Future<void> openReplies() async {
      if (replies.isEmpty) return;
      if (replies.length == 1) {
        await context.push(Routes.reschedule(replies.first.sessionId));
        return;
      }
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (sheet) => _RepliesSheet(replies: replies),
      );
    }

    return SectionCard(
      key: const Key('needs-you'),
      title: l.teacherNeedsYou,
      margin: const EdgeInsets.only(top: 20),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _QueueRow(
          key: const Key('needs-grade'),
          icon: Icons.rate_review_outlined,
          label: l.teacherNeedsGrade,
          count: toGrade,
          first: true,
          onTap: () => context.push(Routes.teacherGrading),
        ),
        _QueueRow(key: const Key('needs-at-risk'), icon: Icons.trending_down_rounded, label: l.teacherNeedsAtRisk, count: atRiskCount, onTap: openAtRisk),
        _QueueRow(
          key: const Key('needs-reschedule'),
          icon: Icons.event_repeat_rounded,
          label: l.teacherNeedsReschedule,
          count: requests.hasValue ? replies.length : null,
          onTap: openReplies,
        ),
        _QueueRow(
          key: const Key('needs-proposals'),
          icon: Icons.edit_note_rounded,
          label: l.teacherNeedsProposals,
          count: proposals,
          onTap: () => notedCourses.isNotEmpty ? context.push(Routes.teacherCourses) : context.go(Routes.teacherBatches),
        ),
      ]),
    );
  }
}

class _RepliesSheet extends ConsumerWidget {
  const _RepliesSheet({required this.replies});
  final List<RescheduleRequest> replies;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    return SafeArea(
      child: ListView(shrinkWrap: true, padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 16), children: [
        Text(l.teacherNeedsReschedule, style: Theme.of(context).textTheme.titleLarge),
        for (final r in replies)
          ListTile(
            minTileHeight: 56,
            contentPadding: EdgeInsets.zero,
            title: Text(Fmt.slate(r.session.batchCode, r.session.number)),
            subtitle: Text([f.dayTime(r.startsAt), ?r.decisionNote].join(' · ')),
            trailing: StatusChip(
              label: r.status == 'APPROVED' ? l.requestApproved : l.requestDeclined,
              color: r.status == 'APPROVED' ? p.successBg : p.dangerBg,
              textColor: r.status == 'APPROVED' ? p.success : p.danger,
            ),
            onTap: () {
              Navigator.pop(context);
              context.push(Routes.reschedule(r.sessionId));
            },
          ),
      ]),
    );
  }
}

class _QueueRow extends ConsumerWidget {
  const _QueueRow({super.key, required this.icon, required this.label, required this.count, required this.onTap, this.first = false});
  final IconData icon;
  final String label;

  /// Null while loading.
  final int? count;
  final VoidCallback onTap;
  final bool first;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final active = (count ?? 0) > 0;
    return Semantics(
      button: true,
      label: '$label ${count ?? ''}',
      excludeSemantics: true,
      child: InkWell(
        onTap: active ? onTap : null,
        child: Container(
          constraints: const BoxConstraints(minHeight: 52),
          decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: p.line))),
          child: Row(children: [
            Icon(icon, size: 22, color: active ? p.accent : p.muted),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: t.bodyLarge?.copyWith(color: active ? p.text : p.muted))),
            Container(
              constraints: const BoxConstraints(minWidth: 32),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: active ? p.accent : p.line, borderRadius: BorderRadius.circular(AzzaSpace.radiusPill)),
              child: Text(
                count == null ? '…' : f.n(count!),
                key: Key('${(key as ValueKey<String>?)?.value ?? label}-count'),
                textAlign: TextAlign.center,
                style: t.labelLarge?.copyWith(color: active ? p.onAccent : p.muted),
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right_rounded, color: active ? p.muted : Colors.transparent),
          ]),
        ),
      ),
    );
  }
}

class _QuickActions extends ConsumerWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;

    Future<Batch?> chooseClass(String title) async {
      final classes = (await ref.read(teacherBatchesProvider.future)).where(isTeachingBatch).toList();
      if (!context.mounted) return null;
      if (classes.isEmpty) {
        showToast(context, l.teacherNeedClassFirst);
        return null;
      }
      return classes.length == 1 ? classes.first : pickTeacherClass(context, classes, title: title);
    }

    final actions = [
      (const Key('quick-new-class'), Icons.add_circle_outline_rounded, l.newBatch, () => context.push(Routes.teacherNewBatch)),
      (const Key('quick-propose-course'), Icons.auto_stories_outlined, l.teacherProposeCourse, () => context.push(Routes.teacherNewCourse)),
      (
        const Key('quick-announcement'),
        Icons.campaign_outlined,
        l.teacherPostAnnouncement,
        () async {
          final b = await chooseClass(l.teacherPostAnnouncement);
          if (b != null && context.mounted) await context.push(Routes.batchAnnouncements(b.id));
        },
      ),
      (
        const Key('quick-material'),
        Icons.upload_file_rounded,
        l.teacherUploadMaterial,
        () async {
          final b = await chooseClass(l.teacherUploadMaterial);
          if (b != null && context.mounted) await context.push(Routes.classHub(b.id, tab: 'materials'));
        },
      ),
    ];

    Widget tile((Key, IconData, String, VoidCallback) a) => Expanded(
          child: RaisedCard(
            key: a.$1,
            onTap: a.$4,
            padding: const EdgeInsets.all(14),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 64),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Icon(a.$2, color: AzzaPalette.of(context).accent),
                const SizedBox(height: 8),
                Text(a.$3, style: Theme.of(context).textTheme.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
              ]),
            ),
          ),
        );

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionHeader(l.teacherQuickActions, padding: const EdgeInsets.only(top: 24, bottom: 10)),
      Row(children: [tile(actions[0]), const SizedBox(width: 10), tile(actions[1])]),
      const SizedBox(height: 10),
      Row(children: [tile(actions[2]), const SizedBox(width: 10), tile(actions[3])]),
    ]);
  }
}

class _MyClasses extends ConsumerWidget {
  const _MyClasses();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final classes = (ref.watch(teacherBatchesProvider).value ?? const <Batch>[]).where(isTeachingBatch).toList();
    if (classes.isEmpty) return const SizedBox.shrink();
    final now = DateTime.now();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionHeader(l.teacherMyClasses, action: l.teacherSeeAll, onAction: () => context.go(Routes.teacherBatches), padding: const EdgeInsets.only(top: 24, bottom: 6)),
      SizedBox(
        height: context.scaled(128),
        child: ListView.separated(
          key: const Key('my-classes'),
          scrollDirection: Axis.horizontal,
          itemCount: classes.length,
          separatorBuilder: (_, _) => const SizedBox(width: 10),
          itemBuilder: (context, i) {
            final b = classes[i];
            final next = b.nextSession(now);
            return SizedBox(
              width: 220,
              child: RaisedCard(
                key: Key('my-class-${b.id}'),
                onTap: () => context.push(Routes.roster(b.id)),
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Slate(b.code),
                  const SizedBox(height: 8),
                  Text(b.course?.title(locale) ?? '', style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                  const Spacer(),
                  Text(
                    next == null ? f.n(l.teacherStudentsCount(b.seatsTaken)) : teacherRelativeTime(l, f, next.startsAt, now),
                    style: t.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ]),
              ),
            );
          },
        ),
      ),
    ]);
  }
}

class _EarningsSnapshot extends ConsumerWidget {
  const _EarningsSnapshot();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final earnings = ref.watch(earningsProvider);
    final bank = ref.watch(bankDetailsProvider);
    final e = earnings.value;
    final missingMethod = bank.hasValue && bank.value == null;

    return SectionCard(
      key: const Key('earnings-snapshot'),
      title: l.teacherEarningsSnapshot,
      margin: const EdgeInsets.only(top: 24),
      trailing: TextButton(
        style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
        onPressed: () => context.go(Routes.teacherEarnings),
        child: Text(l.teacherSeeAll),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (e == null && earnings.hasError)
          Text(l.teacherEarningsUnavailable, style: t.bodySmall)
        else
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Kicker(l.teacherThisPeriod, size: 12),
                const SizedBox(height: 2),
                DisplayText(e == null ? '—' : f.aed(e.earnedThisMonthFils), size: 22),
              ]),
            ),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Kicker(l.teacherNextPayout, size: 12),
                const SizedBox(height: 2),
                DisplayText(e?.nextPayoutEstimateFils == null ? '—' : f.aed(e!.nextPayoutEstimateFils!), size: 22),
                if (e?.nextPayout != null) Text(f.shortDate(e!.nextPayout!), style: t.bodySmall),
              ]),
            ),
          ]),
        if (missingMethod) ...[
          const SizedBox(height: 12),
          Material(
            key: const Key('payout-method-missing'),
            color: p.warningBg,
            borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
            child: InkWell(
              borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
              onTap: () => context.go(Routes.teacherPayoutMethod),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(children: [
                  Icon(Icons.warning_amber_rounded, color: p.warning),
                  const SizedBox(width: 10),
                  Expanded(child: Text(l.teacherPayoutMissing, style: t.bodyMedium?.copyWith(color: p.warning))),
                  Text(l.teacherAddPayoutMethod, style: t.labelLarge?.copyWith(color: p.warning)),
                ]),
              ),
            ),
          ),
        ],
      ]),
    );
  }
}
