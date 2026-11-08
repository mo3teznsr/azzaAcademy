import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../learn/data/file_uploads.dart';
import '../../learn/data/learn_repository.dart';
import '../../learn/data/quizzes_repository.dart';
import '../../learn/domain/quiz_models.dart';
import '../../learn/presentation/file_widgets.dart';
import '../../learn/presentation/quiz_widgets.dart';
import '../data/studio_repository.dart';
import '../domain/studio_models.dart';
import 'assignment_editor_screen.dart';

/// A section-card header action: labelled, at least 44pt.
class _HeaderAction extends StatelessWidget {
  const _HeaderAction({super.key, required this.label, required this.icon, required this.onPressed});
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => TextButton.icon(
        style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label),
      );
}

/// A tappable row inside a [SectionCard], divided by hairlines.
class _Row extends StatelessWidget {
  const _Row({super.key, required this.first, required this.title, required this.subtitle, this.trailing, this.onTap});
  final bool first;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    return InkWell(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 56),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: p.line))),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Text(subtitle, style: t.bodySmall),
            ]),
          ),
          ?trailing,
        ]),
      ),
    );
  }
}

/// Practice: the class's assignments (with grading) and quizzes (with the editor and results).
class HubPracticeSection extends ConsumerWidget {
  const HubPracticeSection({super.key, required this.batch});
  final Batch batch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final assignments = ref.watch(assignmentsProvider(batch.id));
    final quizzes = ref.watch(batchQuizzesProvider(batch.id));

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionCard(
        key: const Key('hub-assignments'),
        title: l.assignments,
        trailing: _HeaderAction(
          key: const Key('new-assignment'),
          label: l.teacherNewAssignment,
          icon: Icons.add_rounded,
          onPressed: () async {
            await context.push(Routes.teacherNewAssignment(batch.id));
            ref.invalidate(assignmentsProvider(batch.id));
          },
        ),
        child: AsyncView<List<Assignment>>(
          value: assignments,
          compact: true,
          onRetry: () => ref.invalidate(assignmentsProvider(batch.id)),
          isEmpty: (list) => list.isEmpty,
          empty: Text(l.teacherNoAssignments, style: t.bodySmall),
          data: (list) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (final (i, a) in list.indexed)
              _Row(
                key: Key('hub-assignment-${a.id}'),
                first: i == 0,
                title: a.title,
                subtitle: [
                  l.dueAt(f.dayTime(a.dueAt)),
                  l.teacherSubmittedCount(f.n(a.submissionCount ?? 0)),
                ].join(' · '),
                trailing: PopupMenuButton<String>(
                  key: Key('assignment-menu-${a.id}'),
                  tooltip: l.filesAssignmentActions,
                  icon: Icon(Icons.more_vert_rounded, color: p.muted),
                  onSelected: (action) async {
                    if (action == 'edit') {
                      await openAssignmentEditor(context, batch.id, assignment: a);
                      ref.invalidate(assignmentsProvider(batch.id));
                    } else {
                      await confirmDeleteAssignment(context, ref, batchId: batch.id, assignment: a);
                    }
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(key: const Key('assignment-edit'), value: 'edit', child: Text(l.filesEditAssignment)),
                    PopupMenuItem(key: const Key('assignment-delete'), value: 'delete', child: Text(l.filesDeleteAssignment)),
                  ],
                ),
                onTap: () => context.push(Routes.teacherAssignment(batch.id, a.id)),
              ),
          ]),
        ),
      ),
      SectionCard(
        key: const Key('hub-quizzes'),
        title: l.quizzesTitle,
        trailing: _HeaderAction(
          key: const Key('new-quiz'),
          label: l.teacherNewQuiz,
          icon: Icons.add_rounded,
          onPressed: () async {
            await context.push(Routes.teacherNewQuiz(batch.id));
            ref.invalidate(batchQuizzesProvider(batch.id));
          },
        ),
        child: AsyncView<List<QuizSummary>>(
          value: quizzes,
          compact: true,
          onRetry: () => ref.invalidate(batchQuizzesProvider(batch.id)),
          isEmpty: (list) => list.isEmpty,
          empty: Text(l.noQuizzes, style: t.bodySmall),
          data: (list) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (final (i, q) in list.indexed)
              _Row(
                key: Key('hub-quiz-${q.id}'),
                first: i == 0,
                title: q.title,
                subtitle: quizMetaLine(context, f, questionCount: q.questionCount, timeLimitMin: q.timeLimitMin, dueAt: q.dueAt),
                trailing: q.draft
                    ? StatusChip(label: l.batchDraft, color: p.muted, look: ChipLook.dashed)
                    : TextButton(
                        style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                        onPressed: () => context.push(Routes.quizResults(q.id)),
                        child: Text(l.teacherQuizResults),
                      ),
                onTap: () async {
                  await context.push(Routes.teacherEditQuiz(batch.id, q.id));
                  ref.invalidate(batchQuizzesProvider(batch.id));
                },
              ),
          ]),
        ),
      ),
    ]);
  }
}

