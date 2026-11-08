import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../domain/lesson_models.dart';

/// "4 of 12 lessons" over a slim bar. Read as one value by screen readers.
class CourseProgressBar extends ConsumerWidget {
  const CourseProgressBar({super.key, required this.progress, this.dense = false});
  final LessonProgress progress;

  /// Smaller label, for cards.
  final bool dense;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final label = f.n(l.progressLessonsOf(progress.completed, progress.total));
    return Semantics(
      label: label,
      value: '${(progress.fraction * 100).round()}%',
      excludeSemantics: true,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          Expanded(child: Text(label, style: (dense ? t.bodySmall : t.titleSmall))),
          if (progress.allDone) Icon(Icons.check_circle_rounded, size: dense ? 16 : 18, color: p.success),
        ]),
        SizedBox(height: dense ? 6 : 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: TweenAnimationBuilder<double>(
            tween: Tween(end: progress.fraction),
            duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : AzzaMotion.quick,
            curve: AzzaMotion.ease,
            builder: (_, v, _) => LinearProgressIndicator(
              key: const Key('course-progress-bar'),
              value: v,
              minHeight: dense ? 4 : 6,
              backgroundColor: p.line,
            ),
          ),
        ),
      ]),
    );
  }
}
