import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/quizzes_repository.dart';
import '../domain/quiz_models.dart';
import 'quiz_widgets.dart';

/// One graded attempt: the score, and the right answers once the quiz reveals them
/// (after the due date, or when every attempt is used).
class QuizResultScreen extends ConsumerWidget {
  const QuizResultScreen({super.key, required this.quizId, required this.attemptId});
  final String quizId;
  final String attemptId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final view = ref.watch(quizViewProvider(quizId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.quizResultTitle)),
      body: AsyncView<QuizView>(
        value: view,
        onRetry: () => ref.invalidate(quizViewProvider(quizId)),
        isEmpty: (v) => v.attempt(attemptId) == null,
        empty: EmptyState(title: l.errNotFound),
        data: (v) {
          final a = v.attempt(attemptId)!;
          final graded = a.questions;
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Expanded(
              child: RefreshList(
                onRefresh: () async => ref.invalidate(quizViewProvider(quizId)),
                children: [
                  MonoLabel('${v.quiz.title} · ${l.quizAttemptN(f.n(a.number))}'),
                  SectionCard(
                    key: const Key('quiz-score'),
                    margin: const EdgeInsets.only(top: 12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      MonoLabel(l.quizYourScore, color: p.muted),
                      const SizedBox(height: 4),
                      DisplayText(f.percent(a.percent), size: 44),
                      Text(l.quizPointsOf(fmtPoints(f, a.score), fmtPoints(f, a.maxScore)), style: t.bodyLarge),
                      if (a.submittedAt != null) Text(f.dayTime(a.submittedAt!), style: t.bodySmall),
                      if (a.timedOut) ...[
                        const SizedBox(height: 10),
                        StatusChip(label: l.quizTimedOut, color: p.warningBg, textColor: p.warning),
                      ],
                    ]),
                  ),
                  if (graded == null)
                    SectionCard(
                      key: const Key('answers-hidden'),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Icon(Icons.lock_clock_outlined, color: p.muted),
                        const SizedBox(width: 12),
                        Expanded(child: Text(l.quizAnswersHidden, style: t.bodyMedium)),
                      ]),
                    )
                  else ...[
                    Padding(
                      padding: const EdgeInsetsDirectional.only(start: 4, top: 24, bottom: 4),
                      child: Text(l.quizReviewAnswers, style: t.titleSmall?.copyWith(color: p.muted)),
                    ),
                    for (final (i, q) in v.quiz.questions.indexed) _ReviewCard(index: i, question: q, graded: a.question(q.id), answerKey: v.answerKey?[q.id], locale: locale, f: f),
                  ],
                ],
              ),
            ),
            BottomActionBar(children: [
              OutlinedButton(
                key: const Key('back-to-quiz'),
                onPressed: () => context.canPop() ? context.pop() : context.go(Routes.quiz(quizId)),
                child: Text(l.quizBackToQuiz),
              ),
            ]),
          ]);
        },
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.index, required this.question, required this.graded, required this.answerKey, required this.locale, required this.f});
  final int index;
  final QuizQuestion question;
  final AttemptQuestion? graded;
  final List<String>? answerKey;
  final AppLocale locale;
  final Fmt f;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final g = graded;
    final correctIds = (g?.correctOptionIds.isNotEmpty ?? false) ? g!.correctOptionIds : (answerKey ?? const <String>[]);
    final selected = g?.selected ?? const <String>[];
    final right = g?.correct ?? false;
    final partial = !right && (g?.earned ?? 0) > 0;
    return SectionCard(
      key: Key('review-${question.id}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(child: MonoLabel(l.quizQuestionN(f.n(index + 1)))),
          if (g == null || selected.isEmpty)
            StatusChip(label: l.quizNotAnswered, color: p.muted, look: ChipLook.outline)
          else
            StatusChip(
              label: right ? l.quizCorrect : (partial ? l.quizPartial : l.quizIncorrect),
              color: right ? p.successBg : (partial ? p.warningBg : p.dangerBg),
              textColor: right ? p.success : (partial ? p.warning : p.danger),
            ),
        ]),
        const SizedBox(height: 8),
        Text(question.prompt(locale), style: t.titleMedium),
        const SizedBox(height: 12),
        for (final o in question.options) ...[
          QuizOptionRow(
            text: o.text(locale),
            selected: selected.contains(o.id),
            multiple: question.multiple,
            correct: correctIds.contains(o.id),
          ),
          const SizedBox(height: 8),
        ],
        if (g != null)
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: MonoLabel(l.quizPointsOf(fmtPoints(f, g.earned), fmtPoints(f, g.points)), color: p.muted),
          ),
      ]),
    );
  }
}
