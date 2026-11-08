import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/error_text.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../me/data/me_repository.dart';
import '../../me/domain/me_models.dart';
import '../../checkout/domain/checkout_models.dart' show PickedFile;
import '../data/file_uploads.dart';
import '../data/learn_repository.dart';
import 'file_widgets.dart';

/// Assignments: due, submitted, graded — with a quick submit card.
class AssignmentsScreen extends ConsumerStatefulWidget {
  const AssignmentsScreen({super.key, this.batchId});
  final String? batchId;

  @override
  ConsumerState<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends ConsumerState<AssignmentsScreen> {
  AssignmentState _tab = AssignmentState.due;
  late String? _batchId = widget.batchId;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final enrollments = ref.watch(enrollmentsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.assignments)),
      body: AsyncView<List<Enrollment>>(
        value: enrollments,
        onRetry: () => ref.invalidate(enrollmentsProvider),
        isEmpty: (list) => list.where((e) => e.isActive).isEmpty,
        empty: EmptyState(title: l.noAssignments, body: l.enrollFirst),
        data: (list) {
          final active = list.where((e) => e.isActive).toList();
          final batchId = active.any((e) => e.batch.id == _batchId) ? _batchId! : active.first.batch.id;
          final assignments = ref.watch(assignmentsProvider(batchId));
          return Column(children: [
            _ClassPicker(active: active, selected: batchId, onSelected: (id) => setState(() => _batchId = id)),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AzzaSpace.gutter),
              child: SegmentedButton<AssignmentState>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: AssignmentState.due, label: Text(l.dueTab)),
                  ButtonSegment(value: AssignmentState.submitted, label: Text(l.submittedTab)),
                  ButtonSegment(value: AssignmentState.graded, label: Text(l.gradedTab)),
                ],
                selected: {_tab},
                onSelectionChanged: (s) => setState(() => _tab = s.first),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: AsyncView<List<Assignment>>(
                value: assignments,
                onRetry: () => ref.invalidate(assignmentsProvider(batchId)),
                isEmpty: (all) => all.where((a) => a.state == _tab).isEmpty,
                empty: EmptyState(title: l.noAssignments),
                data: (all) => RefreshList(
                  onRefresh: () async => ref.invalidate(assignmentsProvider(batchId)),
                  children: [
                    for (final a in all.where((a) => a.state == _tab)) ...[
                      _AssignmentCard(assignment: a, batchId: batchId),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
              ),
            ),
          ]);
        },
      ),
    );
  }
}

class _AssignmentCard extends ConsumerStatefulWidget {
  const _AssignmentCard({required this.assignment, required this.batchId});
  final Assignment assignment;
  final String batchId;

  @override
  ConsumerState<_AssignmentCard> createState() => _AssignmentCardState();
}

/// A file being attached to a submission: uploading (with progress) until [uploaded] is set.
class _PendingFile {
  _PendingFile(this.picked);
  final PickedFile picked;
  double progress = 0;
  AttachedFile? uploaded;
}

class _AssignmentCardState extends ConsumerState<_AssignmentCard> {
  final _link = TextEditingController();
  final _text = TextEditingController();
  final List<_PendingFile> _files = [];
  bool _busy = false;

  @override
  void dispose() {
    _link.dispose();
    _text.dispose();
    super.dispose();
  }

  /// Picks files, refuses the ones the API would refuse, and uploads the rest in parallel.
  Future<void> _attach() async {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    final picked = await ref.read(documentPickerProvider).pick(submissionFileRule.extensions);
    if (!mounted) return;
    for (final file in picked) {
      if (_files.length >= maxSubmissionFiles) {
        showToast(context, f.n(l.filesTooMany(maxSubmissionFiles)));
        break;
      }
      final refusal = submissionFileRule.check(file);
      if (refusal != null) {
        showToast(context, switch (refusal) {
          FileRefusal.type => l.filesTypeRefused(file.name, submissionFileRule.label),
          FileRefusal.tooLarge => l.filesTooLargeRefused(file.name, f.n(submissionFileRule.maxMb)),
          FileRefusal.empty => l.filesEmptyRefused(file.name),
        });
        continue;
      }
      final pending = _PendingFile(file);
      setState(() => _files.add(pending));
      unawaited(_upload(pending));
    }
  }

  Future<void> _upload(_PendingFile pending) async {
    try {
      final stored = await ref.read(learnRepositoryProvider).uploadSubmissionFile(
            widget.assignment.id,
            pending.picked,
            onProgress: (v) {
              if (mounted && _files.contains(pending)) setState(() => pending.progress = v);
            },
          );
      if (mounted && _files.contains(pending)) setState(() => pending.uploaded = stored);
    } catch (e) {
      if (!mounted || !_files.contains(pending)) return;
      setState(() => _files.remove(pending));
      showToast(context, errorText(context, e));
    }
  }