String materialKindLabel(AppLocalizations l, MaterialKind k) => switch (k) {
      MaterialKind.slides => l.teacherMaterialSlides,
      MaterialKind.file => l.teacherMaterialFile,
      MaterialKind.link => l.linkLabel,
      MaterialKind.video => l.teacherMaterialVideo,
    };

IconData _kindIcon(MaterialKind k) => switch (k) {
      MaterialKind.slides => Icons.slideshow_outlined,
      MaterialKind.file => Icons.description_outlined,
      MaterialKind.link => Icons.link_rounded,
      MaterialKind.video => Icons.movie_outlined,
    };

/// Materials: what students can open from their library, plus "Add material".
class HubMaterialsSection extends ConsumerWidget {
  const HubMaterialsSection({super.key, required this.batch});
  final Batch batch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final materials = ref.watch(materialsProvider(batch.id));
    return SectionCard(
      key: const Key('hub-materials'),
      title: l.materials,
      trailing: _HeaderAction(
        key: const Key('add-material'),
        label: l.teacherAddMaterial,
        icon: Icons.add_rounded,
        onPressed: () async {
          final added = await showAddMaterialSheet(context, batch);
          if (added && context.mounted) {
            ref.invalidate(materialsProvider(batch.id));
            showToast(context, l.teacherMaterialAdded);
          }
        },
      ),
      child: AsyncView<List<CourseMaterial>>(
        value: materials,
        compact: true,
        onRetry: () => ref.invalidate(materialsProvider(batch.id)),
        isEmpty: (list) => list.isEmpty,
        empty: Text(l.teacherNoMaterials, style: t.bodySmall),
        data: (list) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final (i, m) in list.indexed)
            _Row(
              key: Key('hub-material-${m.id}'),
              first: i == 0,
              title: m.title,
              subtitle: [
                materialKindLabel(l, MaterialKind.parse(m.kind)),
                if (m.sessionId != null)
                  for (final s in batch.sessions.where((s) => s.id == m.sessionId)) 'S${s.number.toString().padLeft(2, '0')}',
              ].join(' · '),
              trailing: Icon(_kindIcon(MaterialKind.parse(m.kind)), color: p.muted),
              onTap: () => openExternal(context, m.url),
            ),
        ]),
      ),
    );
  }
}

/// Recordings of this class's sessions.
class HubRecordingsSection extends ConsumerWidget {
  const HubRecordingsSection({super.key, required this.batchId});
  final String batchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final recordings = ref.watch(recordingsProvider);
    return SectionCard(
      key: const Key('hub-recordings'),
      title: l.recordings,
      child: AsyncView<List<Recording>>(
        value: recordings.whenData((all) => all.where((r) => r.batchId == batchId).toList()..sort((a, b) => b.number.compareTo(a.number))),
        compact: true,
        onRetry: () => ref.invalidate(recordingsProvider),
        isEmpty: (list) => list.isEmpty,
        empty: Text(l.teacherNoClassRecordings, style: t.bodySmall),
        data: (list) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final (i, r) in list.indexed)
            _Row(
              key: Key('hub-recording-${r.sessionId}'),
              first: i == 0,
              title: 'S${r.number.toString().padLeft(2, '0')} · ${r.title}',
              subtitle: [
                if (r.recordedAt != null) f.shortDate(r.recordedAt!),
                if (r.durationSec != null) l.teacherMinutesShort(f.n((r.durationSec! / 60).round())),
                if (r.url == null) l.recordingProcessing,
              ].join(' · '),
              trailing: r.url == null
                  ? const Padding(padding: EdgeInsets.all(12), child: Icon(Icons.hourglass_top_rounded))
                  : IconButton(
                      tooltip: l.playRecording,
                      icon: const Icon(Icons.play_circle_outline_rounded),
                      onPressed: () => openExternal(context, r.url),
                    ),
              onTap: r.url == null ? null : () => openExternal(context, r.url),
            ),
        ]),
      ),
    );
  }
}

