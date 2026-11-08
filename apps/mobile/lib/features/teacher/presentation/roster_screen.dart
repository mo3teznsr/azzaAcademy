import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../../../core/domain/enums.dart';
import '../../../core/network/error_text.dart';
import '../../catalog/domain/catalog_models.dart';
import '../data/proposals_repository.dart';
import '../data/teacher_repository.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../chat/presentation/messages_button.dart';
import '../../learn/data/learn_repository.dart';
import '../../learn/data/quizzes_repository.dart';
import 'batch_sessions_editor.dart';
import 'class_hub_sections.dart';
import 'proposal_widgets.dart';
import 'teacher_batches_screen.dart';

enum _RosterFilter { all, atRisk, waitlist }

/// The class hub's sections, in segmented-control order.
enum ClassHubSection {
  sessions,
  students,
  practice,
  materials,
  recordings;

  static ClassHubSection parse(String? raw) => values.firstWhere((s) => s.name == raw, orElse: () => ClassHubSection.sessions);
}

/// The class hub: sessions, students, practice, materials and recordings of one class, plus chat and announcements.
/// (The route is still `/batches/:id/roster`; `?tab=` opens a section.)
class RosterScreen extends ConsumerStatefulWidget {
  const RosterScreen({super.key, required this.batchId, this.initialSection = ClassHubSection.sessions, this.initialAtRisk = false});
  final String batchId;
  final ClassHubSection initialSection;

  /// Opens Students already filtered to at-risk (from Today's "Needs you").
  final bool initialAtRisk;

  @override
  ConsumerState<RosterScreen> createState() => _RosterScreenState();
}

class _RosterScreenState extends ConsumerState<RosterScreen> {
  late ClassHubSection _section = widget.initialSection;
  late _RosterFilter _filter = widget.initialAtRisk ? _RosterFilter.atRisk : _RosterFilter.all;
  String _q = '';

  Future<void> _refresh() async {
    ref
      ..invalidate(batchProvider(widget.batchId))
      ..invalidate(rosterProvider(widget.batchId));
    switch (_section) {
      case ClassHubSection.practice:
        ref
          ..invalidate(assignmentsProvider(widget.batchId))
          ..invalidate(batchQuizzesProvider(widget.batchId));
      case ClassHubSection.materials:
        ref.invalidate(materialsProvider(widget.batchId));
      case ClassHubSection.recordings:
        ref.invalidate(recordingsProvider);
      case ClassHubSection.sessions || ClassHubSection.students:
        break;
    }
  }

  String _sectionLabel(AppLocalizations l, ClassHubSection s) => switch (s) {
        ClassHubSection.sessions => l.teacherHubSessions,
        ClassHubSection.students => l.teacherHubStudents,
        ClassHubSection.practice => l.teacherHubPractice,
        ClassHubSection.materials => l.materials,
        ClassHubSection.recordings => l.recordings,
      };

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final batchAsync = ref.watch(batchProvider(widget.batchId));
    final batch = batchAsync.value;
    final roster = ref.watch(rosterProvider(widget.batchId));

    // Not approved yet: no students can be enrolled, so show the proposal instead of the hub.
    if (batch != null && batch.status.isProposal) {
      return Scaffold(
        appBar: AppBar(),
        body: RefreshList(
          onRefresh: () async => ref.invalidate(batchProvider(widget.batchId)),
          children: [
            Kicker('${batch.course?.title(locale) ?? ''} · ${scheduleLabel(f, batch.schedule)}'),
            DisplayText(l.teacherHubTitle(batch.course?.title(locale) ?? '', batch.code), size: 30),
            const SizedBox(height: 16),
            BatchProposalPanel(batch: batch),
          ],
        ),
      );
    }

    if (batch == null && batchAsync.hasError) {
      return Scaffold(appBar: AppBar(), body: ErrorState(error: batchAsync.error!, onRetry: () => ref.invalidate(batchProvider(widget.batchId))));
    }

    final all = roster.value ?? const <RosterStudent>[];
    final enrolled = all.where((s) => !s.waitlisted).toList();
    final pcts = enrolled.map((s) => s.attendancePct).whereType<double>().toList();
    final avg = pcts.isEmpty ? null : pcts.reduce((a, b) => a + b) / pcts.length;

