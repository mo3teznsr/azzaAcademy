import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../learn/data/quizzes_repository.dart';
import '../../learn/domain/quiz_models.dart';
import '../../learn/presentation/quiz_widgets.dart';

/// A class's quizzes for its teacher: write, publish and follow results.
class BatchQuizzesScreen extends ConsumerWidget {
  const BatchQuizzesScreen({super.key, required this.batchId});
  final String batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final quizzes = ref.watch(batchQuizzesProvider(batchId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    Future<void> open(String route) async {
      await context.push(route);
      ref.invalidate(batchQuizzesProvider(batchId));
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.quizzesTitle)),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('new-quiz-fab'),
        onPressed: () => open(Routes.teacherNewQuiz(batchId)),
        icon: const Icon(Icons.add_rounded),
        label: Text(l.teacherNewQuiz),
      ),
      body: AsyncView<List<QuizSummary>>(
        value: quizzes,
        onRetry: () => ref.invalidate(batchQuizzesProvider(batchId)),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(
          title: l.noQuizzes,
          body: l.teacherNoQuizzesBody,
          icon: Icons.quiz_outlined,
          action: l.teacherNewQuiz,
          onAction: () => open(Routes.teacherNewQuiz(batchId)),
        ),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(batchQuizzesProvider(batchId)),
          children: [
            for (final q in list) ...[
              const SizedBox(height: 10),
              RaisedCard(
                key: Key('batch-quiz-${q.id}'),
                onTap: () => open(Routes.teacherEditQuiz(batchId, q.id)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(q.title, style: t.titleMedium)),
                    if (q.draft)
                      StatusChip(label: l.batchDraft, color: p.muted, look: ChipLook.dashed)
                    else
                      StatusChip(label: l.statusPublished, color: p.successBg, textColor: p.success),
                  ]),
                  const SizedBox(height: 4),
                  Text(quizMetaLine(context, f, questionCount: q.questionCount, timeLimitMin: q.timeLimitMin, dueAt: q.dueAt), style: t.bodySmall),
                  if (!q.draft) ...[
                    const SizedBox(height: 6),
                    Row(children: [
                      Expanded(
                        child: Text(
                          f.n(l.quizStudentsAttempted(q.studentsAttempted ?? 0, q.attemptCount ?? 0)),
                          style: t.bodySmall?.copyWith(color: p.muted),
                        ),
                      ),
                      TextButton(
                        key: Key('quiz-results-${q.id}'),
                        style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                        onPressed: () => context.push(Routes.quizResults(q.id)),
                        child: Text(l.teacherQuizResults),
                      ),
                    ]),
                  ],
                ]),
              ),
            ],
            const SizedBox(height: 72), // clear of the FAB
          ],
        ),
      ),
    );
  }
}
