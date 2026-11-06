import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/quizzes_repository.dart';
import '../domain/quiz_models.dart';
import 'quiz_widgets.dart';

/// A quiz before (and between) attempts: the rules, the student's best score, past attempts and Start.
class QuizScreen extends ConsumerWidget {
  const QuizScreen({super.key, required this.quizId});
  final String quizId;

  Future<void> _start(BuildContext context, WidgetRef ref, QuizView v) async {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    if (v.openAttempt == null && v.quiz.timed) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l.quizStartTimedTitle),
          content: Text(l.quizStartTimedBody(f.n(v.quiz.timeLimitMin!))),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
            FilledButton(key: const Key('quiz-start-confirm'), onPressed: () => Navigator.pop(ctx, true), child: Text(l.quizStart)),
          ],
        ),
      );
      if (ok != true || !context.mounted) return;
    }
    await context.push(Routes.quizTake(quizId));
    ref
      ..invalidate(quizViewProvider(quizId))
      ..invalidate(myQuizzesProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final view = ref.watch(quizViewProvider(quizId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<QuizView>(
        value: view,
        onRetry: () => ref.invalidate(quizViewProvider(quizId)),
        data: (v) {
          final q = v.quiz;
          final pr = v.progress;
          final closed = q.dueAt != null && q.dueAt!.isBefore(DateTime.now());
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Expanded(
              child: RefreshList(
                onRefresh: () async => ref.invalidate(quizViewProvider(quizId)),
                children: [
                  Row(children: [
                    Expanded(child: MonoLabel(l.quizLabel)),
                    QuizStatusChip(progress: pr),
                  ]),
                  const SizedBox(height: 6),
                  DisplayText(q.title, size: 28),
                  if (q.description.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(q.description, style: t.bodyMedium),
                  ],
                  SectionCard(
                    margin: const EdgeInsets.only(top: 16),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Column(children: [
                      KeyValueRow(l.quizQuestionsLabel, f.n(q.questionCount)),
                      KeyValueRow(l.quizPointsLabel, fmtPoints(f, q.totalPoints)),
                      KeyValueRow(l.quizTimeLimitLabel, q.timed ? l.quizMinutesN(f.n(q.timeLimitMin!)) : l.quizNoTimeLimit),
                      KeyValueRow(l.quizAttemptsLabel, l.scoreOf(f.n(pr.attemptsUsed), f.n(q.maxAttempts))),
                      if (q.dueAt != null) KeyValueRow(l.quizDueLabel, f.dayTime(q.dueAt!), valueColor: closed ? p.danger : null),
                    ]),
                  ),
                  if (pr.bestPercent != null)
                    SectionCard(
                      key: const Key('quiz-best'),
                      title: l.quizBestScore,
                      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        DisplayText(f.percent(pr.bestPercent!), size: 34),
                        const SizedBox(width: 10),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text(l.scoreOf(fmtPoints(f, pr.bestScore ?? 0), fmtPoints(f, pr.maxScore)), style: t.bodyMedium),
                        ),
                      ]),
                    ),
                  if (v.attempts.isNotEmpty)
                    CardGroup(title: l.quizYourAttempts, children: [
                      for (final a in v.attempts)
                        ListTile(
                          key: Key('attempt-${a.id}'),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                          leading: Slate('#${a.number}'),
                          title: Text(f.percent(a.percent), style: t.titleSmall),
                          subtitle: Text(
                            [
                              l.scoreOf(fmtPoints(f, a.score), fmtPoints(f, a.maxScore)),
                              if (a.submittedAt != null) f.dayTime(a.submittedAt!),
                              if (a.timedOut) l.quizTimedOut,
                            ].join(' · '),
                          ),
                          trailing: Icon(Icons.chevron_right_rounded, color: p.muted),
                          onTap: () => context.push(Routes.quizAttempt(quizId, a.id)),
                        ),
                    ]),
                ],
              ),
            ),
            BottomActionBar(children: [
              if (v.openAttempt != null)
                FilledButton(key: const Key('quiz-resume'), onPressed: () => _start(context, ref, v), child: Text(l.quizResume))
              else if (pr.canStart)
                FilledButton(
                  key: const Key('quiz-start'),
                  onPressed: () => _start(context, ref, v),
                  child: Text(pr.attemptsUsed == 0 ? l.quizStart : l.quizTryAgain),
                )
              else
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Text(
                    closed ? l.quizClosedNote : (pr.attemptsLeft <= 0 ? l.quizNoAttemptsNote : l.quizUnavailableNote),
                    textAlign: TextAlign.center,
                    style: t.bodyMedium?.copyWith(color: p.muted),
                  ),
                ),
            ]),
          ]);
        },
      ),
    );
  }
}
