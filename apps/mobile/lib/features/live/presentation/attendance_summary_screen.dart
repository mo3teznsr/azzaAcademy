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
  AttendanceMark? _only;
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
        AttendanceMark.present => AzzaPalette.of(context).success,
        AttendanceMark.late => AzzaPalette.of(context).warning,
        AttendanceMark.leftEarly => AzzaPalette.of(context).danger,
        AttendanceMark.absent => AzzaPalette.of(context).muted,
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
                Kicker('${l.statusEnded} · ${Fmt.timecode(ran)}'),
                MonoLabel(d.slate),
                const SizedBox(height: 6),
                DisplayText(l.attendanceSummary, size: 34),
                Text(d.session.title, style: t.bodySmall),
                SectionCard(
                  key: const Key('attendance-breakdown'),
                  margin: const EdgeInsets.only(top: 16),
                  title: l.teacherAttendanceBreakdown,
                  trailing: Kicker(l.teacherAttendanceRate(f.percent(marked.isEmpty ? 0 : (count(AttendanceMark.present) + count(AttendanceMark.late) + count(AttendanceMark.leftEarly)) * 100 / marked.length)), size: 12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    if (marked.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AzzaSpace.radiusPill),
                        child: SizedBox(
                          height: 10,
                          child: Row(children: [
                            for (final m in AttendanceMark.values)
                              if (count(m) > 0) Expanded(flex: count(m), child: ColoredBox(color: _color(m))),
                          ]),
                        ),
                      ),
                    const SizedBox(height: 8),
                    for (final m in AttendanceMark.values)
                      InkWell(
                        key: Key('attendance-row-${m.name}'),
                        onTap: () => setState(() => _only = _only == m ? null : m),
                        child: Container(
                          constraints: const BoxConstraints(minHeight: 44),
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          color: _only == m ? _color(m).withValues(alpha: 0.12) : null,
                          child: Row(children: [
                            Container(width: 10, height: 10, decoration: BoxDecoration(color: _color(m), shape: BoxShape.circle)),
                            const SizedBox(width: 10),
                            Expanded(child: Text(_label(l, m), style: t.bodyMedium)),
                            Text(f.n(count(m)), key: Key('attendance-count-${m.name}'), style: t.titleSmall),
                            const SizedBox(width: 12),
                            SizedBox(
                              width: 48,
                              child: Text(
                                marked.isEmpty ? '—' : f.percent(count(m) * 100 / marked.length),
                                textAlign: TextAlign.end,
                                style: t.bodySmall?.copyWith(color: p.muted),
                              ),
                            ),
                          ]),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(_only == null ? l.attendanceRule : l.teacherAttendanceFiltered(_label(l, _only!)), style: t.bodySmall),
                  ]),
                ),
                const SizedBox(height: 12),
                if (list.isEmpty)
                  EmptyState(title: l.noStudents)
                else
                  CardGroup(children: [
                    for (final r in marked.where((r) => _only == null || r.mark == _only))
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                        leading: InitialsAvatar(r.name, size: 36),
                        title: Text(r.name),
                        subtitle: Kicker(
                          [
                            if (r.joinedAt != null) f.timeRange(r.joinedAt!, r.leftAt),
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
                  ]),
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
