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
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../data/me_repository.dart';

/// Week strip + agenda across every batch. Student "Schedule" and teacher "Calendar".
class ScheduleScreen extends ConsumerStatefulWidget {
  const ScheduleScreen({super.key, required this.role});
  final Role role;

  @override
  ConsumerState<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends ConsumerState<ScheduleScreen> {
  late DateTime _week = startOfWeek(DateTime.now());
  DateTime? _day;

  String _routeFor(SessionSummary s) {
    if (widget.role == Role.teacher) {
      return s.status == SessionStatus.ended ? Routes.attendance(s.id) : Routes.sessionPrep(s.id);
    }
    return s.status == SessionStatus.ended ? Routes.afterSession(s.id) : Routes.lobby(s.id);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final sessions = ref.watch(weekScheduleProvider(_week));
    final p = AzzaPalette.of(context);
    final today = startOfDay(DateTime.now());
    final days = List.generate(7, (i) => _week.add(Duration(days: i)));

    return Scaffold(
      body: SafeArea(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 12, 8, 0),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  DisplayText(widget.role == Role.teacher ? l.navCalendar : l.thisWeek, size: 34),
                  MonoLabel('${f.shortDate(days.first)}–${f.shortDate(days.last)}'),
                ]),
              ),
              IconButton(
                tooltip: l.prevWeek,
                onPressed: () => setState(() {
                  _week = _week.subtract(const Duration(days: 7));
                  _day = null;
                }),
                icon: const Icon(Icons.chevron_left_rounded),
              ),
              IconButton(
                tooltip: l.nextWeek,
                onPressed: () => setState(() {
                  _week = _week.add(const Duration(days: 7));
                  _day = null;
                }),
                icon: const Icon(Icons.chevron_right_rounded),
              ),
            ]),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(children: [
              for (final d in days)
                Expanded(
                  child: _DayCell(
                    dow: f.weekday(d),
                    n: f.dayNumber(d),
                    selected: _day == d,
                    today: d == today,
                    hasSessions: sessions.value?.any((s) => startOfDay(s.startsAt) == d) ?? false,
                    onTap: () => setState(() => _day = _day == d ? null : d),
                  ),
                ),
            ]),
          ),
          Divider(color: p.line, height: 24),
          Expanded(
            child: AsyncView<List<SessionSummary>>(
              value: sessions,
              onRetry: () => ref.invalidate(weekScheduleProvider(_week)),
              isEmpty: (list) => list.where((s) => _day == null || startOfDay(s.startsAt) == _day).isEmpty,
              empty: EmptyState(title: l.noSessionsWeek),
              data: (all) {
                final list = all.where((s) => _day == null || startOfDay(s.startsAt) == _day).toList();
                final byDay = <DateTime, List<SessionSummary>>{};
                for (final s in list) {
                  byDay.putIfAbsent(startOfDay(s.startsAt), () => []).add(s);
                }
                return RefreshList(
                  onRefresh: () async => ref.invalidate(weekScheduleProvider(_week)),
                  children: [
                    for (final e in byDay.entries) ...[
                      Padding(
                        padding: const EdgeInsetsDirectional.only(start: 4, top: 12, bottom: 8),
                        child: MonoLabel(e.key == today ? '${l.today} · ${f.dayLabel(e.key)}' : f.dayLabel(e.key), color: e.key == today ? p.accent : null),
                      ),
                      CardGroup(
                        children: [
                          for (final s in e.value)
                            SessionRow(session: s, fmt: f, subtitle: s.course(locale), padding: SessionRow.inCard, onTap: () => context.push(_routeFor(s))),
                        ],
                      ),
                    ],
                  ],
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({required this.dow, required this.n, required this.selected, required this.today, required this.hasSessions, required this.onTap});
  final String dow;
  final String n;
  final bool selected;
  final bool today;
  final bool hasSessions;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final fg = selected ? p.onAccent : (today ? p.accent : p.text);
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: AnimatedContainer(
          duration: AzzaMotion.quick,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: selected ? p.accent : null, borderRadius: BorderRadius.circular(14)),
          child: Column(children: [
            MonoLabel(dow, size: 9, color: selected ? p.onAccent : p.muted),
            const SizedBox(height: 4),
            Text(n, style: AzzaFonts.mono(size: 17, color: fg, tracking: 0)),
            const SizedBox(height: 4),
            Container(width: 5, height: 5, decoration: BoxDecoration(shape: BoxShape.circle, color: hasSessions ? fg : Colors.transparent)),
          ]),
        ),
      ),
    );
  }
}
