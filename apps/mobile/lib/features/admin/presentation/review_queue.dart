import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/links.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../instructors/data/instructors_repository.dart';
import '../../instructors/domain/instructor_models.dart';
import '../../instructors/presentation/instructors_screen.dart';
import '../../teacher/data/proposals_repository.dart';
import '../../teacher/presentation/proposal_widgets.dart';

/// Admin: instructor applications and teachers' course and batch proposals waiting for a decision.
class ReviewQueueTab extends ConsumerWidget {
  const ReviewQueueTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final courses = ref.watch(pendingCoursesProvider);
    final batches = ref.watch(pendingBatchesProvider);
    final applications = ref.watch(pendingApplicationsProvider);
    Future<void> refresh() async {
      ref
        ..invalidate(pendingCoursesProvider)
        ..invalidate(pendingBatchesProvider)
        ..invalidate(pendingApplicationsProvider);
    }

    return AsyncView<List<Course>>(
      value: courses,
      onRetry: refresh,
      isEmpty: (list) => list.isEmpty && (batches.value?.isEmpty ?? false) && (applications.value?.isEmpty ?? false),
      empty: EmptyState(title: l.noPendingReviews, icon: Icons.task_alt_rounded),
      data: (courseList) {
        final batchList = batches.value ?? const <Batch>[];
        final applicationList = applications.value ?? const <InstructorApplication>[];
        return RefreshList(
          onRefresh: refresh,
          children: [
            if (applicationList.isNotEmpty) ...[
              SectionHeader(l.instructorApplicationsSection, padding: const EdgeInsets.only(top: 4, bottom: 10)),
              for (final a in applicationList) PendingApplicationTile(application: a),
            ],
            if (courseList.isNotEmpty) ...[
              SectionHeader(l.coursesSection, padding: const EdgeInsets.only(top: 4, bottom: 10)),
              for (final c in courseList) PendingCourseTile(course: c),
            ],
            if (batchList.isNotEmpty) ...[
              SectionHeader(l.batchesSection, padding: const EdgeInsets.only(top: 12, bottom: 10)),
              for (final b in batchList) PendingBatchTile(batch: b),
            ],
            if (batches.hasError) ErrorState(error: batches.error!, onRetry: refresh),
            if (applications.hasError) ErrorState(error: applications.error!, onRetry: refresh),
          ],
        );
      },
    );
  }
}

/// Approve / Send back row shared by both tiles.
class _Decision extends StatelessWidget {
  const _Decision({required this.id, required this.busy, required this.onDecide, this.rejectLabel, this.keyPrefix = ''});
  final String id;
  final bool busy;
  final void Function(bool approve) onDecide;
  final String? rejectLabel;
  final String keyPrefix;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Row(children: [
      Expanded(
        child: OutlinedButton(
          key: Key(keyPrefix.isEmpty ? 'send-back-$id' : '${keyPrefix}decline-$id'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: busy ? null : () => onDecide(false),
          child: Text(rejectLabel ?? l.sendBack),
        ),
      ),
      const SizedBox(width: 8),
      Expanded(
        child: FilledButton(
          key: Key('${keyPrefix}approve-$id'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: busy ? null : () => onDecide(true),
          child: Text(l.approve),
        ),
      ),
    ]);
  }
}

/// Runs an approve / send-back decision: asks for the note first when sending back.
Future<bool> _decide(
  BuildContext context,
  WidgetRef ref,
  bool approve,
  Future<void> Function(ProposalsRepository repo, String? note) run,
) async {
  final l = context.l10n;
  String? note;
  if (!approve) {
    note = await showSendBackDialog(context);
    if (note == null) return false;
  }
  try {
    await run(ref.read(proposalsRepositoryProvider), note);
    ref
      ..invalidate(pendingCoursesProvider)
      ..invalidate(pendingBatchesProvider);
    if (context.mounted) showToast(context, l.reviewDone);
    return true;
  } catch (e) {
    if (context.mounted) showToast(context, errorText(context, e));
    return false;
  }
}

class PendingCourseTile extends ConsumerStatefulWidget {
  const PendingCourseTile({super.key, required this.course});
  final Course course;

