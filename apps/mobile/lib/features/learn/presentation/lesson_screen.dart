import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/providers.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/lessons_repository.dart';
import '../domain/lesson_models.dart';

/// One lesson: its video, the markdown text and the attachments, with previous / next.
class LessonScreen extends ConsumerWidget {
  const LessonScreen({super.key, required this.courseId, required this.lessonId});
  final String courseId;
  final String lessonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final lessons = ref.watch(courseLessonsProvider(courseId));
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<CourseLessons>(
        value: lessons,
        onRetry: () => ref.invalidate(courseLessonsProvider(courseId)),
        isEmpty: (c) => c.lesson(lessonId) == null,
        empty: EmptyState(title: l.errNotFound, icon: Icons.menu_book_outlined),
        data: (c) {
          final all = c.allLessons;
          final i = all.indexWhere((x) => x.id == lessonId);
          final lesson = all[i];
          final module = c.modules.where((m) => m.id == lesson.moduleId).firstOrNull;
          final prev = i > 0 ? all[i - 1] : null;
          final next = i < all.length - 1 ? all[i + 1] : null;
          final body = lesson.body(locale);
          final video = lesson.videoUrl;
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
                children: [
                  MonoLabel([if (module != null) module.title(locale), l.lessonNofM('${i + 1}', '${all.length}')].join(' · ')),
                  const SizedBox(height: 4),
                  DisplayText(lesson.title(locale), size: 28),
                  if (video != null) ...[
                    const SizedBox(height: 16),
                    LessonVideoCard(url: video),
                  ],
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
                  if (lesson.attachments.isNotEmpty)
                    CardGroup(title: l.lessonAttachments, children: [
                      for (final a in lesson.attachments)
                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                          leading: const Icon(Icons.attach_file_rounded),
                          title: Text(a.title.isEmpty ? a.url : a.title, style: t.titleSmall),
                          trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                          onTap: () => openExternal(context, ref.read(appConfigProvider).resolveMediaUrl(a.url)),
                        ),
                    ]),
                ],
              ),
            ),
            if (prev != null || next != null)
              BottomActionBar(children: [
                Row(children: [
                  if (prev != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        key: const Key('lesson-prev'),
                        onPressed: () => context.pushReplacement(Routes.lesson(courseId, prev.id)),
                        icon: const Icon(Icons.arrow_back_rounded, size: 18),
                        label: Text(l.previousLesson),
                      ),
                    ),
                  if (prev != null && next != null) const SizedBox(width: 12),
                  if (next != null)
                    Expanded(
                      child: FilledButton.icon(
                        key: const Key('lesson-next'),
                        onPressed: () => context.pushReplacement(Routes.lesson(courseId, next.id)),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        label: Text(l.nextLesson),
                      ),
                    ),
                ]),
              ]),
          ]);
        },
      ),
    );
  }
}

/// Markdown in the app's type: body text at the theme's body size, headings in the title styles.
MarkdownStyleSheet lessonMarkdownStyle(BuildContext context) {
  final theme = Theme.of(context);
  final p = AzzaPalette.of(context);
  final t = theme.textTheme;
  return MarkdownStyleSheet.fromTheme(theme).copyWith(
    p: t.bodyLarge,
    h1: t.headlineSmall,
    h2: t.titleLarge,
    h3: t.titleMedium,
    a: t.bodyLarge?.copyWith(color: p.success, decoration: TextDecoration.underline, decorationColor: AzzaColors.green),
    blockquoteDecoration: BoxDecoration(
      color: p.successBg,
      borderRadius: BorderRadius.circular(8),
    ),
    code: AzzaFonts.mono(size: 13, color: p.text),
    codeblockDecoration: BoxDecoration(color: p.ground, borderRadius: BorderRadius.circular(8), border: Border.all(color: p.line)),
    blockSpacing: 12,
  );
}

/// The lesson's video. Uploaded files and https video links open in the system player;
/// YouTube and Vimeo open in their app or the browser (same as the course intro video).
class LessonVideoCard extends ConsumerWidget {
  const LessonVideoCard({super.key, required this.url});
  final String url;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final source = CourseVideoSource.parse(url);
    final target = ref.read(appConfigProvider).resolveMediaUrl(source?.url ?? url);
    final hint = switch (source?.kind) {
      CourseVideoKind.youtube => l.videoOnYoutube,
      CourseVideoKind.vimeo => l.videoOnVimeo,
      _ => l.watchLessonVideoHint,
    };
    return RaisedCard(
      key: const Key('lesson-video'),
      onTap: () => openExternal(context, target),
      child: Row(children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(color: p.accent, shape: BoxShape.circle),
          child: Icon(Icons.play_arrow_rounded, color: p.onAccent, size: 30),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.watchLessonVideo, style: t.titleSmall),
            Text(hint, style: t.bodySmall),
          ]),
        ),
        Icon(Icons.open_in_new_rounded, color: p.muted, size: 20),
      ]),
    );
  }
}
