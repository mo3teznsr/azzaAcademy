import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../learn/data/quizzes_repository.dart';
import '../../learn/domain/quiz_models.dart';
import '../../learn/presentation/quiz_widgets.dart';

/// A quiz's results for the batch teacher: each student's best score and attempts,
/// and how often each question was answered correctly. Read-only.
class QuizResultsScreen extends ConsumerWidget {
  const QuizResultsScreen({super.key, required this.quizId});
  final String quizId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final results = ref.watch(quizResultsProvider(quizId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.quizResultsTitle)),
      body: AsyncView<QuizResults>(
        value: results,
        onRetry: () => ref.invalidate(quizResultsProvider(quizId)),
        data: (r) {
          final rows = [...r.rows]..sort((a, b) => (b.bestPercent ?? -1).compareTo(a.bestPercent ?? -1));
          return RefreshList(
            onRefresh: () async => ref.invalidate(quizResultsProvider(quizId)),
            children: [
              Kicker(quizMetaLine(context, f, questionCount: r.quiz.questionCount, timeLimitMin: r.quiz.timeLimitMin, dueAt: r.quiz.dueAt)),
              const SizedBox(height: 4),
              DisplayText(r.quiz.title, size: 28),
              SectionCard(
                key: const Key('quiz-summary'),
                margin: const EdgeInsets.only(top: 16),
                child: Row(children: [
                  _Metric(label: l.studentsLabel, value: f.n(r.students)),
                  _Metric(label: l.quizSubmitted, value: f.n(r.submitted)),
                  _Metric(label: l.quizAverage, value: r.averagePercent == null ? '—' : f.percent(r.averagePercent!)),
                ]),
              ),
              CardGroup(title: l.studentsLabel, children: [
                if (rows.isEmpty)
                  Padding(padding: const EdgeInsets.all(16), child: Text(l.noStudents, style: t.bodySmall))
                else
                  for (final s in rows)
                    ListTile(
                      key: Key('result-${s.userId}'),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                      leading: InitialsAvatar(s.name, size: 40, imageUrl: s.image),
                      title: Text(s.name, style: t.titleSmall),
                      subtitle: Text(
                        [
                          s.attempts == 0 ? l.quizNoAttemptsYet : f.n(l.quizAttemptsN(s.attempts)),
                          if (s.lastSubmittedAt != null) f.shortDate(s.lastSubmittedAt!),
                        ].join(' · '),
                        style: t.bodySmall,
                      ),
                      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(s.bestPercent == null ? '—' : f.percent(s.bestPercent!), style: t.titleSmall),
                        if (s.bestScore != null) Kicker(l.scoreOf(fmtPoints(f, s.bestScore!), fmtPoints(f, r.quiz.totalPoints)), color: p.muted),
                      ]),
                    ),
              ]),
              if (r.questions.isNotEmpty)
                CardGroup(title: l.quizPerQuestion, children: [
                  for (final (i, q) in r.questions.indexed)
                    Padding(
                      key: Key('question-stat-${q.questionId}'),
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Expanded(child: Text('${f.n(i + 1)}. ${q.prompt(locale)}', style: t.bodyMedium)),
                          const SizedBox(width: 12),
                          Text(q.rate == null ? '—' : f.percent(q.rate! * 100), style: t.titleSmall),
                        ]),
                        const SizedBox(height: 8),
                        LinearProgressIndicator(
                          value: q.rate ?? 0,
                          minHeight: 6,
                          borderRadius: BorderRadius.circular(3),
                          backgroundColor: p.line,
                          color: (q.rate ?? 1) < 0.5 ? p.danger : p.success,
                        ),
                        const SizedBox(height: 6),
                        Kicker(l.quizCorrectOfAnswered(f.n(q.correct), f.n(q.answered)), color: p.muted),
                      ]),
                    ),
                ]),
            ],
          );
        },
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Kicker(label),
          const SizedBox(height: 2),
          DisplayText(value, size: 22),
        ]),
      );
}
