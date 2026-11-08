import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../learn/data/learn_repository.dart';
import '../../learn/presentation/file_widgets.dart';
import '../data/studio_repository.dart';
import '../domain/studio_models.dart';

enum _SubFilter { all, toGrade, graded, late }

/// "Graded 8/10", "Late" and "To grade" chips for a submission.
class SubmissionChips extends StatelessWidget {
  const SubmissionChips({super.key, required this.submission, required this.maxScore, required this.late});
  final Submission submission;
  final int maxScore;
  final bool late;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return Wrap(spacing: 6, runSpacing: 6, children: [
      if (late) StatusChip(key: Key('late-${submission.id}'), label: l.late, color: p.warningBg, textColor: p.warning),
      if (submission.graded)
        StatusChip(
          key: Key('graded-${submission.id}'),
          label: l.teacherGradedScore('${submission.score}', '$maxScore'),
          color: p.successBg,
          textColor: p.success,
        )
      else
        StatusChip(label: l.teacherToGrade, color: p.muted, look: ChipLook.dashed),
    ]);
  }
}

/// Submissions of one assignment: who handed in, late or on time, graded or not. Tap one to grade it.
class SubmissionsScreen extends ConsumerStatefulWidget {
  const SubmissionsScreen({super.key, required this.batchId, required this.assignmentId});
  final String batchId;
  final String assignmentId;

  @override
  ConsumerState<SubmissionsScreen> createState() => _SubmissionsScreenState();
}

class _SubmissionsScreenState extends ConsumerState<SubmissionsScreen> {
  _SubFilter _filter = _SubFilter.all;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final assignments = ref.watch(assignmentsProvider(widget.batchId));
    final subs = ref.watch(submissionsProvider(widget.assignmentId));

    return Scaffold(
      appBar: AppBar(title: Text(l.teacherSubmissionsTitle)),
      body: AsyncView<List<Assignment>>(
        value: assignments,
        onRetry: () => ref.invalidate(assignmentsProvider(widget.batchId)),
        data: (list) {
          final a = list.where((x) => x.id == widget.assignmentId).firstOrNull;
          if (a == null) return EmptyState(title: l.emptyGeneric);
          return AsyncView<List<Submission>>(
            value: subs,
            onRetry: () => ref.invalidate(submissionsProvider(widget.assignmentId)),
            data: (items) {
              final toGrade = items.where((s) => !s.graded).toList();
              final graded = items.where((s) => s.graded).toList();
              final late = items.where((s) => s.lateFor(a.dueAt)).toList();
              final shown = switch (_filter) {
                _SubFilter.all => [...toGrade, ...graded],
                _SubFilter.toGrade => toGrade,
                _SubFilter.graded => graded,
                _SubFilter.late => late,
              };
              return RefreshList(
                onRefresh: () async => ref.invalidate(submissionsProvider(widget.assignmentId)),
                children: [
                  DisplayText(a.title, size: 26),
                  const SizedBox(height: 4),
                  Text('${l.dueAt(f.dayTime(a.dueAt))} · ${l.teacherOutOf(f.n(a.maxScore))}', style: t.bodySmall),
                  if (a.description.trim().isNotEmpty) SectionCard(title: l.teacherInstructions, child: Text(a.description, style: t.bodyMedium)),
                  const SizedBox(height: 16),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final (flt, label, n) in [
                      (_SubFilter.all, l.allFilter, items.length),
                      (_SubFilter.toGrade, l.teacherToGrade, toGrade.length),
                      (_SubFilter.graded, l.gradedTab, graded.length),
                      (_SubFilter.late, l.late, late.length),
                    ])
                      ChoiceChip(
                        key: Key('sub-filter-${flt.name}'),
                        label: Text('$label ${f.n(n)}'),
                        selected: _filter == flt,
                        showCheckmark: false,
                        labelStyle: TextStyle(color: _filter == flt ? p.onAccent : p.text),
                        onSelected: (_) => setState(() => _filter = flt),
                      ),
                  ]),
                  const SizedBox(height: 12),
                  if (shown.isEmpty)
                    EmptyState(title: items.isEmpty ? l.teacherNoSubmissions : l.emptyGeneric, icon: Icons.inbox_outlined)
                  else
                    CardGroup(children: [
                      for (final s in shown)
                        ListTile(
                          key: Key('submission-${s.id}'),
                          minTileHeight: 64,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          leading: InitialsAvatar(s.studentName, size: 40),
                          title: Text(s.studentName, style: t.titleSmall),
                          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(l.teacherHandedIn(f.dayTime(s.submittedAt)), style: t.bodySmall),
                            const SizedBox(height: 6),
                            Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: SubmissionChips(submission: s, maxScore: a.maxScore, late: s.lateFor(a.dueAt)),
                            ),
                          ]),
                          trailing: Icon(Icons.chevron_right_rounded, color: p.muted),
                          onTap: () => showGradeSheet(context, submission: s, assignment: a),
                        ),
                    ]),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

/// Opens the grade sheet; returns true when a grade was saved.
Future<bool> showGradeSheet(BuildContext context, {required Submission submission, required Assignment assignment, String? classLabel}) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => GradeSheet(submission: submission, assignment: assignment, classLabel: classLabel),
  );
  return saved ?? false;
}

