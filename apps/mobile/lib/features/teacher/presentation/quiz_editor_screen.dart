import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/count_stepper.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../learn/data/lessons_repository.dart';
import '../../learn/data/quizzes_repository.dart';
import '../../learn/domain/quiz_models.dart';
import '../data/studio_repository.dart';
import '../domain/studio_models.dart';
import 'assignment_editor_screen.dart' show pickDateTime;

class _Opt {
  _Opt({this.id, String text = '', this.correct = false}) : text = TextEditingController(text: text);
  final String? id;
  final TextEditingController text;
  bool correct;
}

class _Q {
  _Q({this.id, this.type = QuestionType.single, String prompt = '', this.points = 1, List<_Opt>? options})
      : prompt = TextEditingController(text: prompt),
        options = options ?? [_Opt(correct: true), _Opt()];

  factory _Q.from(QuizQuestionDraft q) => _Q(
        id: q.id,
        type: q.type,
        prompt: q.promptEn,
        points: q.points,
        options: [for (final o in q.options) _Opt(id: o.id, text: o.textEn, correct: o.correct)],
      );

  final String? id;
  QuestionType type;
  final TextEditingController prompt;
  int points;
  final List<_Opt> options;

  int get correctCount => options.where((o) => o.correct).length;
  bool get correctOk => type == QuestionType.multiple ? correctCount >= 1 : correctCount == 1;

  QuizQuestionDraft toDraft() => QuizQuestionDraft(
        id: id,
        type: type,
        promptEn: prompt.text,
        points: points,
        options: [for (final o in options) QuizOptionDraft(id: o.id, textEn: o.text.text, correct: o.correct)],
      );

  void dispose() {
    prompt.dispose();
    for (final o in options) {
      o.text.dispose();
    }
  }
}

/// Quiz authoring: details (title, module, due date, time limit, attempts) and a question builder
/// (single choice, choose all, true/false), with publish / unpublish. Results stay on their own screen.
class QuizEditorScreen extends ConsumerWidget {
  const QuizEditorScreen({super.key, this.batchId, this.courseId, this.quizId}) : assert((batchId == null) != (courseId == null));

  /// A class's quiz, or...
  final String? batchId;

  /// ...a recorded course's own quiz (unlimited attempts, no due date).
  final String? courseId;
  final String? quizId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    if (quizId == null) return _QuizForm(batchId: batchId, courseId: courseId);
    final quiz = ref.watch(staffQuizProvider(quizId!));
    return quiz.when(
      data: (q) => _QuizForm(batchId: batchId, courseId: courseId, quiz: q),
      error: (e, _) => Scaffold(appBar: AppBar(title: Text(l.teacherEditQuiz)), body: ErrorState(error: e, onRetry: () => ref.invalidate(staffQuizProvider(quizId!)))),
      loading: () => Scaffold(appBar: AppBar(title: Text(l.teacherEditQuiz)), body: const LoadingState()),
    );
  }
}

class _QuizForm extends ConsumerStatefulWidget {
  const _QuizForm({this.batchId, this.courseId, this.quiz});
  final String? batchId;
  final String? courseId;
  final StaffQuiz? quiz;

  @override
  ConsumerState<_QuizForm> createState() => _QuizFormState();
}

class _QuizFormState extends ConsumerState<_QuizForm> {
  final _form = GlobalKey<FormState>();
  late StaffQuiz? _quiz = widget.quiz;
  late final _title = TextEditingController(text: widget.quiz?.title ?? '');
  late final _description = TextEditingController(text: widget.quiz?.description ?? '');
  late final _timeLimit = TextEditingController(text: widget.quiz?.timeLimitMin?.toString() ?? '');
  late final _passPercent = TextEditingController(text: '${widget.quiz?.passPercent ?? 70}');
  final _due = TextEditingController();
  late String? _moduleId = widget.quiz?.moduleId;
  late DateTime? _dueAt = widget.quiz?.dueAt;
  late int _attempts = widget.quiz?.maxAttempts ?? 1;
  late final List<_Q> _questions = widget.quiz == null ? [_Q()] : [for (final q in widget.quiz!.questions) _Q.from(q)];
  bool _busy = false;
  bool _triedSave = false;

