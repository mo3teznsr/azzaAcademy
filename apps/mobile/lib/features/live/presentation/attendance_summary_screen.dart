import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/session_repository.dart';
import '../domain/live_models.dart';

final attendanceProvider = FutureProvider.autoDispose.family<List<AttendanceRow>, String>((ref, id) async {
  final detail = await ref.watch(sessionDetailProvider(id).future);
  return ref.watch(sessionRepositoryProvider).attendance(id, sessionLength: detail.session.duration, startsAt: detail.session.startsAt);
});

/// Attendance summary after the host ends: filled from LiveKit join/leave events, teacher can correct.
class AttendanceSummaryScreen extends ConsumerStatefulWidget {
  const AttendanceSummaryScreen({super.key, required this.sessionId});
  final String sessionId;

  @override
  ConsumerState<AttendanceSummaryScreen> createState() => _AttendanceSummaryScreenState();
}

class _AttendanceSummaryScreenState extends ConsumerState<AttendanceSummaryScreen> {
  final Map<String, AttendanceMark> _edits = {};
  bool _saving = false;

  Future<void> _save() async {
    final l = context.l10n;
    if (_edits.isEmpty) {
      context.go(Routes.teacherToday);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(sessionRepositoryProvider).saveAttendance(widget.sessionId, Map.of(_edits));
      ref.invalidate(attendanceProvider(widget.sessionId));
      if (!mounted) return;
      showToast(context, l.saved);
      context.go(Routes.teacherToday);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _label(AppLocalizations l, AttendanceMark m) => switch (m) {
        AttendanceMark.present => l.present,
        AttendanceMark.late => l.late,
        AttendanceMark.leftEarly => l.leftEarly,
        AttendanceMark.absent => l.absent,
      };

  Color _color(AttendanceMark m) => switch (m) {
        AttendanceMark.present => AzzaColors.sage,
        AttendanceMark.late => AzzaColors.sun,
        AttendanceMark.leftEarly => AzzaColors.peach,
        AttendanceMark.absent => AzzaColors.muted,
      };

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final detail = ref.watch(sessionDetailProvider(widget.sessionId));
    final rows = ref.watch(attendanceProvider(widget.sessionId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(leading: CloseButton(onPressed: () => context.go(Routes.teacherToday))),
      body: AsyncView<SessionDetail>(
        value: detail,
        onRetry: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
        data: (d) => AsyncView<List<AttendanceRow>>(
          value: rows,
          onRetry: () => ref.invalidate(attendanceProvider(widget.sessionId)),
          data: (list) {
            final marked = [for (final r in list) r.withMark(_edits[r.userId] ?? r.mark)];
            int count(AttendanceMark m) => marked.where((r) => r.mark == m).length;
            final ran = d.startedAt != null && d.endedAt != null ? d.endedAt!.difference(d.startedAt!) : d.session.duration;
            return ListView(
              padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
              children: [
                MonoLabel('${l.statusEnded} · ${Fmt.timecode(ran)}'),
                MonoLabel(d.slate),
                const SizedBox(height: 6),
                DisplayText(l.attendanceSummary, size: 34),
                Text(d.session.title, style: t.bodySmall),
                const SizedBox(height: 16),
                Row(children: [
                  for (final m in AttendanceMark.values)
                    Expanded(
                      child: Column(children: [
                        DisplayText(f.n(count(m)), size: 30, color: m == AttendanceMark.absent ? p.muted : _color(m)),
                        MonoLabel(_label(l, m), size: 9),
                      ]),
                    ),
                ]),
                const SizedBox(height: 12),
                Text(l.attendanceRule, style: t.bodySmall),
                const SizedBox(height: 12),
                if (list.isEmpty) EmptyState(title: l.noStudents),
                for (final r in marked)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: InitialsAvatar(r.name, size: 36),
                    title: Text(r.name),
                    subtitle: MonoLabel(
                      [
                        if (r.joinedAt != null) '${f.time(r.joinedAt!)}–${r.leftAt == null ? '' : f.time(r.leftAt!)}',
                        '${f.n((r.seconds / 60).round())} min',
                      ].join(' · '),
                    ),
                    trailing: ActionChip(
                      label: Text(_label(l, r.mark)),
                      backgroundColor: _color(r.mark).withValues(alpha: 0.2),
                      side: BorderSide(color: _color(r.mark)),
                      onPressed: () => setState(() {
                        final next = AttendanceMark.values[(r.mark.index + 1) % AttendanceMark.values.length];
                        _edits[r.userId] = next;
                      }),
                    ),
                  ),
                const SizedBox(height: 16),
                RaisedCard(
                  child: Row(children: [
                    Icon(Icons.hourglass_top_rounded, color: p.accent),
                    const SizedBox(width: 12),
                    Expanded(child: Text(d.session.recordingUrl == null ? l.recordingProcessing : l.recordings, style: t.titleSmall)),
                  ]),
                ),
              ],
            );
          },
        ),
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton(
          key: const Key('save-attendance'),
          onPressed: _saving ? null : _save,
          child: Text(l.save),
        ),
      ]),
    );
  }
}
