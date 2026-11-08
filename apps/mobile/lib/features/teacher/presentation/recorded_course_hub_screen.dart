import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart' show EarningStatus;
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../learn/data/lessons_repository.dart';
import '../../learn/data/quizzes_repository.dart';
import '../../learn/domain/lesson_models.dart';
import '../../learn/domain/quiz_models.dart';
import '../data/studio_repository.dart';
import '../data/teacher_repository.dart';

/// A teacher's recorded course: how many learners subscribe and what it earned (where the API reports them),
/// the course's quizzes with their pass marks, and which lesson anyone can watch for free.
/// Recorded courses have no classes, so there is nothing to schedule here.
class RecordedCourseHubScreen extends ConsumerWidget {
  const RecordedCourseHubScreen({super.key, required this.courseId});
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final course = ref.watch(courseProvider(courseId));
    return Scaffold(
      appBar: AppBar(title: Text(l.hubTitle)),
      body: AsyncView<Course>(
        value: course,
        onRetry: () => ref.invalidate(courseProvider(courseId)),
        data: (c) => RefreshList(
          onRefresh: () async {
            ref
              ..invalidate(courseProvider(courseId))
              ..invalidate(courseQuizzesProvider(courseId))
              ..invalidate(courseLessonsProvider(courseId))
              ..invalidate(earningsProvider);
          },
          children: [
            _Header(course: c),
            _SubscribersAndEarnings(course: c),
            _CourseQuizzes(courseId: courseId),
            _PreviewLesson(course: c),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('hub-edit'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: () async {
                await context.push(Routes.teacherCourse(courseId));
                ref.invalidate(courseProvider(courseId));
              },
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: Text(l.hubEditDetails),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.course});
  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Kicker(l.courseTypeRecorded),
        const SizedBox(height: 4),
        DisplayText(course.title(locale), size: 28),
        const SizedBox(height: 8),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: StatusChip.course(context, course.status),
        ),
      ],
    );
  }
}

