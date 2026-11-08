import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/guest_gate.dart';
import '../../me/data/me_repository.dart';
import '../../me/domain/me_models.dart';
import '../data/learn_repository.dart';
import '../data/lesson_progress_repository.dart' show learningProgressProvider;
import '../domain/lesson_models.dart' show CourseProgress;
import 'recorded_course_card.dart';

/// Library: every take per batch with watch progress, plus materials.
class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  String? _batchId;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    if (ref.watch(isGuestProvider)) {
      return GuestTab(heading: l.libraryTitle, title: l.guestLibraryTitle, body: l.guestLibraryBody, icon: Icons.video_library_outlined);
    }
    final enrollments = ref.watch(enrollmentsProvider);
    final locale = ref.watch(localeProvider);
    final p = AzzaPalette.of(context);
    final recorded = ref.watch(recordedCoursesProvider);
    final progressLoading = ref.watch(learningProgressProvider).isLoading;

    return Scaffold(
      appBar: AppBar(
        title: Text(l.libraryTitle),
        actions: [
          TextButton.icon(
            onPressed: () => context.push(Uri(path: Routes.assignments, queryParameters: {'batchId': ?_batchId}).toString()),
            icon: const Icon(Icons.assignment_outlined),
            label: Text(l.assignments),
          ),
        ],
      ),
      body: AsyncView<List<Enrollment>>(
        value: enrollments,
        onRetry: () => ref.invalidate(enrollmentsProvider),
        isEmpty: (list) => list.where((e) => e.isActive).isEmpty && recorded.isEmpty && !progressLoading,
        empty: EmptyState(title: l.libraryEmptyTitle, body: l.enrollFirst, action: l.exploreCta, onAction: () => context.go(Routes.studentExplore)),
        data: (list) {
          final active = list.where((e) => e.isActive).toList();
          if (active.isEmpty && recorded.isEmpty && progressLoading) return const LoadingState(key: Key('library-progress-loading'));
          // Recorded courses only: no classes, no recordings, just the courses to keep learning.
          if (active.isEmpty) {
            return RefreshList(
              onRefresh: () async => ref.invalidate(learningProgressProvider),
              children: [
                SectionHeader(l.recordedCourses),
                for (final c in recorded) ...[RecordedCourseCard(item: c), const SizedBox(height: 10)],
              ],
            );
          }
          final batchId = _batchId ?? active.first.batch.id;
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SizedBox(
              height: context.scaled(44),
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: AzzaSpace.gutter),
                scrollDirection: Axis.horizontal,
                children: [
                  for (final e in active)
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 8),
                      child: ChoiceChip(
                        label: Text('${e.batch.course?.title(locale) ?? ''} · ${e.batch.code}'),
                        selected: e.batch.id == batchId,
                        showCheckmark: false,
                        labelStyle: TextStyle(color: e.batch.id == batchId ? p.onAccent : p.text),
                        onSelected: (_) => setState(() => _batchId = e.batch.id),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(child: _BatchLibrary(recorded: recorded, batchId: batchId, courseId: active.where((e) => e.batch.id == batchId).firstOrNull?.batch.courseId ?? active.first.batch.courseId)),
          ]);
        },
      ),
    );
  }
}

class _BatchLibrary extends ConsumerWidget {
  const _BatchLibrary({required this.recorded, required this.batchId, required this.courseId});
  final List<CourseProgress> recorded;
  final String batchId;
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final recordings = ref.watch(recordingsProvider);
    final materials = ref.watch(materialsProvider(batchId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return RefreshList(
      onRefresh: () async {
        ref.invalidate(recordingsProvider);
        ref.invalidate(materialsProvider(batchId));
      },
      children: [
        if (recorded.isNotEmpty) ...[
          SectionHeader(l.recordedCourses),
          for (final c in recorded) ...[RecordedCourseCard(item: c), const SizedBox(height: 10)],
        ],
        Row(children: [
          Expanded(
            child: _StudyTile(
              key: const Key('library-lessons'),
              icon: Icons.menu_book_outlined,
              label: l.lessonsTitle,
              onTap: () => context.push(Routes.courseLessons(courseId)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _StudyTile(
              key: const Key('library-quizzes'),
              icon: Icons.quiz_outlined,
              label: l.myQuizzesTitle,
              onTap: () => context.push(Routes.myQuizzes),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        AsyncView<List<Recording>>(
          value: recordings,
          compact: true,
          onRetry: () => ref.invalidate(recordingsProvider),
          isEmpty: (all) => all.where((r) => r.batchId == batchId).isEmpty,
          empty: EmptyState(title: l.noRecordings, icon: Icons.videocam_off_outlined),
          data: (all) {
            final list = all.where((r) => r.batchId == batchId).toList()..sort((a, b) => b.number.compareTo(a.number));
            final resume = list.where((r) => r.progress > 0 && r.progress < 0.98).firstOrNull;
            return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (resume != null) ...[
                RaisedCard(
                  onTap: () => openExternal(context, resume.url),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Kicker(
                      'S${resume.number.toString().padLeft(2, '0')} · ${l.continueAt('${Fmt.timecode(Duration(seconds: resume.progressSec ?? 0))} / ${Fmt.timecode(Duration(seconds: resume.durationSec ?? 0))}')}',
                      color: p.accent,
                    ),
                    const SizedBox(height: 8),
                    DisplayText(resume.title, size: 24),
                    const SizedBox(height: 10),
                    LinearProgressIndicator(value: resume.progress, minHeight: 4, borderRadius: BorderRadius.circular(2)),
                  ]),
                ),
                const SizedBox(height: 8),
              ],
              CardGroup(title: l.allRecordingsN(f.n(list.length)), children: [
                for (final r in list)
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    leading: Slate('S${r.number.toString().padLeft(2, '0')}'),
                    title: Text(r.title, style: t.titleSmall),
                    subtitle: Text(
                      [
                        if (r.recordedAt != null) f.shortDate(r.recordedAt!),
                        if (r.durationSec != null) '${f.n((r.durationSec! / 60).round())} min',
                        if (r.url == null) l.recordingProcessing,
                      ].join(' · '),
                    ),
                    trailing: Icon(r.url == null ? Icons.hourglass_top_rounded : Icons.play_circle_outline_rounded),
                    onTap: r.url == null ? null : () => openExternal(context, r.url),
                  ),
              ]),
            ]);
          },
        ),
        AsyncView(
          value: materials,
          compact: true,
          onRetry: () => ref.invalidate(materialsProvider(batchId)),
          isEmpty: (List<CourseMaterial> list) => list.isEmpty,
          empty: SectionCard(title: l.materials, margin: const EdgeInsets.only(top: 24), child: Text(l.noMaterials, style: t.bodySmall)),
          data: (List<CourseMaterial> list) => CardGroup(title: l.materials, children: [
            for (final m in list)
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                leading: Slate(m.kind),
                title: Text(m.title, style: t.titleSmall),
                trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                onTap: () => openExternal(context, m.url),
              ),
          ]),
        ),
      ],
    );
  }
}

/// A shortcut into the course's lessons or the student's quizzes.
class _StudyTile extends StatelessWidget {
  const _StudyTile({super.key, required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return RaisedCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      child: Row(children: [
        Icon(icon, color: p.success, size: 22),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: Theme.of(context).textTheme.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis)),
        Icon(Icons.chevron_right_rounded, color: p.muted, size: 20),
      ]),
    );
  }
}