/// The student's work (text or link) with score and feedback fields.
class GradeSheet extends ConsumerStatefulWidget {
  const GradeSheet({super.key, required this.submission, required this.assignment, this.classLabel});
  final Submission submission;
  final Assignment assignment;
  final String? classLabel;

  @override
  ConsumerState<GradeSheet> createState() => _GradeSheetState();
}

class _GradeSheetState extends ConsumerState<GradeSheet> {
  final _form = GlobalKey<FormState>();
  late final _score = TextEditingController(text: widget.submission.score?.toString() ?? '');
  late final _feedback = TextEditingController(text: widget.submission.feedback ?? '');
  bool _busy = false;

  @override
  void dispose() {
    _score.dispose();
    _feedback.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      final feedback = _feedback.text.trim();
      await ref.read(teacherStudioRepositoryProvider).grade(
            widget.submission.id,
            score: int.parse(_score.text.trim()),
            feedback: feedback.isEmpty ? null : feedback,
          );
      ref
        ..invalidate(submissionsProvider(widget.assignment.id))
        ..invalidate(gradingQueueProvider);
      if (!mounted) return;
      showToast(context, l.teacherGradeSaved);
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final s = widget.submission;
    final a = widget.assignment;
    final late = s.lateFor(a.dueAt);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
        child: Form(
          key: _form,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              InitialsAvatar(s.studentName, size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s.studentName, style: t.titleMedium),
                  Text([?widget.classLabel, a.title].join(' · '), style: t.bodySmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                ]),
              ),
            ]),
            const SizedBox(height: 12),
            Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
              Text(l.teacherHandedIn(f.dayTime(s.submittedAt)), style: t.bodySmall),
              if (late) StatusChip(label: l.late, color: p.warningBg, textColor: p.warning),
              if (s.graded) StatusChip(label: l.teacherGradedScore('${s.score}', '${a.maxScore}'), color: p.successBg, textColor: p.success),
            ]),
            SectionCard(
              key: const Key('submission-work'),
              title: l.teacherTheirWork,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                if (s.text != null && s.text!.trim().isNotEmpty) SelectableText(s.text!, style: t.bodyMedium),
                if (s.url != null) ...[
                  if (s.text != null && s.text!.trim().isNotEmpty) const SizedBox(height: 8),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton.icon(
                      key: const Key('open-submission-link'),
                      style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                      onPressed: () => openExternal(context, s.url),
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: Text(Uri.tryParse(s.url!)?.host.isNotEmpty == true ? Uri.parse(s.url!).host : s.url!, overflow: TextOverflow.ellipsis),
                    ),
                  ),
                ],
                if (s.files.isNotEmpty) ...[
                  if ((s.text != null && s.text!.trim().isNotEmpty) || s.url != null) const SizedBox(height: 8),
                  Text(l.filesSubmitted, style: t.labelLarge),
                  const SizedBox(height: 4),
                  AttachedFilesList(key: const Key('submission-files'), files: s.files),
                ],
                if ((s.text == null || s.text!.trim().isEmpty) && s.url == null && s.files.isEmpty) Text(l.emptyGeneric, style: t.bodySmall),
              ]),
            ),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('grade-score'),
              controller: _score,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: fieldDecoration(
                label: l.teacherScore,
                icon: Icons.grade_outlined,
                hint: l.teacherScoreHint(f.n(a.maxScore)),
                helper: l.teacherOutOf(f.n(a.maxScore)),
              ),
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                return n == null || n < 0 || n > a.maxScore ? l.teacherScoreInvalid(f.n(a.maxScore)) : null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              key: const Key('grade-feedback'),
              controller: _feedback,
              minLines: 3,
              maxLines: 8,
              maxLength: 5000,
              decoration: fieldDecoration(label: l.teacherFeedback, icon: Icons.chat_bubble_outline_rounded, hint: l.teacherFeedbackHint),
            ),
            const SizedBox(height: 8),
            FilledButton(
              key: const Key('save-grade'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              onPressed: _busy ? null : _save,
              child: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(l.teacherSaveGrade),
            ),
          ]),
        ),
      ),
    );
  }
}

