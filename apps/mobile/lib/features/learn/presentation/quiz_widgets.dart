import 'package:flutter/material.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../domain/quiz_models.dart';

/// Points can be fractional (partial credit on "choose all"): `3`, `2.5`, `1.33`.
String fmtPoints(Fmt f, double v) {
  final rounded = (v * 100).round() / 100;
  final s = rounded == rounded.roundToDouble() ? rounded.round().toString() : rounded.toStringAsFixed(2).replaceFirst(RegExp(r'0$'), '');
  return f.n(s);
}

/// `10 questions · 15 min · Due Tue Nov 24 · 19:00`
String quizMetaLine(BuildContext context, Fmt f, {required int questionCount, int? timeLimitMin, DateTime? dueAt}) {
  final l = context.l10n;
  return [
    l.quizQuestionsN(f.n(questionCount)),
    if (timeLimitMin != null && timeLimitMin > 0) l.quizMinutesN(f.n(timeLimitMin)),
    if (dueAt != null) l.dueAt(f.dayTime(dueAt)),
  ].join(' · ');
}

/// The student's standing on a quiz as a chip.
class QuizStatusChip extends StatelessWidget {
  const QuizStatusChip({super.key, required this.progress});
  final QuizProgress progress;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return switch (progress.status) {
      QuizStatus.inProgress => StatusChip(label: l.quizInProgress, color: AzzaColors.green, textColor: AzzaColors.inkDeep),
      QuizStatus.submitted => StatusChip(label: l.quizSubmitted, color: p.successBg, textColor: p.success),
      QuizStatus.missed => StatusChip(label: l.quizMissed, color: p.dangerBg, textColor: p.danger),
      QuizStatus.open => StatusChip(label: l.quizOpen, color: p.infoBg, textColor: p.info),
    };
  }
}

/// One answer choice: radio for single / true-false, checkbox for "choose all".
/// When [correct] is set (review mode) the row marks right and wrong picks.
class QuizOptionRow extends StatelessWidget {
  const QuizOptionRow({super.key, required this.text, required this.selected, required this.multiple, this.onTap, this.correct});
  final String text;
  final bool selected;
  final bool multiple;
  final VoidCallback? onTap;

  /// Review mode: whether this option is a correct answer.
  final bool? correct;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final review = correct != null;
    final (Color border, IconData icon, Color iconColor) = switch ((review, correct ?? false, selected)) {
      (true, true, _) => (p.success, Icons.check_circle_rounded, p.success),
      (true, false, true) => (p.danger, Icons.cancel_rounded, p.danger),
      (true, false, false) => (p.line, multiple ? Icons.check_box_outline_blank_rounded : Icons.radio_button_unchecked, p.muted),
      (false, _, true) => (p.accent, multiple ? Icons.check_box_rounded : Icons.radio_button_checked, p.accent),
      (false, _, false) => (p.line, multiple ? Icons.check_box_outline_blank_rounded : Icons.radio_button_unchecked, p.muted),
    };
    return Semantics(
      selected: selected,
      button: onTap != null,
      inMutuallyExclusiveGroup: !multiple,
      child: Material(
        color: p.raised,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: border, width: selected || (correct ?? false) ? 1.6 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 52),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(children: [
                Icon(icon, color: iconColor, size: 22),
                const SizedBox(width: 12),
                Expanded(child: Text(text, style: t.bodyLarge)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
