import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/providers.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../admin/presentation/admin_widgets.dart' show confirmAction;
import '../data/lesson_qa_repository.dart';
import '../domain/lesson_qa_models.dart';

/// Questions under a recorded lesson: learners read the thread, ask, mark the answer that helped and delete their own
/// unanswered question. Answering and hiding posts are done by the course author on the web studio.
class LessonQaSection extends ConsumerStatefulWidget {
  const LessonQaSection({super.key, required this.lessonId});
  final String lessonId;

  @override
  ConsumerState<LessonQaSection> createState() => _LessonQaSectionState();
}

class _LessonQaSectionState extends ConsumerState<LessonQaSection> {
  final _ctrl = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action, {String? done}) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(lessonQuestionsProvider(widget.lessonId));
      if (done != null) messenger.showSnackBar(SnackBar(content: Text(done)));
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(AppException.from(e).describe(context))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _ask() async {
    final body = _ctrl.text.trim();
    if (body.length < 3 || body.length > lessonQuestionMax) return;
    final done = context.l10n.qaAsked;
    await _run(() async {
      await ref.read(lessonQaRepositoryProvider).ask(widget.lessonId, body);
      _ctrl.clear();
    }, done: done);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final q = ref.watch(lessonQuestionsProvider(widget.lessonId));
    return SectionCard(
      key: const Key('lesson-qa'),
      margin: const EdgeInsets.only(top: 24),
      title: l.qaTitle,
      child: q.when(
        loading: () => const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
        error: (e, _) => Text(AppException.from(e).describe(context), style: t.bodyMedium?.copyWith(color: p.muted)),
        data: (d) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (d.canAsk) ...[
              Text(l.qaIntro, style: t.bodyMedium?.copyWith(color: p.muted)),
              const SizedBox(height: 10),
              TextField(
                key: const Key('qa-ask-field'),
                controller: _ctrl,
                enabled: d.questionsLeftToday > 0 && !_busy,
                minLines: 2,
                maxLines: 6,
                maxLength: lessonQuestionMax,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: l.qaAskLabel,
                  hintText: l.qaAskHint,
                  helperText: d.questionsLeftToday > 0 ? l.qaLeftToday(d.questionsLeftToday) : l.qaLimitReached,
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: FilledButton(
                  key: const Key('qa-ask'),
                  onPressed: _busy || d.questionsLeftToday == 0 || _ctrl.text.trim().length < 3 ? null : _ask,
                  child: Text(l.qaAsk),
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (d.canAnswer) ...[
              Text(l.qaAnswerOnWeb, style: t.bodySmall?.copyWith(color: p.muted)),
              const SizedBox(height: 12),
            ],
            if (d.items.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(d.canAsk ? l.qaEmpty : l.qaEmptyStaff, style: t.bodyMedium?.copyWith(color: p.muted)),
              )
            else
              for (final question in d.items)
                _QuestionTile(
                  question: question,
                  busy: _busy,
                  onDelete: () async {
                    final ok = await confirmAction(context, title: l.qaDeleteTitle, body: l.qaDeleteBody, confirm: l.qaDelete);
                    if (!ok || !mounted) return;
                    await _run(() => ref.read(lessonQaRepositoryProvider).deleteQuestion(question.id), done: l.qaDeleted);
                  },
                  onAccept: (a) => _run(() => ref.read(lessonQaRepositoryProvider).setAccepted(a.id, !a.accepted)),
                ),
          ],
        ),
      ),
    );
  }
}

class _QuestionTile extends ConsumerWidget {
  const _QuestionTile({required this.question, required this.busy, required this.onDelete, required this.onAccept});
  final LessonQuestion question;
  final bool busy;
  final VoidCallback onDelete;
  final void Function(LessonAnswer) onAccept;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final f = ref.watch(fmtProvider);
    final media = ref.read(appConfigProvider);
    return Padding(
      key: Key('qa-question-${question.id}'),
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InitialsAvatar(question.author.name, size: 32, imageUrl: question.author.image == null ? null : media.resolveMediaUrl(question.author.image!)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(question.mine ? l.qaYou : question.author.name, style: t.titleSmall),
                        Text(f.dayTime(question.createdAt.toLocal()), style: t.bodySmall?.copyWith(color: p.muted)),
                        if (question.hidden) StatusChip(label: l.qaHidden, color: p.muted, look: ChipLook.dashed),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(question.body, style: t.bodyMedium),
                  ],
                ),
              ),
              if (question.mine && question.canDelete)
                IconButton(
                  key: Key('qa-delete-${question.id}'),
                  tooltip: l.qaDelete,
                  onPressed: busy ? null : onDelete,
                  icon: const Icon(Icons.delete_outline_rounded, size: 20),
                ),
            ],
          ),
          if (question.answers.isEmpty)
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 42, top: 6),
              child: Text(l.qaWaiting, style: t.bodySmall?.copyWith(color: p.muted)),
            )
          else
            for (final a in question.answers)
              Container(
                key: Key('qa-answer-${a.id}'),
                margin: const EdgeInsetsDirectional.only(start: 42, top: 10),
                padding: const EdgeInsetsDirectional.only(start: 12),
                decoration: BoxDecoration(border: BorderDirectional(start: BorderSide(color: p.line, width: 2))),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(a.author.name, style: t.titleSmall),
                        if (a.instructor) StatusChip(label: l.qaInstructor, color: p.successBg, textColor: p.success),
                        if (a.accepted) StatusChip(label: l.qaHelped, color: AzzaColors.green, textColor: AzzaColors.inkDeep),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(a.body, style: t.bodyMedium),
                    if (question.mine && !a.hidden)
                      TextButton(
                        key: Key('qa-accept-${a.id}'),
                        onPressed: busy ? null : () => onAccept(a),
                        child: Text(a.accepted ? l.qaUnmarkHelped : l.qaMarkHelped),
                      ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
