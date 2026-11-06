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
import '../../catalog/presentation/catalog_widgets.dart';
import '../../home/presentation/student_home_screen.dart' show greeting;
import '../../me/data/me_repository.dart';

/// Teacher "Today": the call sheet — next take first, then everything else.
class TeacherTodayScreen extends ConsumerWidget {
  const TeacherTodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final user = ref.watch(currentUserProvider);
    final upcoming = ref.watch(upcomingScheduleProvider);
    final now = DateTime.now();
    final t = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: AsyncView<List<SessionSummary>>(
          value: upcoming,
          onRetry: () => ref.invalidate(upcomingScheduleProvider),
          data: (all) {
            final today = startOfDay(now);
            final active = all.where((s) => s.status != SessionStatus.cancelled).toList();
            final todays = active.where((s) => startOfDay(s.startsAt) == today).toList();
            final next = active.where((s) => s.status == SessionStatus.live || (s.status == SessionStatus.scheduled && s.endsAt.isAfter(now))).firstOrNull;
            final later = todays.where((s) => s.id != next?.id && s.endsAt.isAfter(now)).toList();
            final weekCount = active.where((s) => s.startsAt.isBefore(today.add(const Duration(days: 7)))).length;
            return RefreshList(
              onRefresh: () async => ref.invalidate(upcomingScheduleProvider),
              children: [
                MonoLabel('${f.dayLabel(now)} · ${f.time(now)}'),
                const SizedBox(height: 4),
                DisplayText(greeting(l, user?.firstName ?? '', now), size: 32),
                const SizedBox(height: 20),
                if (next == null)
                  EmptyState(title: l.noSessionsToday, icon: Icons.wb_twilight_rounded)
                else
                  _NextTake(session: next, fmt: f, locale: locale),
                const SizedBox(height: 20),
                Row(children: [
                  _Stat(value: f.n(todays.length), label: l.todayStat, sub: l.sessionsLabel),
                  _Stat(value: f.n(weekCount), label: l.weekStat, sub: l.sessionsLabel),
                ]),
                if (later.isNotEmpty) ...[
                  SectionHeader(l.laterToday, action: l.navCalendar, onAction: () => context.go(Routes.teacherCalendar)),
                  CardGroup(
                    children: [
                      for (final s in later)
                        SessionRow(
                          session: s,
                          fmt: f,
                          subtitle: s.course(locale),
                          padding: SessionRow.inCard,
                          onTap: () => context.push(Routes.sessionPrep(s.id)),
                        ),
                    ],
                  ),
                ],
                if (todays.isEmpty && next != null) ...[
                  const SizedBox(height: 16),
                  Text(l.noSessionsToday, style: t.bodySmall),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _NextTake extends StatelessWidget {
  const _NextTake({required this.session, required this.fmt, required this.locale});
  final SessionSummary session;
  final Fmt fmt;
  final AppLocale locale;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final s = session;
    final p = AzzaPalette.of(context);
    // Live: the on-air fill; otherwise the brand green with inkDeep text.
    final fg = s.isLive ? p.onLive : AzzaColors.inkDeep;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: s.isLive ? p.live : AzzaColors.green, borderRadius: BorderRadius.circular(AzzaSpace.radius)),
      child: Ticker(
        builder: (context, now) {
          final open = s.lobbyOpen(now);
          final until = s.startsAt.difference(now);
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              if (s.isLive) SignalMark(size: 16, color: fg, live: true),
              Expanded(
                child: MonoLabel(
                  s.isLive ? '${l.liveNow} · ${Fmt.timecode(now.difference(s.startsAt))}' : (open ? l.nextTakeLobbyOpen : l.nextTakeIn(Fmt.timecode(until))),
                  color: fg,
                ),
              ),
              MonoLabel(Fmt.slate(s.batchCode, s.number), color: fg),
            ]),
            const SizedBox(height: 10),
            if (!s.isLive)
              Text(Fmt.timecode(until.isNegative ? Duration.zero : until), style: AzzaFonts.mono(size: 44, color: fg, tracking: 0)),
            DisplayText(s.title, size: 28, color: fg),
            Text('${s.course(locale)} · ${fmt.time(s.startsAt)}–${fmt.time(s.endsAt)}', style: TextStyle(color: fg)),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: AzzaColors.inkDeep, foregroundColor: AzzaColors.ivory),
                  onPressed: () => context.push(s.isLive ? Routes.liveRoom(s.id) : Routes.lobby(s.id)),
                  child: Text(s.isLive ? l.joinLiveRoom : l.enterLobby),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(foregroundColor: fg, side: BorderSide(color: fg)),
                onPressed: () => context.push(Routes.sessionPrep(s.id)),
                child: Text(l.prepTitle),
              ),
            ]),
          ]);
        },
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, required this.sub});
  final String value;
  final String label;
  final String sub;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Expanded(
      child: Container(
        margin: const EdgeInsetsDirectional.only(end: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: p.raised, border: Border.all(color: p.line), borderRadius: BorderRadius.circular(AzzaSpace.radius)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          MonoLabel(label),
          DisplayText(value, size: 30),
          Text(sub, style: Theme.of(context).textTheme.bodySmall),
        ]),
      ),
    );
  }
}
