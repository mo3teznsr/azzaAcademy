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

/// A batch's quizzes for its teacher: read-only, with a way into each quiz's results.
/// Quizzes are written and published on the web.
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

    final webNote = SectionCard(
      key: const Key('quizzes-web-note'),
      margin: const EdgeInsets.only(top: 4, bottom: 4),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.laptop_mac_rounded, color: p.muted, size: 20),
        const SizedBox(width: 12),
        Expanded(child: Text(l.quizzesWebOnly, style: t.bodySmall)),
      ]),
    );

    return Scaffold(
      appBar: AppBar(title: Text(l.quizzesTitle)),
      body: AsyncView<List<QuizSummary>>(
        value: quizzes,
        onRetry: () => ref.invalidate(batchQuizzesProvider(batchId)),
        isEmpty: (list) => list.isEmpty,
        empty: ListView(padding: const EdgeInsets.all(AzzaSpace.gutter), children: [
          webNote,
          EmptyState(title: l.noQuizzes, icon: Icons.quiz_outlined),
        ]),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(batchQuizzesProvider(batchId)),
          children: [
            webNote,
            for (final q in list) ...[
              const SizedBox(height: 10),
              RaisedCard(
                key: Key('batch-quiz-${q.id}'),
                onTap: () => context.push(Routes.quizResults(q.id)),
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
                    Text(
                      l.quizStudentsAttempted(f.n(q.studentsAttempted ?? 0), f.n(q.attemptCount ?? 0)),
                      style: t.bodySmall?.copyWith(color: p.muted),
                    ),
                  ],
                ]),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