  Future<void> _submit() async {
    if (_files.any((x) => x.uploaded == null)) {
      showToast(context, context.l10n.filesWaitForUpload);
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(learnRepositoryProvider).submit(
            widget.assignment.id,
            url: _link.text.trim().isEmpty ? null : _link.text.trim(),
            text: _text.text.trim().isEmpty ? null : _text.text.trim(),
            files: _files.isEmpty ? null : [for (final x in _files) x.uploaded!],
          );
      ref.invalidate(assignmentsProvider(widget.batchId));
      if (mounted) showToast(context, context.l10n.submittedOk);
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
    final a = widget.assignment;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final overdue = a.isOverdue(DateTime.now());
    return RaisedCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if (a.sessionNumber != null) Kicker(l.studentSessionN(f.n(a.sessionNumber!))),
          const Spacer(),
          if (a.state == AssignmentState.graded)
            StatusChip(label: l.scoreOf(f.n(a.score!), f.n(a.maxScore)), color: p.successBg, textColor: p.success)
          else if (overdue)
            StatusChip(key: Key('overdue-${a.id}'), label: l.studentOverdue, color: p.dangerBg, textColor: p.danger)
          else if (a.state == AssignmentState.submitted && a.submittedLate)
            StatusChip(label: l.studentSubmittedLate, color: p.warningBg, textColor: p.warning),
        ]),
        const SizedBox(height: 4),
        Text(
          overdue
              ? l.studentWasDue(f.dayTime(a.dueAt))
              : a.state == AssignmentState.submitted && a.submittedAt != null
                  ? l.studentSubmittedOn(f.dayTime(a.submittedAt!))
                  : l.dueAt(f.dayTime(a.dueAt)),
          style: t.bodySmall?.copyWith(color: overdue ? p.danger : null),
        ),
        const SizedBox(height: 8),
        Text(a.title, style: t.titleMedium),
        if (a.description.isNotEmpty) Text(a.description, style: t.bodySmall),
        if (a.feedback != null) ...[const SizedBox(height: 8), Text(a.feedback!, style: t.bodyMedium)],
        if (overdue) ...[const SizedBox(height: 8), Text(l.studentOverdueHint, style: t.bodySmall)],
        if (a.state != AssignmentState.due && a.files.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(l.filesYourFiles, style: t.labelLarge),
          const SizedBox(height: 4),
          AttachedFilesList(key: Key('my-files-${a.id}'), files: a.files),
        ],
        if (a.state == AssignmentState.due) ...[
          const SizedBox(height: 12),
          TextField(controller: _link, keyboardType: TextInputType.url, decoration: fieldDecoration(label: l.linkLabel, icon: Icons.link_rounded, action: ClearFieldButton(controller: _link))),
          const SizedBox(height: 8),
          TextField(controller: _text, maxLines: 3, minLines: 1, decoration: fieldDecoration(label: l.textLabel, icon: Icons.notes_rounded)),
          const SizedBox(height: 8),
          for (final x in _files)
            FileRow(
              key: Key('pending-file-${x.picked.name}'),
              name: x.picked.name,
              size: x.picked.size,
              progress: x.uploaded == null ? x.progress : null,
              trailing: IconButton(
                tooltip: l.filesRemove(x.picked.name),
                icon: const Icon(Icons.close_rounded, size: 20),
                onPressed: _busy ? null : () => setState(() => _files.remove(x)),
              ),
            ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              key: Key('attach-files-${a.id}'),
              style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
              onPressed: _busy || _files.length >= maxSubmissionFiles ? null : _attach,
              icon: const Icon(Icons.attach_file_rounded, size: 20),
              label: Text(l.filesAttach),
            ),
          ),
          Text(
            l.filesAttachHint(maxSubmissionFiles, f.n(maxSubmissionFiles), submissionFileRule.label, f.n(submissionFileRule.maxMb)),
            style: t.bodySmall,
          ),
          const SizedBox(height: 12),
          FilledButton(key: Key('submit-${a.id}'), onPressed: _busy ? null : _submit, child: Text(l.submitAssignment)),
        ],
      ]),
    );
  }
}

/// Which class's assignments are shown. Labelled by course (the code only tells two classes of one course apart).
class _ClassPicker extends ConsumerWidget {
  const _ClassPicker({required this.active, required this.selected, required this.onSelected});
  final List<Enrollment> active;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final p = AzzaPalette.of(context);
    String title(Enrollment e) => e.batch.course?.title(locale) ?? e.batch.code;
    final titles = active.map(title).toList();
    return Semantics(
      label: context.l10n.studentClassLabel,
      child: SizedBox(
        height: context.scaled(48),
        child: ListView(
          key: const Key('assignments-class-picker'),
          padding: const EdgeInsets.symmetric(horizontal: AzzaSpace.gutter),
          scrollDirection: Axis.horizontal,
          children: [
            for (final e in active)
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: ChoiceChip(
                  key: Key('class-${e.batch.id}'),
                  label: Text(titles.where((x) => x == title(e)).length > 1 ? '${title(e)} · ${e.batch.code}' : title(e)),
                  selected: e.batch.id == selected,
                  showCheckmark: false,
                  materialTapTargetSize: MaterialTapTargetSize.padded,
                  labelStyle: TextStyle(color: e.batch.id == selected ? p.onAccent : p.text),
                  onSelected: (_) => onSelected(e.batch.id),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
