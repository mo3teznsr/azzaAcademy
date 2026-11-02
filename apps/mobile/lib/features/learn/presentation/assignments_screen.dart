import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../me/data/me_repository.dart';
import '../../me/domain/me_models.dart';
import '../data/learn_repository.dart';

/// Assignments: due, submitted, graded — with a quick submit card.
class AssignmentsScreen extends ConsumerStatefulWidget {
  const AssignmentsScreen({super.key, this.batchId});
  final String? batchId;

  @override
  ConsumerState<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends ConsumerState<AssignmentsScreen> {
  AssignmentState _tab = AssignmentState.due;

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
          final batchId = widget.batchId ?? list.firstWhere((e) => e.isActive).batch.id;
          final assignments = ref.watch(assignmentsProvider(batchId));
          return Column(children: [
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

class _AssignmentCardState extends ConsumerState<_AssignmentCard> {
  final _link = TextEditingController();
  final _text = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _link.dispose();
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await ref.read(learnRepositoryProvider).submit(
            widget.assignment.id,
            url: _link.text.trim().isEmpty ? null : _link.text.trim(),
            text: _text.text.trim().isEmpty ? null : _text.text.trim(),
          );
      ref.invalidate(assignmentsProvider(widget.batchId));
      if (mounted) showToast(context, context.l10n.submittedOk);
    } catch (e) {
      if (mounted) showToast(context, AppException.from(e).message);
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
    return RaisedCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if (a.sessionNumber != null) MonoLabel('S${a.sessionNumber.toString().padLeft(2, '0')} · ${a.batchCode}'),
          const Spacer(),
          if (a.state == AssignmentState.graded)
            StatusChip(label: l.scoreOf(f.n(a.score!), f.n(a.maxScore)), color: AzzaColors.sage)
          else
            MonoLabel(l.dueAt(f.dayTime(a.dueAt)), color: a.dueAt.isBefore(DateTime.now()) ? AzzaColors.peach : null),
        ]),
        const SizedBox(height: 8),
        Text(a.title, style: t.titleMedium),
        if (a.description.isNotEmpty) Text(a.description, style: t.bodySmall),
        if (a.feedback != null) ...[const SizedBox(height: 8), Text(a.feedback!, style: t.bodyMedium)],
        if (a.state == AssignmentState.due) ...[
          const SizedBox(height: 12),
          TextField(controller: _link, keyboardType: TextInputType.url, decoration: InputDecoration(labelText: l.linkLabel)),
          const SizedBox(height: 8),
          TextField(controller: _text, maxLines: 3, minLines: 1, decoration: InputDecoration(labelText: l.textLabel)),
          const SizedBox(height: 12),
          FilledButton(onPressed: _busy ? null : _submit, child: Text(l.submitAssignment)),
        ],
      ]),
    );
  }
}
