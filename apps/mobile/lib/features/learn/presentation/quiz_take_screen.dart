import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/quizzes_repository.dart';
import '../domain/quiz_models.dart';
import 'quiz_widgets.dart';

/// Errors after which the attempt can't be submitted again: leave the screen.
const _finalCodes = {'QUIZ_TIME_UP', 'QUIZ_CLOSED', 'NO_ATTEMPTS_LEFT', 'ATTEMPT_NOT_STARTED'};

/// `mm:ss` (Western digits, like every timecode in the app).
String quizClock(Duration d) {
  final s = d.isNegative ? 0 : d.inSeconds;
  return '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
}

/// Taking a quiz: one question per card, a progress bar, the countdown for timed quizzes
/// (auto-submits at zero) and a confirmation before submitting.
class QuizTakeScreen extends ConsumerStatefulWidget {
  const QuizTakeScreen({super.key, required this.quizId});
  final String quizId;

  @override
  ConsumerState<QuizTakeScreen> createState() => _QuizTakeScreenState();
}

class _QuizTakeScreenState extends ConsumerState<QuizTakeScreen> {
  QuizView? _view;
  Object? _error;
  int _index = 0;
  bool _submitting = false;
  bool _done = false;
  Timer? _deadlineTimer;
  final Map<String, Set<String>> _answers = {};

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _deadlineTimer?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() => _error = null);
    try {
      final v = await ref.read(quizzesRepositoryProvider).start(widget.quizId);
      if (!mounted) return;
      setState(() => _view = v);
      final deadline = v.openAttempt?.deadline;
      if (deadline != null) {
        final left = deadline.difference(DateTime.now());
        _deadlineTimer = Timer(left.isNegative ? Duration.zero : left, () => _submit(auto: true));
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  void _toggle(QuizQuestion q, String optionId) {
    setState(() {
      final picked = _answers.putIfAbsent(q.id, () => <String>{});
      if (q.multiple) {
        if (!picked.remove(optionId)) picked.add(optionId);
      } else {
        picked
          ..clear()
          ..add(optionId);
      }
      if (picked.isEmpty) _answers.remove(q.id);
    });
  }

  Future<void> _confirmSubmit() async {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    final total = _view!.quiz.questions.length;
    final answered = _answers.length;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.quizSubmitTitle),
        content: Text([
          f.n(l.quizAnsweredOf(answered, total)),
          if (answered < total) l.quizUnansweredWarning,
        ].join('\n\n')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
          FilledButton(key: const Key('quiz-submit-confirm'), onPressed: () => Navigator.pop(ctx, true), child: Text(l.quizSubmit)),
        ],
      ),
    );
    if (ok == true) await _submit();
  }

  Future<void> _submit({bool auto = false}) async {
    if (_submitting || _done || !mounted) return;
    final l = context.l10n;
    setState(() => _submitting = true);
    void refresh() => ref
      ..invalidate(quizViewProvider(widget.quizId))
      ..invalidate(myQuizzesProvider);
    try {
      final res = await ref.read(quizzesRepositoryProvider).submit(widget.quizId, {
        for (final e in _answers.entries) e.key: e.value.toList(),
      });
      _done = true;
      _deadlineTimer?.cancel();
      refresh();
      if (!mounted) return;
      if (auto) showToast(context, l.quizAutoSubmitted);
      final attemptId = res.result?.id ?? res.attempts.firstOrNull?.id;
      if (attemptId != null) {
        context.pushReplacement(Routes.quizAttempt(widget.quizId, attemptId));
      } else {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (!mounted) return;
      showToast(context, errorText(context, e));
      if (_finalCodes.contains(AppException.from(e).code)) {
        _done = true;
        _deadlineTimer?.cancel();
        refresh();
        Navigator.of(context).pop();
      } else {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _confirmLeave() async {
    final l = context.l10n;
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.quizLeaveTitle),
        content: Text(_view?.openAttempt?.deadline != null ? l.quizLeaveTimedBody : l.quizLeaveBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.quizKeepGoing)),
          TextButton(key: const Key('quiz-leave-confirm'), onPressed: () => Navigator.pop(ctx, true), child: Text(l.quizLeave)),
        ],
      ),
    );
    if (leave == true && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final v = _view;
    final deadline = v?.openAttempt?.deadline;
    return PopScope(
      canPop: _done || v == null || _answers.isEmpty && deadline == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmLeave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(v?.quiz.title ?? l.quizLabel),
          actions: [
            if (deadline != null)
              Padding(
                padding: const EdgeInsetsDirectional.only(end: AzzaSpace.gutter),
                child: Center(child: _Countdown(deadline: deadline)),
              ),
          ],
        ),
        body: v == null
            ? (_error != null ? ErrorState(error: _error!, onRetry: _start) : const LoadingState())
            : v.quiz.questions.isEmpty
                ? EmptyState(title: l.noQuestions, icon: Icons.quiz_outlined)
                : _body(v),
      ),
    );
  }

  Widget _body(QuizView v) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final questions = v.quiz.questions;
    final q = questions[_index];
    final picked = _answers[q.id] ?? const <String>{};
    final last = _index == questions.length - 1;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 4, AzzaSpace.gutter, 0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(child: Kicker(l.quizQuestionNofM(f.n(_index + 1), f.n(questions.length)))),
            Kicker(l.quizAnsweredN(f.n(_answers.length)), color: p.muted),
          ]),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            key: const Key('quiz-progress'),
            value: (_index + 1) / questions.length,
            minHeight: 4,
            borderRadius: BorderRadius.circular(2),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: context.scaled(36),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: questions.length,
              separatorBuilder: (_, _) => const SizedBox(width: 6),
              itemBuilder: (_, i) {
                final current = i == _index;
                final done = _answers.containsKey(questions[i].id);
                return Semantics(
                  button: true,
                  selected: current,
                  label: l.quizQuestionNofM(f.n(i + 1), f.n(questions.length)),
                  child: InkResponse(
                    onTap: () => setState(() => _index = i),
                    child: Container(
                      width: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: done ? p.successBg : p.raised,
                        border: Border.all(color: current ? p.accent : p.line, width: current ? 2 : 1),
                      ),
                      child: Text(f.n(i + 1), style: t.labelMedium?.copyWith(color: done ? p.success : p.text)),
                    ),
                  ),
                );
              },
            ),
          ),
        ]),
      ),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 4, AzzaSpace.gutter, 24),
          children: [
            SectionCard(
              key: Key('question-${q.id}'),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Kicker([
                  q.multiple ? l.quizChooseAll : l.quizChooseOne,
                  l.quizPointsN(fmtPoints(f, q.points)),
                ].join(' · ')),
                const SizedBox(height: 8),
                Text(q.prompt(locale), style: t.titleMedium),
                const SizedBox(height: 14),
                for (final o in q.options) ...[
                  QuizOptionRow(
                    key: Key('option-${o.id}'),
                    text: o.text(locale),
                    selected: picked.contains(o.id),
                    multiple: q.multiple,
                    onTap: _submitting ? null : () => _toggle(q, o.id),
                  ),
                  const SizedBox(height: 8),
                ],
              ]),
            ),
          ],
        ),
      ),
      BottomActionBar(children: [
        Row(children: [
          if (_index > 0) ...[
            Expanded(
              child: OutlinedButton(
                key: const Key('quiz-back'),
                onPressed: _submitting ? null : () => setState(() => _index--),
                child: Text(l.quizPrevious),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: last
                ? FilledButton(
                    key: const Key('quiz-submit'),
                    onPressed: _submitting ? null : _confirmSubmit,
                    child: _submitting
                        ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(l.quizSubmit),
                  )
                : FilledButton(
                    key: const Key('quiz-next'),
                    onPressed: _submitting ? null : () => setState(() => _index++),
                    child: Text(l.quizNext),
                  ),
          ),
        ]),
      ]),
    ]);
  }
}

/// Time left on a timed attempt; turns red in the last minute.
class _Countdown extends StatelessWidget {
  const _Countdown({required this.deadline});
  final DateTime deadline;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return Ticker(
      builder: (context, now) {
        final left = deadline.difference(now);
        final urgent = left.inSeconds < 60;
        return Semantics(
          label: l.quizTimeLeft(quizClock(left)),
          liveRegion: urgent,
          child: Container(
            key: const Key('quiz-countdown'),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: urgent ? p.dangerBg : p.successBg,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.timer_outlined, size: 16, color: urgent ? p.danger : p.success),
              const SizedBox(width: 6),
              Text(quizClock(left), style: AzzaFonts.mono(size: 13, color: urgent ? p.danger : p.success, tracking: 0.04)),
            ]),
          ),
        );
      },
    );
  }
}
