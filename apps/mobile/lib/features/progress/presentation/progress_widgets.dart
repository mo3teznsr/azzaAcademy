import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/progress_repository.dart';
import '../domain/progress_models.dart';

/// Title and description of a badge in the reader's language.
(String, String) badgeCopy(AppLocalizations l, String id) => switch (id) {
      'FIRST_LESSON' => (l.badgeFirstLessonTitle, l.badgeFirstLessonBody),
      'FIRST_LIVE_CLASS' => (l.badgeFirstLiveClassTitle, l.badgeFirstLiveClassBody),
      'LESSONS_10' => (l.badgeLessons10Title, l.badgeLessons10Body),
      'PERFECT_QUIZ' => (l.badgePerfectQuizTitle, l.badgePerfectQuizBody),
      'STREAK_7' => (l.badgeStreak7Title, l.badgeStreak7Body),
      'FIRST_CERTIFICATE' => (l.badgeFirstCertificateTitle, l.badgeFirstCertificateBody),
      'LESSONS_50' => (l.badgeLessons50Title, l.badgeLessons50Body),
      _ => (l.badgeStreak30Title, l.badgeStreak30Body),
    };

IconData badgeIcon(String id) => switch (id) {
      'FIRST_LESSON' => Icons.menu_book_outlined,
      'FIRST_LIVE_CLASS' => Icons.sensors_rounded,
      'LESSONS_10' => Icons.layers_outlined,
      'PERFECT_QUIZ' => Icons.task_alt_rounded,
      'STREAK_7' => Icons.event_available_outlined,
      'FIRST_CERTIFICATE' => Icons.workspace_premium_outlined,
      'LESSONS_50' => Icons.local_library_outlined,
      _ => Icons.date_range_outlined,
    };