  @override
  ConsumerState<PendingCourseTile> createState() => _PendingCourseTileState();
}

class _PendingCourseTileState extends ConsumerState<PendingCourseTile> {
  bool _busy = false;

  Future<void> _onDecide(bool approve) async {
    setState(() => _busy = true);
    await _decide(context, ref, approve, (repo, note) => repo.reviewCourse(widget.course.id, approve: approve, note: note));
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final c = widget.course;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: RaisedCard(
        key: Key('pending-course-${c.id}'),
        onTap: () => context.push(Routes.course(c.id)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
              child: SizedBox.square(
                dimension: 48,
                child: MediaImage(c.coverImageUrl, fallback: ColoredBox(color: coverColor(c.coverStyle)), cacheWidth: 48),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c.title(locale), style: t.titleSmall),
                const SizedBox(height: 2),
                MonoLabel([if (c.categoryName(locale).isNotEmpty) c.categoryName(locale), levelLabel(l, c.level), if (c.priceFils != null) l.fromPrice(f.aed(c.priceFils!))].join(' · ')),
              ]),
            ),
          ]),
          const SizedBox(height: 8),
          if (c.description(locale).isNotEmpty)
            Text(c.description(locale), style: t.bodySmall, maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 6),
          Text(
            [
              l.modulesCount(f.n(c.modules.length)),
              if (c.submittedAt != null) l.submittedOn(f.shortDate(c.submittedAt!.toLocal())),
            ].join(' · '),
            style: t.bodySmall,
          ),
          const SizedBox(height: 12),
          _Decision(id: c.id, busy: _busy, onDecide: _onDecide),
        ]),
      ),
    );
  }
}

class PendingBatchTile extends ConsumerStatefulWidget {
  const PendingBatchTile({super.key, required this.batch});
  final Batch batch;

  @override
  ConsumerState<PendingBatchTile> createState() => _PendingBatchTileState();
}

class _PendingBatchTileState extends ConsumerState<PendingBatchTile> {
  bool _busy = false;

  Future<void> _onDecide(bool approve) async {
    setState(() => _busy = true);
    await _decide(context, ref, approve, (repo, note) => repo.reviewBatch(widget.batch.id, approve: approve, note: note));
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final b = widget.batch;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: RaisedCard(
        key: Key('pending-batch-${b.id}'),
        onTap: () => context.go(Routes.adminBatch(b.id)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Slate(b.code),
            const SizedBox(width: 8),
            Expanded(child: Text(b.course?.title(locale) ?? '', style: t.titleSmall)),
          ]),
          const SizedBox(height: 8),
          if (b.teacher != null) Text(l.proposedBy(b.teacher!.name), style: t.bodyMedium),
          Text(
            [
              scheduleLabel(f, b.schedule),
              if (b.startsOn != null) f.shortDate(b.startsOn!.toLocal()),
              '${l.batchSeats} ${f.n(b.capacity)}',
              languageLabel(l, b.language),
            ].where((s) => s.isNotEmpty).join(' · '),
            style: t.bodySmall,
          ),
          if (b.submittedAt != null) Text(l.submittedOn(f.shortDate(b.submittedAt!.toLocal())), style: t.bodySmall),
          const SizedBox(height: 12),
          _Decision(id: b.id, busy: _busy, onDecide: _onDecide),
        ]),
      ),
    );
  }
}

/// Asks the admin what needs to change. Returns the note (≥3 characters), or null when cancelled.
Future<String?> showSendBackDialog(BuildContext context, {String? title, String? label, String? hint, String? confirm}) =>
    showDialog<String>(
      context: context,
      builder: (_) => _SendBackDialog(title: title, label: label, hint: hint, confirm: confirm),
    );

class _SendBackDialog extends StatefulWidget {
  const _SendBackDialog({this.title, this.label, this.hint, this.confirm});
  final String? title;
  final String? label;
  final String? hint;
  final String? confirm;

  @override
  State<_SendBackDialog> createState() => _SendBackDialogState();
}

