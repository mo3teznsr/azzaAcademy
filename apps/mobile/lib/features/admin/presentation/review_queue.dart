import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../../teacher/data/proposals_repository.dart';
import '../../teacher/presentation/proposal_widgets.dart';

/// Admin: teachers' course and batch proposals waiting for a decision.
class ReviewQueueTab extends ConsumerWidget {
  const ReviewQueueTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final courses = ref.watch(pendingCoursesProvider);
    final batches = ref.watch(pendingBatchesProvider);
    Future<void> refresh() async {
      ref
        ..invalidate(pendingCoursesProvider)
        ..invalidate(pendingBatchesProvider);
    }

    return AsyncView<List<Course>>(
      value: courses,
      onRetry: refresh,
      isEmpty: (list) => list.isEmpty && (batches.value?.isEmpty ?? false),
      empty: EmptyState(title: l.noPendingReviews, icon: Icons.task_alt_rounded),
      data: (courseList) {
        final batchList = batches.value ?? const <Batch>[];
        return RefreshList(
          onRefresh: refresh,
          children: [
            if (courseList.isNotEmpty) ...[
              SectionHeader(l.coursesSection, padding: const EdgeInsets.only(top: 4, bottom: 10)),
              for (final c in courseList) PendingCourseTile(course: c),
            ],
            if (batchList.isNotEmpty) ...[
              SectionHeader(l.batchesSection, padding: const EdgeInsets.only(top: 12, bottom: 10)),
              for (final b in batchList) PendingBatchTile(batch: b),
            ],
            if (batches.hasError) ErrorState(error: batches.error!, onRetry: refresh),
          ],
        );
      },
    );
  }
}

/// Approve / Send back row shared by both tiles.
class _Decision extends StatelessWidget {
  const _Decision({required this.id, required this.busy, required this.onDecide});
  final String id;
  final bool busy;
  final void Function(bool approve) onDecide;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Row(children: [
      Expanded(
        child: OutlinedButton(
          key: Key('send-back-$id'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: busy ? null : () => onDecide(false),
          child: Text(l.sendBack),
        ),
      ),
      const SizedBox(width: 8),
      Expanded(
        child: FilledButton(
          key: Key('approve-$id'),
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
                MonoLabel([if (c.categoryName(locale).isNotEmpty) c.categoryName(locale), levelLabel(l, c.level), f.aed(c.priceFils)].join(' · ')),
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
Future<String?> showSendBackDialog(BuildContext context) =>
    showDialog<String>(context: context, builder: (_) => const _SendBackDialog());

class _SendBackDialog extends StatefulWidget {
  const _SendBackDialog();

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
      title: Text(l.sendBackTitle),
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
        decoration: fieldDecoration(label: l.sendBackNote, icon: Icons.edit_note_rounded, action: ClearFieldButton(controller: _note))
            .copyWith(errorText: _error),
      ),
      actions: [
        TextButton(style: TextButton.styleFrom(minimumSize: const Size(64, 44)), onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
        FilledButton(
          key: const Key('confirm-send-back'),
          style: FilledButton.styleFrom(minimumSize: const Size(64, 44)),
          onPressed: _send,
          child: Text(l.sendBack),
        ),
      ],
    );
  }
}