class _SubscribersAndEarnings extends ConsumerWidget {
  const _SubscribersAndEarnings({required this.course});
  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final earnings = ref.watch(earningsProvider).value;
    // The per-course totals are the source; the ledger is the fallback for an older API.
    final byCourse = earnings?.courses.where((c) => c.courseId == course.id).firstOrNull;
    final fromLedger = earnings?.ledger
        .where((e) => e.kind == 'SUBSCRIPTION' && e.courseId == course.id && e.status != EarningStatus.reversed)
        .toList();
    final total = byCourse?.amountFils ?? ((fromLedger?.isEmpty ?? true) ? null : fromLedger!.fold<int>(0, (a, e) => a + e.amountFils));
    final subs = ref.watch(courseSubscribersProvider(course.id));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(
          key: const Key('hub-subscribers'),
          title: l.hubSubscribers,
          child: subs.when(
            loading: () => const SizedBox(height: 28, child: Align(alignment: AlignmentDirectional.centerStart, child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))),
            error: (_, _) => Text(l.hubSubscribersUnavailable, style: t.bodySmall),
            data: (s) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(f.n(s.total), key: const Key('hub-subscribers-total'), style: t.headlineSmall),
                if (s.total > 0) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 16,
                    runSpacing: 4,
                    children: [
                      Text('${l.planActiveChip} ${f.n(s.active)}', key: const Key('hub-subscribers-active'), style: t.bodySmall),
                      Text('${l.planCancellingChip} ${f.n(s.cancelling)}', key: const Key('hub-subscribers-cancelling'), style: t.bodySmall),
                      Text('${l.planPastDueChip} ${f.n(s.pastDue)}', key: const Key('hub-subscribers-pastdue'), style: t.bodySmall),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
        SectionCard(
          key: const Key('hub-earnings'),
          title: l.hubEarnings,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                total == null ? l.hubEarningsUnknown : f.aed(total),
                style: total == null ? t.bodySmall : t.headlineSmall,
              ),
              if (total != null) ...[
                const SizedBox(height: 4),
                Text(l.hubEarningsNote, style: t.bodySmall),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _CourseQuizzes extends ConsumerWidget {
  const _CourseQuizzes({required this.courseId});
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final quizzes = ref.watch(courseQuizzesProvider(courseId));
    Future<void> open(String route) async {
      await context.push(route);
      ref.invalidate(courseQuizzesProvider(courseId));
    }

    return SectionCard(
      key: const Key('hub-quizzes'),
      title: l.hubQuizzes,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AsyncView<List<QuizSummary>>(
            value: quizzes,
            compact: true,
            onRetry: () => ref.invalidate(courseQuizzesProvider(courseId)),
            isEmpty: (list) => list.isEmpty,
            empty: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(l.hubNoQuizzes, style: t.bodySmall),
            ),
            data: (list) => Column(
              children: [
                for (final q in list)
                  Material(
                    type: MaterialType.transparency,
                    child: ListTile(
                      key: Key('hub-quiz-${q.id}'),
                      minTileHeight: 56,
                      contentPadding: EdgeInsets.zero,
                      title: Text(q.title, style: t.titleSmall),
                      subtitle: Text(
                        [
                          l.hubPassMark(f.n(q.passPercent)),
                          if (q.draft) l.batchDraft,
                        ].join(' · '),
                        key: Key('hub-pass-${q.id}'),
                        style: t.bodySmall,
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () =>
                          open(Routes.teacherCourseQuizEdit(courseId, q.id)),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            key: const Key('hub-add-quiz'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
            onPressed: () => open(Routes.teacherCourseQuizNew(courseId)),
            icon: const Icon(Icons.add_rounded, size: 18),
            label: Text(l.hubAddQuiz),
          ),
        ],
      ),
    );
  }
}

class _PreviewLesson extends ConsumerStatefulWidget {
  const _PreviewLesson({required this.course});
  final Course course;

  @override
  ConsumerState<_PreviewLesson> createState() => _PreviewLessonState();
}

class _PreviewLessonState extends ConsumerState<_PreviewLesson> {
  late String? _selected = widget.course.previewLessonId;
  bool _busy = false;

  Future<void> _choose(CourseLessons lessons) async {
    final l = context.l10n;
    final locale = ref.read(localeProvider);
    // A dismissed sheet returns null and changes nothing; choosing "no preview" returns a record holding null.
    final choice = await showModalBottomSheet<({String? id})>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.7,
          ),
          child: ListView(
            shrinkWrap: true,
            children: [
              ListTile(
                key: const Key('preview-none'),
                minTileHeight: 56,
                title: Text(l.hubPreviewNone),
                trailing: _selected == null
                    ? const Icon(Icons.check_rounded)
                    : null,
                onTap: () => Navigator.pop(context, (id: null)),
              ),
              for (final x in lessons.allLessons)
                ListTile(
                  key: Key('preview-${x.id}'),
                  minTileHeight: 56,
                  title: Text(x.title(locale)),
                  trailing: _selected == x.id
                      ? const Icon(Icons.check_rounded)
                      : null,
                  onTap: () => Navigator.pop(context, (id: x.id)),
                ),
            ],
          ),
        ),
      ),
    );
    if (!mounted || choice == null || choice.id == _selected) return;
    final picked = choice.id;
    setState(() => _busy = true);
    try {
      await ref
          .read(teacherStudioRepositoryProvider)
          .setPreviewLesson(widget.course.id, picked);
      if (!mounted) return;
      setState(() => _selected = picked);
      ref.invalidate(courseProvider(widget.course.id));
      showToast(context, l.hubPreviewSaved);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final lessons = ref.watch(courseLessonsProvider(widget.course.id));
    final all = lessons.value;
    final current = all?.lesson(_selected ?? '');
    return SectionCard(
      key: const Key('hub-preview'),
      title: l.hubPreview,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.hubPreviewBody, style: t.bodySmall),
          const SizedBox(height: 8),
          if (all != null && all.lessonCount == 0)
            Text(
              l.hubNoLessons,
              key: const Key('hub-no-lessons'),
              style: t.bodySmall,
            )
          else
            OutlinedButton.icon(
              key: const Key('hub-pick-preview'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: all == null || _busy ? null : () => _choose(all),
              icon: const Icon(Icons.play_circle_outline_rounded, size: 18),
              label: Text(
                current?.title(locale) ?? l.hubPreviewNone,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
        ],
      ),
    );
  }
}