/// Everything waiting for a grade across your classes (from Today's "Needs you").
class GradingQueueScreen extends ConsumerStatefulWidget {
  const GradingQueueScreen({super.key});

  @override
  ConsumerState<GradingQueueScreen> createState() => _GradingQueueScreenState();
}

class _GradingQueueScreenState extends ConsumerState<GradingQueueScreen> {
  bool _graded = false;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final queue = ref.watch(gradingQueueProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.teacherGradingTitle)),
      body: AsyncView<List<GradingItem>>(
        value: queue,
        onRetry: () => ref.invalidate(gradingQueueProvider),
        data: (all) {
          final toGrade = all.where((i) => !i.submission.graded).toList();
          final graded = all.where((i) => i.submission.graded).toList();
          final shown = _graded ? graded : toGrade;
          return RefreshList(
            onRefresh: () async => ref.invalidate(gradingQueueProvider),
            children: [
              Text(l.teacherGradingLede, style: t.bodySmall),
              const SizedBox(height: 12),
              Wrap(spacing: 8, children: [
                for (final (g, label, n) in [(false, l.teacherToGrade, toGrade.length), (true, l.gradedTab, graded.length)])
                  ChoiceChip(
                    label: Text('$label ${f.n(n)}'),
                    selected: _graded == g,
                    showCheckmark: false,
                    labelStyle: TextStyle(color: _graded == g ? p.onAccent : p.text),
                    onSelected: (_) => setState(() => _graded = g),
                  ),
              ]),
              const SizedBox(height: 12),
              if (shown.isEmpty)
                EmptyState(title: _graded ? l.emptyGeneric : l.teacherAllGraded, icon: Icons.task_alt_rounded)
              else
                CardGroup(children: [
                  for (final i in shown)
                    ListTile(
                      key: Key('queue-${i.submission.id}'),
                      minTileHeight: 64,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      leading: InitialsAvatar(i.submission.studentName, size: 40),
                      title: Text(i.submission.studentName, style: t.titleSmall),
                      subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${i.batch.code} · ${i.assignment.title}', style: t.bodySmall),
                        Text(l.teacherHandedIn(f.dayTime(i.submission.submittedAt)), style: t.bodySmall),
                        const SizedBox(height: 6),
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: SubmissionChips(submission: i.submission, maxScore: i.assignment.maxScore, late: i.late),
                        ),
                      ]),
                      trailing: Icon(Icons.chevron_right_rounded, color: p.muted),
                      onTap: () => showGradeSheet(context, submission: i.submission, assignment: i.assignment, classLabel: i.batch.code),
                    ),
                ]),
            ],
          );
        },
      ),
    );
  }
}
