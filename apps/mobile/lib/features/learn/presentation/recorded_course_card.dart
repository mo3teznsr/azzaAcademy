import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/lesson_progress_repository.dart';
import '../domain/lesson_models.dart';
import 'progress_widgets.dart';

/// The recorded courses in a learner's `GET /me/learning-progress` (newest data wins; none while loading or on error).
final recordedCoursesProvider = Provider.autoDispose<List<CourseProgress>>(
  (ref) => (ref.watch(learningProgressProvider).value ?? const <CourseProgress>[]).where((c) => c.recorded).toList(),
);

/// A recorded course on Home and in the Library: how far the learner is, and what to open next.
/// When the plan has lapsed the progress stays in view and the one action is "Renew to continue", which opens the course's plans.
class RecordedCourseCard extends ConsumerWidget {
  const RecordedCourseCard({super.key, required this.item});
  final CourseProgress item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final progress = item.progress;
    final next = progress.nextLesson;
    final lapsed = item.lapsed;
    final id = item.courseId;
    void openCourse() => context.push(Routes.course(id));
    void resume() => next == null ? context.push(Routes.courseLessons(id)) : context.push(Routes.lesson(id, next.id));
    return RaisedCard(
      key: Key('recorded-$id'),
      onTap: lapsed ? openCourse : resume,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: lapsed ? p.warningBg : p.successBg, borderRadius: BorderRadius.circular(12)),
            child: Icon(lapsed ? Icons.lock_clock_outlined : Icons.play_circle_outline_rounded, color: lapsed ? p.text : p.success),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Kicker(l.courseTypeRecorded),
              Text(item.title(locale), style: t.titleSmall),
            ]),
          ),
        ]),
        if (progress.total > 0) ...[
          const SizedBox(height: 14),
          CourseProgressBar(progress: progress, dense: true),
        ],
        const SizedBox(height: 10),
        if (lapsed) ...[
          Text(l.planEnded, key: Key('recorded-ended-$id'), style: t.bodyMedium),
          const SizedBox(height: 10),
          FilledButton(
            key: Key('recorded-renew-$id'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            onPressed: openCourse,
            child: Text(l.recordedRenew),
          ),
        ] else if (next != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              key: Key('recorded-resume-$id'),
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
          Row(key: Key('recorded-done-$id'), children: [
            Icon(Icons.check_circle_rounded, size: 18, color: p.success),
            const SizedBox(width: 6),
            Expanded(child: Text(l.progressAllDone, style: t.titleSmall?.copyWith(color: p.success))),
            TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(48, 44)),
              onPressed: () => context.push(Routes.courseLessons(id)),
              child: Text(l.studentOpenLessons),
            ),
          ]),
      ]),
    );
  }
}
