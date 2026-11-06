import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/error_text.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../live/data/session_repository.dart';
import '../../live/domain/live_models.dart';
import '../../me/data/me_repository.dart';
import '../data/teacher_repository.dart';

/// Reschedule request: teacher proposes, admin approves, students get notified.
class RescheduleRequestScreen extends ConsumerStatefulWidget {
  const RescheduleRequestScreen({super.key, required this.sessionId});
  final String sessionId;

  @override
  ConsumerState<RescheduleRequestScreen> createState() => _RescheduleRequestScreenState();
}

class _RescheduleRequestScreenState extends ConsumerState<RescheduleRequestScreen> {
  DateTime? _day;
  TimeOfDay? _time;
  final _reason = TextEditingController();
  bool _notify = true;
  bool _busy = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final day = _day;
    final time = _time;
    if (day == null || time == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(sessionRepositoryProvider).reschedule(
            widget.sessionId,
            startsAt: DateTime(day.year, day.month, day.day, time.hour, time.minute),
            reason: _reason.text.trim().isEmpty ? null : _reason.text.trim(),
            notifyStudents: _notify,
          );
      if (!mounted) return;
      ref.invalidate(myRescheduleRequestsProvider);
      showToast(context, context.l10n.requestSent);
      context.pop();
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
    final detail = ref.watch(sessionDetailProvider(widget.sessionId));
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: Text(l.moveSession)),
      body: AsyncView<SessionDetail>(
        value: detail,
        onRetry: () => ref.invalidate(sessionDetailProvider(widget.sessionId)),
        data: (d) {
          final s = d.session;
          final start = startOfDay(DateTime.now()).add(const Duration(days: 1));
          final days = List.generate(14, (i) => start.add(Duration(days: i)));
          final presets = const [TimeOfDay(hour: 10, minute: 0), TimeOfDay(hour: 11, minute: 0), TimeOfDay(hour: 17, minute: 0), TimeOfDay(hour: 19, minute: 0)];
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
            children: [
              DisplayText(s.title, size: 30),
              MonoLabel('${d.slate} · ${f.dayTime(s.startsAt)}'),
              SectionHeader(l.newDay),
              SizedBox(
                height: 72,
                child: ListView(scrollDirection: Axis.horizontal, children: [
                  for (final day in days)
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 8),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => setState(() => _day = day),
                        child: Container(
                          width: 56,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: _day == day ? p.accent : p.raised,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: p.line),
                          ),
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            MonoLabel(f.weekday(day), size: 9, color: _day == day ? p.onAccent : p.muted),
                            Text(f.dayNumber(day), style: AzzaFonts.mono(size: 18, color: _day == day ? p.onAccent : p.text, tracking: 0)),
                          ]),
                        ),
                      ),
                    ),
                ]),
              ),
              SectionHeader(l.startTime),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final tm in presets)
                  ChoiceChip(
                    label: Text(tm.format(context)),
                    selected: _time == tm,
                    showCheckmark: false,
                    labelStyle: TextStyle(color: _time == tm ? p.onAccent : p.text),
                    onSelected: (_) => setState(() => _time = tm),
                  ),
                ActionChip(
                  avatar: const Icon(Icons.schedule_rounded, size: 18),
                  label: Text(_time != null && !presets.contains(_time) ? _time!.format(context) : '…'),
                  onPressed: () async {
                    final picked = await showTimePicker(context: context, initialTime: _time ?? TimeOfDay.fromDateTime(s.startsAt));
                    if (picked != null) setState(() => _time = picked);
                  },
                ),
              ]),
              const SizedBox(height: 20),
              TextField(controller: _reason, decoration: fieldDecoration(label: l.reason, icon: Icons.edit_note_rounded)),
              const SizedBox(height: 8),
              SwitchListTile(contentPadding: EdgeInsets.zero, title: Text(l.notifyStudents), value: _notify, onChanged: (v) => setState(() => _notify = v)),
              Text(l.adminReviews, style: t.bodySmall),
              _MyRequests(sessionId: widget.sessionId),
            ],
          );
        },
      ),
      bottomNavigationBar: BottomActionBar(children: [
        FilledButton(onPressed: _day == null || _time == null || _busy ? null : _send, child: Text(l.sendToAdmin)),
      ]),
    );
  }
}

/// The teacher's earlier requests for this session and their outcome.
class _MyRequests extends ConsumerWidget {
  const _MyRequests({required this.sessionId});
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final mine = (ref.watch(myRescheduleRequestsProvider).value ?? const <RescheduleRequest>[]).where((r) => r.sessionId == sessionId).toList();
    if (mine.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SectionHeader(l.myRescheduleRequests),
      for (final r in mine)
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(f.dayTime(r.startsAt)),
          subtitle: r.decisionNote == null && r.reason == null ? null : Text(r.decisionNote ?? r.reason!, style: t.bodySmall),
          trailing: StatusChip(
            label: switch (r.status) {
              'APPROVED' => l.requestApproved,
              'DECLINED' => l.requestDeclined,
              _ => l.requestPending,
            },
            color: switch (r.status) {
              'APPROVED' => AzzaPalette.of(context).successBg,
              'DECLINED' => AzzaPalette.of(context).dangerBg,
              _ => AzzaColors.green,
            },
            textColor: switch (r.status) {
              'APPROVED' => AzzaPalette.of(context).success,
              'DECLINED' => AzzaPalette.of(context).danger,
              _ => AzzaColors.inkDeep,
            },
          ),
        ),
    ]);
  }
}