class _SendBackDialogState extends State<_SendBackDialog> {
  final _note = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _send() {
    final note = _note.text.trim();
    if (note.length < 3) return setState(() => _error = context.l10n.sendBackNoteTooShort);
    Navigator.pop(context, note);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AlertDialog(
      title: Text(widget.title ?? l.sendBackTitle),
      content: TextField(
        key: const Key('send-back-note'),
        controller: _note,
        autofocus: true,
        minLines: 2,
        maxLines: 5,
        maxLength: 1000,
        textCapitalization: TextCapitalization.sentences,
        onChanged: (_) {
          if (_error != null) setState(() => _error = null);
        },
        decoration: fieldDecoration(
          label: widget.label ?? l.sendBackNote,
          icon: Icons.edit_note_rounded,
          hint: widget.hint ?? l.sendBackNoteHint,
          action: ClearFieldButton(controller: _note),
        )
            .copyWith(errorText: _error),
      ),
      actions: [
        TextButton(style: TextButton.styleFrom(minimumSize: const Size(64, 44)), onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
        FilledButton(
          key: const Key('confirm-send-back'),
          style: FilledButton.styleFrom(minimumSize: const Size(64, 44)),
          onPressed: _send,
          child: Text(widget.confirm ?? l.sendBack),
        ),
      ],
    );
  }
}

/// A student's application to teach: who, what and why, with Approve / Decline (a note is required to decline).
class PendingApplicationTile extends ConsumerStatefulWidget {
  const PendingApplicationTile({super.key, required this.application});
  final InstructorApplication application;

  @override
  ConsumerState<PendingApplicationTile> createState() => _PendingApplicationTileState();
}

class _PendingApplicationTileState extends ConsumerState<PendingApplicationTile> {
  bool _busy = false;

  Future<void> _onDecide(bool approve) async {
    final l = context.l10n;
    String? note;
    if (!approve) {
      note = await showSendBackDialog(
        context,
        title: l.declineApplicationTitle,
        label: l.declineNoteLabel,
        hint: l.declineNoteHint,
        confirm: l.decline,
      );
      if (note == null) return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(instructorsRepositoryProvider).review(widget.application.id, approve: approve, note: note);
      ref.invalidate(pendingApplicationsProvider);
      if (mounted) showToast(context, l.reviewDone);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
      ref.invalidate(pendingApplicationsProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final categories = ref.watch(categoriesProvider).value ?? const <CourseCategory>[];
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final a = widget.application;
    final user = a.user;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: RaisedCard(
        key: Key('pending-application-${a.id}'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            InitialsAvatar(user?.name ?? '?', size: 44, color: p.accent, imageUrl: user?.image),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(user?.name ?? '', style: t.titleSmall),
                if (user != null) Text(user.email, style: t.bodySmall?.copyWith(color: p.muted)),
              ]),
            ),
          ]),
          const SizedBox(height: 12),
          Text(a.headline, style: t.titleSmall),
          const SizedBox(height: 4),
          Text(a.bio, style: t.bodySmall),
          if (a.categories.isNotEmpty || a.languages.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final slug in a.categories)
                StatusChip(label: categoryName(categories, slug, locale), color: p.successBg, textColor: p.success),
              for (final lang in a.languages) StatusChip(label: languageLabel(l, lang), look: ChipLook.outline, color: p.text),
            ]),
          ],
          const SizedBox(height: 10),
          MonoLabel(l.applicantExperience),
          const SizedBox(height: 2),
          Text(a.experience, style: t.bodySmall),
          if (a.phone != null) ...[const SizedBox(height: 6), Text(a.phone!, style: t.bodySmall, textDirection: TextDirection.ltr)],
          if (a.createdAt != null) ...[const SizedBox(height: 6), Text(l.submittedOn(f.shortDate(a.createdAt!)), style: t.bodySmall)],
          if (a.sampleUrl != null)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: Key('application-sample-${a.id}'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 44), padding: EdgeInsets.zero),
                onPressed: () => openExternal(context, a.sampleUrl),
                icon: const Icon(Icons.open_in_new_rounded, size: 18),
                label: Text(l.openSample),
              ),
            ),
          const SizedBox(height: 12),
          _Decision(id: a.id, busy: _busy, onDecide: _onDecide, rejectLabel: l.decline, keyPrefix: 'application-'),
        ]),
      ),
    );
  }
}
