import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import 'proposal_widgets.dart';

/// Batches the API scopes to the signed-in teacher (`GET /batches` → own).
final teacherBatchesProvider = FutureProvider.autoDispose<List<Batch>>((ref) {
  final me = ref.watch(currentUserProvider);
  return ref.watch(catalogRepositoryProvider).batches(teacherId: me?.id);
});

class TeacherBatchesScreen extends ConsumerWidget {
  const TeacherBatchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final batches = ref.watch(teacherBatchesProvider);
    final now = DateTime.now();
    return Scaffold(
      appBar: AppBar(title: Text(l.navBatches), actions: [
        TextButton.icon(
          key: const Key('my-courses'),
          style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
          onPressed: () => context.push(Routes.teacherCourses),
          icon: const Icon(Icons.auto_stories_outlined, size: 20),
          label: Text(l.myCoursesTitle),
        ),
        const SizedBox(width: 8),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('new-batch-fab'),
        onPressed: () async {
          await context.push(Routes.teacherNewBatch);
          ref.invalidate(teacherBatchesProvider);
        },
        icon: const Icon(Icons.add_rounded),
        label: Text(l.newBatch),
      ),
      body: AsyncView<List<Batch>>(
        value: batches,
        onRetry: () => ref.invalidate(teacherBatchesProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.noTeacherBatches),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(teacherBatchesProvider),
          children: [
            for (final b in list) ...[
              RaisedCard(
                onTap: () => context.push(Routes.roster(b.id)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Slate(b.code),
                    const SizedBox(width: 8),
                    Expanded(child: Text(b.course?.title(locale) ?? '', style: Theme.of(context).textTheme.titleSmall)),
                    StatusChip.batch(context, b.status, taken: b.seatsTaken, capacity: b.capacity),
                  ]),
                  if (b.status == BatchStatus.draft && (b.reviewNote?.isNotEmpty ?? false)) ...[
                    const SizedBox(height: 10),
                    ProposalNotice.changes(context, b.reviewNote!, key: Key('batch-review-note-${b.id}')),
                  ],
                  const SizedBox(height: 8),
                  Text(scheduleLabel(f, b.schedule), style: Theme.of(context).textTheme.bodyMedium),
                  Text(
                    [
                      '${l.enrolledLabel} ${f.n(b.seatsTaken)}/${f.n(b.capacity)}',
                      // `GET /batches` items carry no sessions[]; progress shows on the batch detail.
                      if (b.sessions.isNotEmpty) '${l.doneLabel} ${f.n(b.sessionsDone(now))}/${f.n(b.sessionCount)}',
                    ].join(' · '),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ]),
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 72), // clear of the FAB
          ],
        ),
      ),
    );
  }
}