  bool get _forCourse => widget.courseId != null;
  bool get _locked => _quiz?.hasAttempts ?? false;
  bool get _published => _quiz?.published ?? false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _due.text = _dueAt == null ? '' : ref.read(fmtProvider).dayTime(_dueAt!);
  }

  @override
  void dispose() {
    for (final c in [_title, _description, _timeLimit, _passPercent, _due]) {
      c.dispose();
    }
    for (final q in _questions) {
      q.dispose();
    }
    super.dispose();
  }

  int get _totalPoints => _questions.fold(0, (s, q) => s + q.points);

  QuizDraft _draft() => QuizDraft(
        title: _title.text,
        description: _description.text.trim(),
        moduleId: _moduleId,
        dueAt: _forCourse ? null : _dueAt,
        timeLimitMin: int.tryParse(_timeLimit.text.trim()),
        maxAttempts: _forCourse ? null : _attempts,
        passPercent: int.tryParse(_passPercent.text.trim()) ?? 70,
        questions: [for (final q in _questions) q.toDraft()],
      );

  bool _valid() {
    setState(() => _triedSave = true);
    final fieldsOk = _form.currentState?.validate() ?? false;
    return fieldsOk && (_locked || _questions.every((q) => q.correctOk));
  }

  /// Creates or updates the quiz; returns it, or null on failure.
  Future<StaffQuiz?> _persist() async {
    final repo = ref.read(teacherStudioRepositoryProvider);
    final draft = _draft();
    final saved = _forCourse
        ? (_quiz == null
            ? await repo.createCourseQuiz(widget.courseId!, draft)
            : await repo.updateCourseQuiz(widget.courseId!, _quiz!.id, draft, withQuestions: !_locked))
        : (_quiz == null
            ? await repo.createQuiz(widget.batchId!, draft)
            : await repo.updateQuiz(widget.batchId!, _quiz!.id, draft, withQuestions: !_locked));
    _refreshList();
    if (_quiz != null) ref.invalidate(staffQuizProvider(_quiz!.id));
    return saved;
  }

  void _refreshList() => _forCourse ? ref.invalidate(courseQuizzesProvider(widget.courseId!)) : ref.invalidate(batchQuizzesProvider(widget.batchId!));

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    if (!_valid()) return;
    final l = context.l10n;
    await _run(() async {
      final saved = await _persist();
      if (!mounted || saved == null) return;
      setState(() => _quiz = saved);
      showToast(context, l.teacherQuizSaved);
    });
  }

  Future<void> _publish() async {
    final l = context.l10n;
    if (!_valid()) return;
    if (_questions.isEmpty) {
      showToast(context, l.teacherQuizNeedsQuestion);
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.teacherPublishQuizTitle),
        content: Text(l.teacherPublishQuizBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
          TextButton(key: const Key('confirm-publish-quiz'), onPressed: () => Navigator.pop(context, true), child: Text(l.teacherPublish)),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await _run(() async {
      final saved = await _persist();
      if (saved == null) return;
      final studio = ref.read(teacherStudioRepositoryProvider);
      final published = _forCourse ? await studio.publishCourseQuiz(widget.courseId!, saved.id) : await studio.publishQuiz(widget.batchId!, saved.id);
      _refreshList();
      if (!mounted) return;
      setState(() => _quiz = published);
      showToast(context, l.teacherQuizPublished);
    });
  }

  Future<void> _unpublish() async {
    final l = context.l10n;
    await _run(() async {
      final studio = ref.read(teacherStudioRepositoryProvider);
      final q = _forCourse ? await studio.unpublishCourseQuiz(widget.courseId!, _quiz!.id) : await studio.unpublishQuiz(widget.batchId!, _quiz!.id);
      _refreshList();
      if (!mounted) return;
      setState(() => _quiz = q);
      showToast(context, l.teacherQuizUnpublished);
    });
  }

  Future<void> _delete() async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.teacherDeleteQuizTitle),
        content: Text(l.teacherDeleteQuizBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
          TextButton(
            key: const Key('confirm-delete-quiz'),
            style: TextButton.styleFrom(foregroundColor: AzzaPalette.of(context).danger),
            onPressed: () => Navigator.pop(context, true),
            child: Text(l.teacherDelete),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await _run(() async {
      final studio = ref.read(teacherStudioRepositoryProvider);
      await (_forCourse ? studio.deleteCourseQuiz(widget.courseId!, _quiz!.id) : studio.deleteQuiz(widget.batchId!, _quiz!.id));
      _refreshList();
      if (!mounted) return;
      showToast(context, l.teacherQuizDeleted);
      context.pop(true);
    });
  }

  Future<void> _pickDue() async {
    final picked = await pickDateTime(context, initial: _dueAt);
    if (picked == null || !mounted) return;
    setState(() {
      _dueAt = picked;
      _due.text = ref.read(fmtProvider).dayTime(picked);
    });
  }

  void _setType(_Q q, QuestionType type) {
    final l = context.l10n;
    setState(() {
      q.type = type;
      if (type == QuestionType.trueFalse) {
        for (final o in q.options) {
          o.text.dispose();
        }
        q.options
          ..clear()
          ..addAll([_Opt(text: l.teacherTrue, correct: true), _Opt(text: l.teacherFalse)]);
      } else if (type == QuestionType.single && q.correctCount > 1) {
        var seen = false;
        for (final o in q.options) {
          if (o.correct && seen) o.correct = false;
          if (o.correct) seen = true;
        }
      }
    });
  }

  void _toggleCorrect(_Q q, _Opt o) => setState(() {
        if (q.type == QuestionType.multiple) {
          o.correct = !o.correct;
        } else {
          for (final x in q.options) {
            x.correct = identical(x, o);
          }
        }
      });

  String _typeLabel(AppLocalizations l, QuestionType t) => switch (t) {
        QuestionType.single => l.teacherSingleChoice,
        QuestionType.multiple => l.teacherChooseAll,
        QuestionType.trueFalse => l.teacherTrueFalse,
      };

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final batch = _forCourse ? null : ref.watch(batchProvider(widget.batchId!)).value;
    final modules = batch == null ? const [] : (ref.watch(courseLessonsProvider(batch.courseId)).value?.modules ?? const []);

    return Scaffold(
      appBar: AppBar(
        title: Text(_quiz == null ? l.teacherNewQuiz : l.teacherEditQuiz),
        actions: [
          if (_published)
            TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
              onPressed: () => context.push(Routes.quizResults(_quiz!.id)),
              child: Text(l.teacherQuizResults),
            ),
          if (_quiz != null && !_published)
            IconButton(key: const Key('delete-quiz'), tooltip: l.teacherDeleteQuizTitle, onPressed: _busy ? null : _delete, icon: const Icon(Icons.delete_outline_rounded)),
          const SizedBox(width: 4),
        ],
      ),
      body: Form(
        key: _form,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
          children: [
            Row(children: [
              if (_published)
                StatusChip(key: const Key('quiz-status-published'), label: l.statusPublished, color: p.successBg, textColor: p.success)
              else
                StatusChip(key: const Key('quiz-status-draft'), label: l.batchDraft, color: p.muted, look: ChipLook.dashed),
              const SizedBox(width: 12),
              Expanded(
                child: Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: Kicker(f.n(l.teacherQuizTotals(_questions.length, _totalPoints)), size: 12),
                ),
              ),
            ]),
            if (_locked) ...[
              const SizedBox(height: 12),
              SectionCard(
                margin: EdgeInsets.zero,
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(Icons.lock_outline_rounded, color: p.muted, size: 20),
                  const SizedBox(width: 12),
                  Expanded(child: Text(l.teacherQuizLocked, style: t.bodySmall)),
                ]),
              ),
            ],
            SectionCard(
              title: l.teacherQuizDetails,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                TextFormField(
                  key: const Key('quiz-title'),
                  controller: _title,
                  textInputAction: TextInputAction.next,
                  decoration: fieldDecoration(label: l.announcementTitleLabel, icon: Icons.title_rounded, hint: l.teacherQuizTitleHint),
                  validator: (v) => (v?.trim().length ?? 0) < 2 ? l.teacherTitleRequired : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('quiz-description'),
                  controller: _description,
                  minLines: 2,
                  maxLines: 6,
                  decoration: fieldDecoration(label: l.teacherInstructions, icon: Icons.notes_rounded, hint: l.teacherQuizInstructionsHint, helper: l.teacherOptional),
                ),
                const SizedBox(height: 12),
                if (!_forCourse) ...[
                DropdownButtonFormField<String?>(
                  key: const Key('quiz-module'),
                  initialValue: modules.any((m) => m.id == _moduleId) ? _moduleId : null,
                  isExpanded: true,
                  decoration: fieldDecoration(label: l.teacherQuizModule, icon: Icons.view_module_outlined, helper: l.teacherQuizModuleHelper),
                  items: [
                    DropdownMenuItem<String?>(value: null, child: Text(l.teacherNoModule)),
                    for (final m in modules) DropdownMenuItem<String?>(value: m.id, child: Text(m.title(locale), overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) => setState(() => _moduleId = v),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('quiz-due'),
                  controller: _due,
                  readOnly: true,
                  onTap: _pickDue,
                  decoration: fieldDecoration(
                    label: l.quizDueLabel,
                    icon: Icons.event_rounded,
                    hint: l.teacherNoDueDate,
                    helper: l.teacherOptional,
                    action: _dueAt == null
                        ? IconButton(tooltip: l.teacherChangeDue, onPressed: _pickDue, icon: const Icon(Icons.edit_calendar_rounded, size: 20))
                        : IconButton(
                            tooltip: l.clear,
                            onPressed: () => setState(() {
                              _dueAt = null;
                              _due.clear();
                            }),
                            icon: const Icon(Icons.close_rounded, size: 20),
                          ),
                  ),
                ),
                const SizedBox(height: 12),
                ],
                TextFormField(
                  key: const Key('quiz-time-limit'),
                  controller: _timeLimit,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: fieldDecoration(label: l.teacherTimeLimit, icon: Icons.timer_outlined, hint: l.teacherUntimed, helper: l.teacherTimeLimitHelper),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return null;
                    final n = int.tryParse(v.trim());
                    return n == null || n < 1 || n > 600 ? l.teacherTimeLimitInvalid : null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('quiz-pass-percent'),
                  controller: _passPercent,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)],
                  decoration: fieldDecoration(label: l.quizPassPercent, icon: Icons.percent_rounded, helper: l.quizPassHelper),
                  validator: (v) {
                    final n = int.tryParse(v?.trim() ?? '');
                    return n == null || n < 0 || n > 100 ? l.quizPassInvalid : null;
                  },
                ),
                if (_forCourse) ...[
                  const SizedBox(height: 12),
                  Text(l.quizCourseNote, key: const Key('quiz-course-note'), style: t.bodySmall),
                ] else ...[
                  const SizedBox(height: 12),
                  CountStepper(
                    key: const Key('quiz-attempts'),
                    label: l.teacherAttempts,
                    icon: Icons.replay_rounded,
                    value: _attempts,
                    min: 1,
                    max: 20,
                    helper: l.teacherAttemptsHelper,
                    arabicDigits: f.arabicDigits,
                    onChanged: (v) => setState(() => _attempts = v),
                  ),
                ],
              ]),
            ),
            for (final (i, q) in _questions.indexed) _questionCard(context, i, q),
            if (!_locked) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                key: const Key('add-question'),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                onPressed: _questions.length >= 100 ? null : () => setState(() => _questions.add(_Q())),
                icon: const Icon(Icons.add_rounded),
                label: Text(l.teacherAddQuestion),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: BottomActionBar(children: [
        Row(children: [
          Expanded(
            child: OutlinedButton(
              key: const Key('save-quiz'),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              onPressed: _busy ? null : _save,
              child: Text(_published ? l.save : l.teacherSaveDraft),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _published
                ? FilledButton(
                    key: const Key('unpublish-quiz'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    onPressed: _busy || _locked ? null : _unpublish,
                    child: Text(l.teacherUnpublish),
                  )
                : FilledButton(
                    key: const Key('publish-quiz'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    onPressed: _busy ? null : _publish,
                    child: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(l.teacherPublish),
                  ),
          ),
        ]),
      ]),
    );
  }

  Widget _questionCard(BuildContext context, int index, _Q q) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final tf = q.type == QuestionType.trueFalse;
    return SectionCard(
      key: Key('question-$index'),
      title: l.teacherQuestionN(f.n(index + 1)),
      trailing: _locked || _questions.length <= 1
          ? null
          : IconButton(
              key: Key('remove-question-$index'),
              tooltip: l.teacherRemoveQuestion,
              onPressed: () => setState(() => _questions.removeAt(index).dispose()),
              icon: const Icon(Icons.delete_outline_rounded),
            ),
      child: IgnorePointer(
        ignoring: _locked,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SegmentedButton<QuestionType>(
              showSelectedIcon: false,
              style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(44, 44)), tapTargetSize: MaterialTapTargetSize.padded),
              segments: [
                for (final type in QuestionType.values)
                  ButtonSegment(value: type, label: Text(_typeLabel(l, type), key: Key('q$index-type-${type.name}'))),
              ],
              selected: {q.type},
              onSelectionChanged: (v) => _setType(q, v.first),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: Key('q$index-prompt'),
            controller: q.prompt,
            minLines: 1,
            maxLines: 5,
            decoration: fieldDecoration(label: l.teacherQuestionPrompt, icon: Icons.help_outline_rounded, hint: l.teacherQuestionPromptHint),
            validator: (v) => (v?.trim().isEmpty ?? true) ? l.teacherQuestionRequired : null,
          ),
          const SizedBox(height: 12),
          Text(q.type == QuestionType.multiple ? l.teacherMarkAllCorrect : l.teacherMarkOneCorrect, style: t.bodySmall?.copyWith(color: p.muted)),
          const SizedBox(height: 4),
          for (final (j, o) in q.options.indexed)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                IconButton(
                  key: Key('q$index-correct-$j'),
                  tooltip: o.correct ? l.teacherCorrectAnswer : l.teacherMarkCorrect,
                  isSelected: o.correct,
                  color: o.correct ? p.success : p.muted,
                  onPressed: () => _toggleCorrect(q, o),
                  icon: Icon(q.type == QuestionType.multiple
                      ? (o.correct ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded)
                      : (o.correct ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded)),
                ),
                Expanded(
                  child: TextFormField(
                    key: Key('q$index-option-$j'),
                    controller: o.text,
                    readOnly: tf,
                    decoration: fieldDecoration(label: l.teacherOptionN(f.n(j + 1)), icon: Icons.short_text_rounded, labelIsHint: true),
                    validator: (v) => (v?.trim().isEmpty ?? true) ? l.teacherOptionRequired : null,
                  ),
                ),
                if (!tf && q.options.length > 2)
                  IconButton(
                    tooltip: l.teacherRemoveOption,
                    onPressed: () => setState(() {
                      final removed = q.options.removeAt(j);
                      removed.text.dispose();
                      if (q.type != QuestionType.multiple && q.correctCount == 0) q.options.first.correct = true;
                    }),
                    icon: const Icon(Icons.close_rounded),
                  ),
              ]),
            ),
          if (!tf && q.options.length < 8)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: Key('q$index-add-option'),
                style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                onPressed: () => setState(() => q.options.add(_Opt())),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(l.teacherAddOption),
              ),
            ),
          if (_triedSave && !q.correctOk)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                q.type == QuestionType.multiple ? l.teacherMarkAllCorrect : l.teacherMarkOneCorrect,
                key: Key('q$index-correct-error'),
                style: t.bodySmall?.copyWith(color: p.danger),
              ),
            ),
          const SizedBox(height: 12),
          CountStepper(
            key: Key('q$index-points'),
            label: l.teacherPoints,
            icon: Icons.star_outline_rounded,
            value: q.points,
            min: 1,
            max: 100,
            arabicDigits: f.arabicDigits,
            onChanged: (v) => setState(() => q.points = v),
          ),
        ]),
      ),
    );
  }
}