/// A quiet round mark: tinted when earned, outlined with a small lock while not yet.
class BadgeMark extends StatelessWidget {
  const BadgeMark({super.key, required this.id, required this.earned, this.size = 44});
  final String id;
  final bool earned;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: earned ? p.accent.withValues(alpha: 0.16) : null,
                border: earned ? null : Border.all(color: p.line),
              ),
              child: Icon(badgeIcon(id), size: size * 0.45, color: earned ? p.accent : p.muted),
            ),
            if (!earned)
              PositionedDirectional(
                end: -2,
                bottom: -2,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(shape: BoxShape.circle, color: p.raised, border: Border.all(color: p.line)),
                  child: Icon(Icons.lock_outline_rounded, size: size * 0.24, color: p.muted),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Monday to Sunday: filled for a learning day, outlined for one the weekly freeze covered. Follows the reading direction.
class WeekStrip extends ConsumerWidget {
  const WeekStrip({super.key, required this.progress});
  final LearnerProgress progress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final learned = progress.week.days.toSet();
    final frozen = progress.streak.frozenDays.toSet();
    return Row(
      children: [
        for (final day in progress.week.dates)
          Expanded(
            child: Builder(builder: (context) {
              final isToday = day == progress.today;
              final ahead = day.compareTo(progress.today) > 0;
              final date = dayAsDate(day);
              final state = learned.contains(day)
                  ? 'learned'
                  : frozen.contains(day)
                      ? 'frozen'
                      : (ahead || isToday)
                          ? 'ahead'
                          : 'missed';
              final label = switch (state) {
                'learned' => l.progressDayLearned(f.dayLabel(date)),
                'frozen' => l.progressDayFrozen(f.dayLabel(date)),
                'ahead' => l.progressDayAhead(f.dayLabel(date)),
                _ => l.progressDayMissed(f.dayLabel(date)),
              };
              return Semantics(
                label: label,
                excludeSemantics: true,
                child: Column(
                  children: [
                    Text(
                      f.weekday(date),
                      style: TextStyle(fontSize: 11, color: isToday ? p.text : p.muted, fontWeight: isToday ? FontWeight.w700 : FontWeight.w400),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: switch (state) {
                          'learned' => p.accent,
                          'missed' => p.line.withValues(alpha: 0.6),
                          _ => null,
                        },
                        border: switch (state) {
                          'frozen' => Border.all(color: p.accent.withValues(alpha: 0.6), width: 2),
                          'ahead' => Border.all(color: isToday ? p.text : p.line, width: isToday ? 2 : 1),
                          _ => isToday ? Border.all(color: p.text, width: 2) : null,
                        },
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
      ],
    );
  }
}

/// Goal progress as segments (one per day or lesson); a bar for large targets.
class GoalMeter extends StatelessWidget {
  const GoalMeter({super.key, required this.progress, required this.target, required this.label});
  final int progress;
  final int target;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final done = progress.clamp(0, target);
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: target > 10
          ? ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(value: target == 0 ? 0 : done / target, minHeight: 8, color: p.accent, backgroundColor: p.line.withValues(alpha: 0.6)),
            )
          : Row(
              children: [
                for (var i = 0; i < target; i++) ...[
                  if (i > 0) const SizedBox(width: 4),
                  Expanded(
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(4), color: i < done ? p.accent : p.line.withValues(alpha: 0.6)),
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}

/// Streak number with the hint under it.
class StreakSummary extends ConsumerWidget {
  const StreakSummary({super.key, required this.progress});
  final LearnerProgress progress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final s = progress.streak;
    final hint = s.current == 0
        ? l.progressStartStreak
        : s.todayDone
            ? l.progressTodayDone
            : l.progressTodayPending;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Kicker(l.progressStreak, color: p.muted),
        const SizedBox(height: 6),
        DisplayText(l.progressStreakDays(s.current), size: 30),
        const SizedBox(height: 4),
        Text(hint, style: TextStyle(fontSize: 13, color: p.muted)),
        const SizedBox(height: 2),
        Text(
          [l.progressBest(l.progressStreakDays(s.best)), if (s.current > 0) s.freezeAvailable ? l.progressFreezeAvailable : l.progressFreezeUsed].join(' · '),
          style: TextStyle(fontSize: 12, color: p.muted),
        ),
      ],
    );
  }
}

/// The weekly goal line, meter and change button (or the prompt to set one).
class GoalSummary extends ConsumerWidget {
  const GoalSummary({super.key, required this.progress});
  final LearnerProgress progress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final g = progress.goal;
    if (g == null) {
      return Row(
        children: [
          Expanded(child: Text(l.progressNoGoal, style: TextStyle(fontSize: 13, color: p.muted))),
          const SizedBox(width: 8),
          OutlinedButton(key: const Key('progress-set-goal'), onPressed: () => showGoalSheet(context, null), child: Text(l.progressSetGoal)),
        ],
      );
    }
    final done = f.n(g.progress.clamp(0, g.target));
    final label = g.unit == GoalUnit.days ? l.progressGoalDays(done, f.n(g.target)) : l.progressGoalLessons(done, f.n(g.target));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text('${l.progressGoal} · $label', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
            TextButton(key: const Key('progress-edit-goal'), onPressed: () => showGoalSheet(context, g), child: Text(l.progressEditGoal)),
          ],
        ),
        GoalMeter(progress: g.progress, target: g.target, label: label),
        if (g.met) ...[
          const SizedBox(height: 6),
          Text(l.progressGoalMet, style: TextStyle(fontSize: 12, color: p.muted)),
        ],
      ],
    );
  }
}

Future<void> showGoalSheet(BuildContext context, LearningGoal? goal) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => GoalSheet(goal: goal),
    );

/// Pick the unit (learning days or lessons), the weekly target and the late-week reminder.
class GoalSheet extends ConsumerStatefulWidget {
  const GoalSheet({super.key, this.goal});
  final LearningGoal? goal;

  @override
  ConsumerState<GoalSheet> createState() => _GoalSheetState();
}

class _GoalSheetState extends ConsumerState<GoalSheet> {
  late GoalUnit _unit = widget.goal?.unit ?? GoalUnit.days;
  late int _target = widget.goal?.target ?? 3;
  late bool _reminders = widget.goal?.reminders ?? true;
  bool _busy = false;

  Future<void> _submit({required bool remove}) async {
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      final repo = ref.read(progressRepositoryProvider);
      remove ? await repo.clearGoal() : await repo.setGoal(unit: _unit, target: _target, reminders: _reminders);
      ref.invalidate(myProgressProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      showToast(context, remove ? l.progressRemoved : l.progressSaved);
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final targets = {...goalTargets, _target}.toList()..sort();
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DisplayText(l.progressGoalSheetTitle, size: 24),
            const SizedBox(height: 6),
            Text(l.progressGoalSheetBody, style: TextStyle(color: p.muted)),
            const SizedBox(height: 20),
            Text(l.progressUnitLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            SegmentedButton<GoalUnit>(
              segments: [
                ButtonSegment(value: GoalUnit.days, label: Text(l.progressUnitDays)),
                ButtonSegment(value: GoalUnit.lessons, label: Text(l.progressUnitLessons)),
              ],
              selected: {_unit},
              onSelectionChanged: (s) => setState(() => _unit = s.first),
            ),
            const SizedBox(height: 16),
            Text(l.progressTargetLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final n in targets)
                  ChoiceChip(
                    key: Key('goal-target-$n'),
                    label: Text(f.n(n)),
                    selected: _target == n,
                    onSelected: (_) => setState(() => _target = n),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _reminders,
              onChanged: (v) => setState(() => _reminders = v),
              title: Text(l.progressReminders),
              subtitle: Text(l.progressRemindersHint),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (widget.goal != null)
                  TextButton(onPressed: _busy ? null : () => _submit(remove: true), child: Text(l.progressRemoveGoal)),
                const Spacer(),
                FilledButton(key: const Key('goal-save'), onPressed: _busy ? null : () => _submit(remove: false), child: Text(l.progressSave)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