/// "Add material": a file or a video uploaded from the phone, or a titled link (slides, link, video).
/// Returns true when a material was added.
Future<bool> showAddMaterialSheet(BuildContext context, Batch batch) async {
  final added = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _AddMaterialSheet(batch: batch),
  );
  return added ?? false;
}

class _AddMaterialSheet extends ConsumerStatefulWidget {
  const _AddMaterialSheet({required this.batch});
  final Batch batch;

  @override
  ConsumerState<_AddMaterialSheet> createState() => _AddMaterialSheetState();
}

class _AddMaterialSheetState extends ConsumerState<_AddMaterialSheet> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _url = TextEditingController();
  MaterialKind _kind = MaterialKind.slides;
  String? _sessionId;
  String? _uploadedName;

  /// A document uploaded to the class's file store; saved as a FILE material (FILE only takes our URLs).
  AttachedFile? _file;

  /// Progress of the document upload, null when none is running.
  double? _fileProgress;
  bool _uploading = false;
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _url.dispose();
    super.dispose();
  }

  Future<void> _upload() async {
    final l = context.l10n;
    final file = await ref.read(materialFilePickerProvider).pickVideo();
    if (file == null || !mounted) return;
    if (file.size > maxMaterialVideoBytes) {
      showToast(context, l.teacherVideoTooLarge);
      return;
    }
    setState(() => _uploading = true);
    try {
      final url = await ref.read(teacherStudioRepositoryProvider).uploadVideo(file);
      if (!mounted) return;
      setState(() {
        _url.text = url;
        _kind = MaterialKind.video;
        _file = null;
        _uploadedName = file.name;
        if (_title.text.trim().isEmpty) _title.text = file.name.replaceAll(RegExp(r'\.[^.]+$'), '');
      });
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _uploadFile() async {
    final l = context.l10n;
    final f = ref.read(fmtProvider);
    final picked = await ref.read(documentPickerProvider).pick(materialFileRule.extensions);
    if (picked.isEmpty || !mounted) return;
    final file = picked.first;
    final refusal = materialFileRule.check(file);
    if (refusal != null) {
      showToast(context, switch (refusal) {
        FileRefusal.type => l.filesTypeRefused(file.name, materialFileRule.label),
        FileRefusal.tooLarge => l.filesTooLargeRefused(file.name, f.n(materialFileRule.maxMb)),
        FileRefusal.empty => l.filesEmptyRefused(file.name),
      });
      return;
    }
    setState(() => _fileProgress = 0);
    try {
      final stored = await ref.read(teacherStudioRepositoryProvider).uploadMaterialFile(
            widget.batch.id,
            file,
            onProgress: (v) {
              if (mounted && _fileProgress != null) setState(() => _fileProgress = v);
            },
          );
      if (!mounted) return;
      setState(() {
        _file = stored;
        _uploadedName = null;
        if (_title.text.trim().isEmpty) _title.text = stored.name.replaceAll(RegExp(r'\.[^.]+$'), '');
      });
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _fileProgress = null);
    }
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      await ref.read(teacherStudioRepositoryProvider).addMaterial(
            widget.batch.id,
            _file != null
                ? MaterialDraft(title: _title.text.trim(), url: _file!.url, kind: MaterialKind.file, sessionId: _sessionId)
                : MaterialDraft(title: _title.text.trim(), url: _url.text.trim(), kind: _kind, sessionId: _sessionId),
          );
      if (mounted) Navigator.pop(context, true);
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
    final sessions = widget.batch.sessions.where((s) => s.status != SessionStatus.cancelled).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
        child: Form(
          key: _form,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(l.teacherAddMaterial, style: t.titleLarge),
            const SizedBox(height: 4),
            Text(l.teacherAddMaterialLede, style: t.bodySmall),
            const SizedBox(height: 16),
            if (_file != null)
              FileRow(
                key: const Key('material-uploaded-file'),
                name: _file!.name,
                size: _file!.size,
                trailing: IconButton(
                  tooltip: l.filesRemove(_file!.name),
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: _busy ? null : () => setState(() => _file = null),
                ),
              )
            else
              OutlinedButton.icon(
                key: const Key('upload-material-file'),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                onPressed: _fileProgress != null || _uploading || _busy ? null : _uploadFile,
                icon: const Icon(Icons.upload_file_rounded, size: 20),
                label: Text(_fileProgress != null ? l.filesUploadingPercent(f.n((_fileProgress! * 100).round())) : l.filesUploadMaterial),
              ),
            if (_fileProgress != null) ...[
              const SizedBox(height: 6),
              LinearProgressIndicator(value: _fileProgress, minHeight: 4, borderRadius: BorderRadius.circular(2)),
            ],
            const SizedBox(height: 6),
            Text(l.filesUploadMaterialHint(materialFileRule.label, f.n(materialFileRule.maxMb)), style: t.bodySmall),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('upload-material-video'),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              onPressed: _uploading || _busy || _fileProgress != null ? null : _upload,
              icon: _uploading
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.upload_rounded, size: 20),
              label: Text(_uploading ? l.teacherUploading : (_uploadedName == null ? l.teacherUploadVideo : l.teacherUploadedFile(_uploadedName!))),
            ),
            const SizedBox(height: 6),
            Text(l.teacherUploadVideoHint, style: t.bodySmall?.copyWith(color: p.muted)),
            if (_file == null) ...[
              const SizedBox(height: 16),
              Text(l.filesLinkKindsNote, style: t.bodySmall),
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 8, children: [
                // FILE is only for files uploaded here: an outside link can't be a FILE material.
                for (final k in MaterialKind.values.where((k) => k != MaterialKind.file))
                  ChoiceChip(
                    key: Key('material-kind-${k.name}'),
                    label: Text(materialKindLabel(l, k)),
                    avatar: Icon(_kindIcon(k), size: 18, color: _kind == k ? p.onAccent : p.muted),
                    selected: _kind == k,
                    showCheckmark: false,
                    labelStyle: TextStyle(color: _kind == k ? p.onAccent : p.text),
                    onSelected: (_) => setState(() => _kind = k),
                  ),
              ]),
            ],
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('material-title'),
              controller: _title,
              textInputAction: TextInputAction.next,
              decoration: fieldDecoration(label: l.announcementTitleLabel, icon: Icons.title_rounded, hint: l.teacherMaterialTitleHint),
              validator: (v) => (v?.trim().length ?? 0) < 2 ? l.teacherTitleRequired : null,
            ),
            if (_file == null) ...[
              const SizedBox(height: 12),
              TextFormField(
                key: const Key('material-url'),
                controller: _url,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: fieldDecoration(label: l.linkLabel, icon: Icons.link_rounded, hint: 'https://', helper: l.teacherMaterialUrlHelper),
                validator: (v) {
                  final uri = Uri.tryParse(v?.trim() ?? '');
                  return uri != null && (uri.scheme == 'https' || uri.scheme == 'http') && uri.host.isNotEmpty ? null : l.teacherUrlInvalid;
                },
              ),
            ],
            if (sessions.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                key: const Key('material-session'),
                initialValue: _sessionId,
                isExpanded: true,
                decoration: fieldDecoration(label: l.teacherLinkSession, icon: Icons.event_outlined, helper: l.teacherOptional),
                items: [
                  DropdownMenuItem<String?>(value: null, child: Text(l.teacherNoSessionLink)),
                  for (final s in sessions)
                    DropdownMenuItem<String?>(value: s.id, child: Text('S${s.number.toString().padLeft(2, '0')} · ${s.title} · ${f.shortDate(s.startsAt)}', overflow: TextOverflow.ellipsis)),
                ],
                onChanged: (v) => setState(() => _sessionId = v),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              key: const Key('save-material'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              onPressed: _busy || _uploading || _fileProgress != null ? null : _save,
              child: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(l.teacherAddMaterial),
            ),
          ]),
        ),
      ),
    );
  }
}
