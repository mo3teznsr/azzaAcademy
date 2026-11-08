import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../learn/data/learn_repository.dart';
import '../data/studio_repository.dart';
import '../domain/studio_models.dart';

/// Picks a date then a time; null when either is dismissed.
Future<DateTime?> pickDateTime(BuildContext context, {DateTime? initial}) async {
  final now = DateTime.now();
  final start = initial ?? now.add(const Duration(days: 7));
  final day = await showDatePicker(
    context: context,
    initialDate: start.isBefore(now) ? now : start,
    firstDate: DateTime(now.year, now.month, now.day),
    lastDate: now.add(const Duration(days: 365)),
  );
  if (day == null || !context.mounted) return null;
  final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(start));
  if (time == null) return null;
  return DateTime(day.year, day.month, day.day, time.hour, time.minute);
}

/// Opens the editor for [assignment] (or a new one) on top of the current route; true when saved.
Future<bool> openAssignmentEditor(BuildContext context, String batchId, {Assignment? assignment}) async {
  final saved = await Navigator.of(context).push<bool>(
    MaterialPageRoute(builder: (_) => AssignmentEditorScreen(batchId: batchId, assignment: assignment)),
  );
  return saved ?? false;
}

/// Asks before deleting [assignment], then deletes it. The API refuses (409 `ASSIGNMENT_HAS_SUBMISSIONS`)
/// once anyone has submitted; the dialog says so up front and the toast explains it. True when deleted.
Future<bool> confirmDeleteAssignment(BuildContext context, WidgetRef ref, {required String batchId, required Assignment assignment}) async {
  final l = context.l10n;
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(l.filesDeleteAssignmentTitle(assignment.title)),
      content: Text(l.filesDeleteAssignmentBody),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
        TextButton(key: const Key('confirm-delete-assignment'), onPressed: () => Navigator.pop(ctx, true), child: Text(l.filesDelete)),
      ],
    ),
  );
  if (ok != true || !context.mounted) return false;
  try {
    await ref.read(teacherStudioRepositoryProvider).deleteAssignment(assignment.id);
    ref.invalidate(assignmentsProvider(batchId));
    if (context.mounted) showToast(context, l.filesAssignmentDeleted);
    return true;
  } catch (e) {
    if (context.mounted) showToast(context, errorText(context, e));
    return false;
  }
}

/// An assignment for a class: title, instructions, due date, max score and an optional session.
/// Creates a new one, or edits [assignment] (`PATCH /assignments/:id`) when given.
class AssignmentEditorScreen extends ConsumerStatefulWidget {
  const AssignmentEditorScreen({super.key, required this.batchId, this.assignment});
  final String batchId;
  final Assignment? assignment;

  @override
  ConsumerState<AssignmentEditorScreen> createState() => _AssignmentEditorScreenState();
}

class _AssignmentEditorScreenState extends ConsumerState<AssignmentEditorScreen> {
  final _form = GlobalKey<FormState>();
  late final _title = TextEditingController(text: widget.assignment?.title ?? '');
  late final _instructions = TextEditingController(text: widget.assignment?.description ?? '');
  late final _maxScore = TextEditingController(text: '${widget.assignment?.maxScore ?? 100}');
  final _due = TextEditingController();
  late DateTime _dueAt = widget.assignment?.dueAt.toLocal() ?? _defaultDue();
  late String? _sessionId = widget.assignment?.sessionId;
  bool _busy = false;

  bool get _editing => widget.assignment != null;

  static DateTime _defaultDue() {
    final d = DateTime.now().add(const Duration(days: 7));
    return DateTime(d.year, d.month, d.day, 23, 0);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _due.text = ref.read(fmtProvider).dayTime(_dueAt);
  }

  @override
  void dispose() {
    _title.dispose();
    _instructions.dispose();
    _maxScore.dispose();
    _due.dispose();
    super.dispose();
  }

