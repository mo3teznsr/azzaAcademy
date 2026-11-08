import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../learn/data/lesson_preview_repository.dart';
import '../../learn/presentation/lesson_screen.dart' show LessonVideoCard, lessonMarkdownStyle;

/// A recorded course's free lesson: anyone can read it, signed in or not. Ends with the way to start the plan.
class PreviewLessonScreen extends ConsumerWidget {
  const PreviewLessonScreen({super.key, required this.lessonId});
  final String lessonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final preview = ref.watch(previewLessonProvider(lessonId));

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<PreviewLesson>(
        value: preview,
        onRetry: () => ref.invalidate(previewLessonProvider(lessonId)),
        data: (p) {
          final lesson = p.lesson;
          final body = lesson.body(locale);
          final video = lesson.videoUrl;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
            children: [
              Kicker(l.planFreeLesson),
              const SizedBox(height: 4),
              DisplayText(lesson.title(locale), size: 28),
              if (video != null) ...[const SizedBox(height: 16), LessonVideoCard(url: video)],
              if (body.trim().isNotEmpty) ...[
                const SizedBox(height: 16),
                MarkdownBody(
                  key: const Key('lesson-body'),
                  data: body,
                  selectable: true,
                  styleSheet: lessonMarkdownStyle(context),
                  onTapLink: (_, href, _) => openExternal(context, href),
                ),
              ],
            ],
          );
        },
      ),
      bottomNavigationBar: preview.hasValue
          ? BottomActionBar(children: [
              FilledButton(
                key: const Key('preview-start'),
                onPressed: () {
                  final course = preview.requireValue.courseId;
                  if (context.canPop()) {
                    context.pop();
                  } else if (course.isNotEmpty) {
                    context.pushReplacement(Routes.course(course));
                  }
                },
                child: Text(l.planStart),
              ),
            ])
          : null,
    );
  }
}
