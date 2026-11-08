import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/quizzes_repository.dart';
import '../domain/quiz_models.dart';
import 'quiz_widgets.dart';

/// Every published quiz across the student's batches: what's still to do, then what's done.
class MyQuizzesScreen extends ConsumerWidget {
  const MyQuizzesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final quizzes = ref.watch(myQuizzesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.myQuizzesTitle)),
      body: AsyncView<List<QuizSummary>>(
        value: quizzes,
        onRetry: () => ref.invalidate(myQuizzesProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.noQuizzes, body: l.noQuizzesBody, icon: Icons.quiz_outlined),
        data: (list) {
          bool todo(QuizSummary q) => (q.mine?.canStart ?? false) || q.mine?.status == QuizStatus.inProgress;
          final open = list.where(todo).toList()
            ..sort((a, b) => (a.dueAt ?? DateTime(9999)).compareTo(b.dueAt ?? DateTime(9999)));
          final done = list.where((q) => !todo(q)).toList();
          return RefreshList(
            onRefresh: () async => ref.invalidate(myQuizzesProvider),
            children: [
              if (open.isNotEmpty) ...[
                SectionHeader(l.quizzesToDo, padding: const EdgeInsets.only(top: 8, bottom: 12)),
                for (final q in open) ...[QuizSummaryCard(quiz: q), const SizedBox(height: 10)],
              ],
              if (done.isNotEmpty) ...[
                SectionHeader(l.quizzesDone, padding: EdgeInsets.only(top: open.isEmpty ? 8 : 20, bottom: 12)),
                for (final q in done) ...[QuizSummaryCard(quiz: q), const SizedBox(height: 10)],
              ],
            ],
          );
        },
      ),
    );
  }
}

class QuizSummaryCard extends ConsumerWidget {
  const QuizSummaryCard({super.key, required this.quiz});
  final QuizSummary quiz;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final q = quiz;
    final mine = q.mine;
    return RaisedCard(
      key: Key('quiz-${q.id}'),
      onTap: () => context.push(Routes.quiz(q.id)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Kicker([if (q.courseTitleEn.isNotEmpty) q.courseTitle(locale), if (q.batchCode.isNotEmpty) q.batchCode].join(' · ')),
          ),
          if (mine != null) QuizStatusChip(progress: mine),
        ]),
        const SizedBox(height: 8),
        Text(q.title, style: t.titleMedium),
        const SizedBox(height: 4),
        Text(quizMetaLine(context, f, questionCount: q.questionCount, timeLimitMin: q.timeLimitMin, dueAt: q.dueAt), style: t.bodySmall),
        if (mine != null && (mine.bestPercent != null || mine.attemptsUsed > 0)) ...[
          const SizedBox(height: 8),
          Text(
            [
              if (mine.bestPercent != null) l.quizBest(f.percent(mine.bestPercent!)),
              l.quizAttemptsUsed(f.n(mine.attemptsUsed), f.n(q.maxAttempts)),
            ].join(' · '),
            style: t.bodySmall,
          ),
        ],
      ]),
    );
  }
}