  Future<void> _pickDue() async {
    final picked = await pickDateTime(context, initial: _dueAt);
    if (picked == null || !mounted) return;
    setState(() {
      _dueAt = picked;
      _due.text = ref.read(fmtProvider).dayTime(picked);
    });
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      final draft = AssignmentDraft(
        title: _title.text.trim(),
        description: _instructions.text.trim(),
        dueAt: _dueAt,
        maxScore: int.parse(_maxScore.text.trim()),
        sessionId: _sessionId,
      );
      final studio = ref.read(teacherStudioRepositoryProvider);
      if (_editing) {
        await studio.updateAssignment(widget.assignment!.id, draft);
      } else {
        await studio.createAssignment(widget.batchId, draft);
      }
      ref.invalidate(assignmentsProvider(widget.batchId));
      if (!mounted) return;
      showToast(context, _editing ? l.filesAssignmentSaved : l.teacherAssignmentCreated);
      Navigator.of(context).pop(true);
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
    final locale = ref.watch(localeProvider);
    final batch = ref.watch(batchProvider(widget.batchId)).value;
    final t = Theme.of(context).textTheme;
    final sessions = (batch?.sessions ?? const []).where((s) => s.status != SessionStatus.cancelled).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(_editing ? l.filesEditAssignment : l.teacherNewAssignment),
        actions: [
          if (_editing)
            IconButton(
              key: const Key('delete-assignment'),
              tooltip: l.filesDeleteAssignment,
              icon: const Icon(Icons.delete_outline_rounded),
              onPressed: _busy
                  ? null
                  : () async {
                      final deleted = await confirmDeleteAssignment(context, ref, batchId: widget.batchId, assignment: widget.assignment!);
                      if (deleted && context.mounted) Navigator.of(context).pop(true);
                    },
            ),
        ],
      ),
      body: Form(
        key: _form,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
          children: [
            if (batch != null) Kicker('${batch.course?.title(locale) ?? ''} · ${batch.code}', size: 12),
            const SizedBox(height: 4),
            Text(l.teacherAssignmentLede, style: t.bodySmall),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('assignment-title'),
              controller: _title,
              textInputAction: TextInputAction.next,
              decoration: fieldDecoration(label: l.announcementTitleLabel, icon: Icons.title_rounded, hint: l.teacherAssignmentTitleHint),
              validator: (v) => (v?.trim().length ?? 0) < 2 ? l.teacherTitleRequired : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              key: const Key('assignment-instructions'),
              controller: _instructions,
              minLines: 4,
              maxLines: 10,
              decoration: fieldDecoration(label: l.teacherInstructions, icon: Icons.notes_rounded, hint: l.teacherInstructionsHint),
            ),
            const SizedBox(height: 12),
            TextFormField(
              key: const Key('assignment-due'),
              controller: _due,
              readOnly: true,
              onTap: _pickDue,
              decoration: fieldDecoration(
                label: l.quizDueLabel,
                icon: Icons.event_rounded,
                helper: l.teacherDueHelper,
                action: IconButton(tooltip: l.teacherChangeDue, onPressed: _pickDue, icon: const Icon(Icons.edit_calendar_rounded, size: 20)),
              ),
              // An unchanged due date on an existing assignment may already be past; only a new date must be ahead.
              validator: (_) => _dueAt.isBefore(DateTime.now()) && !(_editing && _dueAt == widget.assignment!.dueAt.toLocal()) ? l.teacherDueInPast : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              key: const Key('assignment-max-score'),
              controller: _maxScore,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: fieldDecoration(label: l.teacherMaxScore, icon: Icons.grade_outlined, helper: l.teacherMaxScoreHelper),
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                return n == null || n < 1 || n > 1000 ? l.teacherMaxScoreInvalid : null;
              },
            ),
            if (sessions.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                key: const Key('assignment-session'),
                initialValue: sessions.any((s) => s.id == _sessionId) ? _sessionId : null,
                isExpanded: true,
                decoration: fieldDecoration(label: l.teacherLinkSession, icon: Icons.event_outlined, helper: l.teacherOptional),
                items: [
                  DropdownMenuItem<String?>(value: null, child: Text(l.teacherNoSessionLink)),
                  for (final s in sessions)
                    DropdownMenuItem<String?>(
                      value: s.id,
                      child: Text('S${s.number.toString().padLeft(2, '0')} · ${s.title} · ${f.shortDate(s.startsAt)}', overflow: TextOverflow.ellipsis),
                    ),
                ],
                onChanged: (v) => setState(() => _sessionId = v),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton(
          key: const Key('save-assignment'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _busy ? null : _save,
          child: _busy
              ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : Text(_editing ? l.filesSaveChanges : l.teacherCreateAssignment),
        ),
      ]),
    );
  }
}
