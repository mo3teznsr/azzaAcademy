import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/lessons_repository.dart';
import '../domain/lesson_models.dart';

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

    return Scaffold(
      appBar: AppBar(title: Text(l.lessonsTitle)),
      body: AsyncView<CourseLessons>(
        value: lessons,
        onRetry: () => ref.invalidate(courseLessonsProvider(courseId)),
        isEmpty: (c) => c.lessonCount == 0,
        empty: EmptyState(title: l.noLessons, body: l.noLessonsBody, icon: Icons.menu_book_outlined),
        data: (c) {
          var n = 0;
          return RefreshList(
            onRefresh: () async => ref.invalidate(courseLessonsProvider(courseId)),
            children: [
              MonoLabel(l.lessonsCountN(f.n(c.lessonCount))),
              const SizedBox(height: 4),
              DisplayText(c.title(locale), size: 28),
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
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                        leading: Slate((++n).toString().padLeft(2, '0')),
                        title: Text(lesson.title(locale), style: t.titleSmall),
                        subtitle: lesson.videoUrl == null && lesson.attachments.isEmpty
                            ? null
                            : Text(
                                [
                                  if (lesson.videoUrl != null) l.lessonHasVideo,
                                  if (lesson.attachments.isNotEmpty) l.lessonAttachmentsN(f.n(lesson.attachments.length)),
                                ].join(' · '),
                                style: t.bodySmall,
                              ),
                        trailing: Icon(lesson.videoUrl != null ? Icons.play_circle_outline_rounded : Icons.chevron_right_rounded, color: p.muted),
                        onTap: () => context.push(Routes.lesson(courseId, lesson.id)),
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