    return Scaffold(
      appBar: AppBar(),
      body: RefreshList(
        onRefresh: _refresh,
        children: [
          if (batch != null) ...[
            Kicker(scheduleLabel(f, batch.schedule), size: 12),
            const SizedBox(height: 4),
            DisplayText(l.teacherHubTitle(batch.course?.title(locale) ?? '', batch.code), size: 30, key: const Key('class-hub-title')),
          ] else
            const LinearProgressIndicator(),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            ActionChip(
              key: const Key('roster-class-chat'),
              avatar: const Icon(Icons.forum_outlined, size: 18),
              label: Text(l.classChat),
              materialTapTargetSize: MaterialTapTargetSize.padded,
              onPressed: () => openClassChat(context, ref, widget.batchId),
            ),
            ActionChip(
              key: const Key('roster-announcements'),
              avatar: const Icon(Icons.campaign_outlined, size: 18),
              label: Text(l.announcementsTitle),
              materialTapTargetSize: MaterialTapTargetSize.padded,
              onPressed: () => context.push(Routes.batchAnnouncements(widget.batchId)),
            ),
          ]),
          SectionCard(
            margin: const EdgeInsets.only(top: 12),
            child: Row(children: [
              _Metric(
                label: l.enrolledLabel,
                value: roster.hasValue ? '${f.n(enrolled.length)}${batch == null ? '' : ' / ${f.n(batch.capacity)}'}' : '—',
              ),
              _Metric(label: l.avgAttendance, value: avg == null ? '—' : f.percent(avg)),
              if (batch != null) _Metric(label: l.doneLabel, value: '${f.n(batch.sessionsDone(DateTime.now()))} / ${f.n(batch.sessionCount)}'),
            ]),
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SegmentedButton<ClassHubSection>(
              key: const Key('class-hub-sections'),
              showSelectedIcon: false,
              style: const ButtonStyle(
                minimumSize: WidgetStatePropertyAll(Size(44, 44)),
                tapTargetSize: MaterialTapTargetSize.padded,
              ),
              segments: [
                for (final s in ClassHubSection.values)
                  ButtonSegment(value: s, label: Text(_sectionLabel(l, s), key: Key('hub-tab-${s.name}'))),
              ],
              selected: {_section},
              onSelectionChanged: (v) => setState(() => _section = v.first),
            ),
          ),
          const SizedBox(height: 4),
          ...switch (_section) {
            ClassHubSection.sessions => [
                if (batch != null) BatchSessionsPanel(batch: batch, isAdmin: ref.watch(currentUserProvider)?.role == Role.admin),
              ],
            ClassHubSection.students => _students(context, roster),
            ClassHubSection.practice => [if (batch != null) HubPracticeSection(batch: batch)],
            ClassHubSection.materials => [if (batch != null) HubMaterialsSection(batch: batch)],
            ClassHubSection.recordings => [HubRecordingsSection(batchId: widget.batchId)],
          },
        ],
      ),
    );
  }

  List<Widget> _students(BuildContext context, AsyncValue<List<RosterStudent>> roster) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    if (!roster.hasValue) {
      return [
        if (roster.hasError) ErrorState(error: roster.error!, onRetry: () => ref.invalidate(rosterProvider(widget.batchId))) else const LoadingState(compact: true),
      ];
    }
    final all = roster.requireValue;
    final enrolled = all.where((s) => !s.waitlisted).toList();
    final atRisk = enrolled.where((s) => s.atRisk).toList();
    final waitlist = all.where((s) => s.waitlisted).toList();
    final shown = switch (_filter) {
      _RosterFilter.all => enrolled,
      _RosterFilter.atRisk => atRisk,
      _RosterFilter.waitlist => waitlist,
    }
        .where((s) => _q.isEmpty || s.name.toLowerCase().contains(_q.toLowerCase()))
        .toList();
    return [
      const SizedBox(height: 12),
      TextField(
        key: const Key('roster-search'),
        onChanged: (v) => setState(() => _q = v.trim()),
        decoration: fieldDecoration(label: l.searchStudents, icon: Icons.search_rounded, labelIsHint: true),
      ),
      const SizedBox(height: 12),
      Wrap(spacing: 8, children: [
        for (final (flt, label, n) in [
          (_RosterFilter.all, l.allFilter, enrolled.length),
          (_RosterFilter.atRisk, l.atRisk, atRisk.length),
          (_RosterFilter.waitlist, l.waitlist, waitlist.length),
        ])
          ChoiceChip(
            label: Text('$label ${f.n(n)}'),
            selected: _filter == flt,
            showCheckmark: false,
            labelStyle: TextStyle(color: _filter == flt ? p.onAccent : p.text),
            onSelected: (_) => setState(() => _filter = flt),
          ),
      ]),
      const SizedBox(height: 12),
      if (shown.isEmpty)
        EmptyState(title: l.noStudents)
      else
        CardGroup(children: [
          for (final s in shown)
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              leading: InitialsAvatar(s.name, size: 40),
              title: Text(s.name, style: t.titleSmall),
              subtitle: Text(s.note ?? s.email, style: t.bodySmall),
              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                if (s.attendancePct != null) Text(f.percent(s.attendancePct!), style: t.titleSmall?.copyWith(color: s.atRisk ? p.danger : null)),
                if (s.atRisk) Kicker(l.atRisk, color: p.danger, size: 12),
                if (s.waitlisted) Kicker(l.waitlist, size: 12),
              ]),
            ),
        ]),
    ];
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Kicker(label, size: 12),
          const SizedBox(height: 2),
          DisplayText(value, size: 22),
        ]),
      );
}

/// A teacher's own batch that is still a proposal: its status, the admin's note, and "Submit for review".
class BatchProposalPanel extends ConsumerStatefulWidget {
  const BatchProposalPanel({super.key, required this.batch});
  final Batch batch;

  @override
  ConsumerState<BatchProposalPanel> createState() => _BatchProposalPanelState();
}

class _BatchProposalPanelState extends ConsumerState<BatchProposalPanel> {
  bool _busy = false;

  Future<void> _submit() async {
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      await ref.read(proposalsRepositoryProvider).submitBatch(widget.batch.id);
      ref
        ..invalidate(batchProvider(widget.batch.id))
        ..invalidate(teacherBatchesProvider);
      if (mounted) showToast(context, l.sentForReview);
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
    final b = widget.batch;
    final draft = b.status == BatchStatus.draft;
    return Column(key: const Key('batch-proposal'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        StatusChip.batch(context, b.status),
        const Spacer(),
        if (b.startsOn != null) Kicker(f.shortDate(b.startsOn!.toLocal())),
      ]),
      const SizedBox(height: 12),
      if (draft && (b.reviewNote?.isNotEmpty ?? false)) ...[
        ProposalNotice.changes(context, b.reviewNote!),
        const SizedBox(height: 12),
      ],
      if (draft)
        Text(l.batchDraftBody, style: Theme.of(context).textTheme.bodyMedium)
      else
        ProposalNotice.pending(context, l.batchPendingBody),
      if (draft) ...[
        const SizedBox(height: 16),
        BusyButton(key: const Key('submit-batch'), label: l.submitForReview, busy: _busy, onPressed: _submit),
      ],
    ]);
  }
}
