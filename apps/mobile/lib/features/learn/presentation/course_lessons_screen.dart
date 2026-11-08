import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../core/domain/enums.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../subscriptions/presentation/plan_banner.dart';
import '../data/lesson_progress_repository.dart';
import '../data/lessons_repository.dart';
import '../domain/lesson_models.dart';
import 'progress_widgets.dart';

/// A course's reading path: modules, each with its lessons in order.
class CourseLessonsScreen extends ConsumerWidget {
  const CourseLessonsScreen({super.key, required this.courseId});
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final lessons = ref.watch(courseLessonsProvider(courseId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    // Progress is the learner's own: students see checks and the bar; teachers and admins read the path.
    final isStudent = ref.watch(currentRoleProvider) == Role.student;
    final overrides = ref.watch(lessonCompletionProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.lessonsTitle)),
      body: AsyncView<CourseLessons>(
        value: lessons,
        onRetry: () => ref.invalidate(courseLessonsProvider(courseId)),
        isEmpty: (c) => c.lessonCount == 0,
        empty: EmptyState(title: l.noLessons, body: l.noLessonsBody, icon: Icons.menu_book_outlined),
        data: (c) {
          var n = 0;
          final progress = c.progressWith(overrides);
          final next = progress.nextLesson;
          // A recorded course without a plan: titles only, with the way to start one.
          final hasLocked = c.allLessons.any((x) => x.locked);
          return RefreshList(
            onRefresh: () async => ref.invalidate(courseLessonsProvider(courseId)),
            children: [
              Kicker(f.n(l.lessonsCountN(c.lessonCount))),
              const SizedBox(height: 4),
              DisplayText(c.title(locale), size: 28),
              if (isStudent) ...[const SizedBox(height: 12), PlanBanners(courseId: c.courseId)],
              if (hasLocked)
                SectionCard(
                  key: const Key('lessons-locked-banner'),
                  margin: const EdgeInsets.only(top: 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Row(children: [
                      Icon(Icons.lock_outline_rounded, color: p.accent),
                      const SizedBox(width: 10),
                      Expanded(child: Text(l.lessonsLockedTitle, style: t.titleSmall)),
                    ]),
                    const SizedBox(height: 12),
                    FilledButton(
                      key: const Key('lessons-see-plans'),
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                      onPressed: () => context.push(Routes.course(courseId)),
                      child: Text(l.lessonsSeePlans),
                    ),
                  ]),
                )
              else if (isStudent)
                SectionCard(
                  key: const Key('lessons-progress'),
                  margin: const EdgeInsets.only(top: 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    CourseProgressBar(progress: progress),
                    if (next != null) ...[
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        key: const Key('lessons-resume'),
                        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        onPressed: () => context.push(Routes.lesson(courseId, next.id)),
                        icon: const Icon(Icons.play_arrow_rounded, size: 20),
                        label: Text(
                          progress.completed == 0 ? l.progressStart(next.title(locale)) : l.progressResume(next.title(locale)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ] else if (progress.allDone) ...[
                      const SizedBox(height: 6),
                      Text(l.progressAllDoneBody, style: t.bodySmall),
                    ],
                  ]),
                ),
              for (final m in c.modules.where((m) => m.lessons.isNotEmpty))
                CardGroup(
                  title: m.title(locale),
                  children: [
                    if (m.description(locale) case final d?)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                        child: Text(d, style: t.bodySmall),
                      ),
                    for (final lesson in m.lessons)
                      ListTile(
                        key: Key('lesson-${lesson.id}'),
                        minTileHeight: 56,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                        leading: _LessonMarker(number: ++n, done: isStudent && CourseLessons.isDone(lesson, overrides), lessonId: lesson.id),
                        title: Text(lesson.title(locale), style: t.titleSmall),
                        subtitle: lesson.locked || (lesson.videoUrl == null && lesson.attachments.isEmpty)
                            ? null
                            : Text(
                                [
                                  if (lesson.videoUrl != null) l.lessonHasVideo,
                                  if (lesson.attachments.isNotEmpty) f.n(l.lessonAttachmentsN(lesson.attachments.length)),
                                ].join(' · '),
                                style: t.bodySmall,
                              ),
                        trailing: lesson.locked
                            ? Icon(Icons.lock_outline_rounded, key: Key('lesson-locked-${lesson.id}'), semanticLabel: l.lessonLocked, color: p.muted)
                            : Icon(lesson.videoUrl != null ? Icons.play_circle_outline_rounded : Icons.chevron_right_rounded, color: p.muted),
                        onTap: () => context.push(lesson.locked ? Routes.course(courseId) : Routes.lesson(courseId, lesson.id)),
                      ),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }
}

/// The lesson's number, or a check once the student has finished it.
class _LessonMarker extends StatelessWidget {
  const _LessonMarker({required this.number, required this.done, required this.lessonId});
  final int number;
  final bool done;
  final String lessonId;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    // Same footprint either way, so titles stay aligned down the list.
    return SizedBox(
      width: 40,
      child: Center(
        child: !done
            ? Slate(number.toString().padLeft(2, '0'))
            : Semantics(
                label: context.l10n.progressCompleted,
                child: Container(
                  key: Key('lesson-done-$lessonId'),
                  width: 34,
                  height: 24,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: p.successBg, borderRadius: BorderRadius.circular(6)),
                  child: Icon(Icons.check_rounded, color: p.success, size: 16),
                ),
              ),
      ),
    );
  }
}
