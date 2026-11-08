import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/device_timezone.dart';
import '../../../core/utils/digits.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/count_stepper.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../data/batch_sessions_repository.dart';
import '../domain/proposal_models.dart';
import 'proposal_widgets.dart';

/// Upcoming sessions of a running batch with "Add session", "Move" and (admins) "Cancel".
/// Used on the teacher's batch screen (roster) and the admin batch detail.
class BatchSessionsPanel extends ConsumerStatefulWidget {
  const BatchSessionsPanel({super.key, required this.batch, required this.isAdmin});
  final Batch batch;
  final bool isAdmin;

  /// Rows shown before "Show all".
  static const preview = 6;

  @override
  ConsumerState<BatchSessionsPanel> createState() => _BatchSessionsPanelState();
}

class _BatchSessionsPanelState extends ConsumerState<BatchSessionsPanel> {
  bool _all = false;

  bool get _closed => widget.batch.status == BatchStatus.completed || widget.batch.status == BatchStatus.cancelled;

  Future<void> _add() async {
    final added = await showAddSessionSheet(context, widget.batch);
    if (added && mounted) {
      ref.invalidate(batchProvider(widget.batch.id));
      showToast(context, context.l10n.sessionAdded);
    }
  }

  Future<void> _move(SessionSummary s) async {
    await context.push(Routes.reschedule(s.id));
    if (mounted) ref.invalidate(batchProvider(widget.batch.id));
  }

  Future<void> _cancel(SessionSummary s) async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.cancelSessionTitle(Fmt.slate(widget.batch.code, s.number))),
        content: Text(l.cancelSessionBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.keepSession)),
          TextButton(
            key: const Key('confirm-cancel-session'),
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AzzaPalette.of(context).danger),
            child: Text(l.cancelSession),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ref.read(batchSessionsRepositoryProvider).cancelSession(s.id);
      ref.invalidate(batchProvider(widget.batch.id));
      if (mounted) showToast(context, l.sessionCancelled);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final now = DateTime.now();
    final upcoming = widget.batch.sessions.where((s) => s.status == SessionStatus.scheduled && s.startsAt.isAfter(now)).toList();
    final shown = _all ? upcoming : upcoming.take(BatchSessionsPanel.preview).toList();

    return SectionCard(
      key: const Key('batch-sessions'),
      title: l.upcomingSessions,
      trailing: _closed
          ? null
          : TextButton.icon(
              key: const Key('add-session'),
              style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
              onPressed: _add,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text(l.addSession),
            ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (upcoming.isEmpty) Text(l.noUpcomingSessions, style: t.bodySmall),
        for (final (i, s) in shown.indexed)
          Container(
            key: Key('session-row-${s.id}'),
            padding: const EdgeInsets.symmetric(vertical: 6),
            decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
            child: Row(children: [
              SizedBox(width: 44, child: MonoLabel('S${f.n(s.number)}')),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s.title, style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(f.dayTime(s.startsAt), style: t.bodySmall),
                ]),
              ),
              IconButton(
                key: Key('move-session-${s.id}'),
                tooltip: widget.isAdmin ? l.moveSessionAction : l.requestMove,
                onPressed: () => _move(s),
                icon: const Icon(Icons.edit_calendar_outlined, size: 20),
              ),
              if (widget.isAdmin)
                IconButton(
                  key: Key('cancel-session-${s.id}'),
                  tooltip: l.cancelSession,
                  onPressed: () => _cancel(s),
                  icon: Icon(Icons.event_busy_outlined, size: 20, color: p.danger),
                ),
            ]),
          ),
        if (!_all && upcoming.length > BatchSessionsPanel.preview)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
              onPressed: () => setState(() => _all = true),
              child: Text(l.showAllN(f.n(upcoming.length))),
            ),
          ),
      ]),
    );
  }
}

// ───────────────────────── Add session ─────────────────────────

/// Opens the "Add session" sheet; true when a session was added.
Future<bool> showAddSessionSheet(BuildContext context, Batch batch) async =>
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _AddSessionSheet(batch: batch),
    ) ??
    false;

class _AddSessionSheet extends ConsumerStatefulWidget {
  const _AddSessionSheet({required this.batch});
  final Batch batch;

  @override
  ConsumerState<_AddSessionSheet> createState() => _AddSessionSheetState();
}

class _AddSessionSheetState extends ConsumerState<_AddSessionSheet> {
  final _title = TextEditingController();
  late DateTime _day = DateUtils.dateOnly(DateTime.now().add(const Duration(days: 1)));
  late TimeOfDay _time = _defaultTime();
  late int _duration = widget.batch.schedule.durationMin.clamp(NewSessionDraft.minMinutes, NewSessionDraft.maxMinutes);
  bool _notify = true;
  bool _busy = false;
  String? _error;
  List<ScheduleConflict> _clashes = const [];
  String? _device;

  TimeOfDay _defaultTime() {
    final parts = widget.batch.schedule.startTime.split(':');
    final h = parts.isNotEmpty ? int.tryParse(parts[0]) : null;
    final m = parts.length > 1 ? int.tryParse(parts[1]) : null;
    return h == null ? const TimeOfDay(hour: 19, minute: 0) : TimeOfDay(hour: h, minute: m ?? 0);
  }

  @override
  void initState() {
    super.initState();
    deviceTimezone().then((tz) {
      if (mounted && tz != null) setState(() => _device = tz);
    });
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  DateTime get _startsAt => DateTime(_day.year, _day.month, _day.day, _time.hour, _time.minute);

  Future<void> _pickDay() async {
    final now = DateUtils.dateOnly(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: _day.isBefore(now) ? now : _day,
      firstDate: now,
      lastDate: now.add(const Duration(days: 730)),
    );
    if (picked != null) setState(() => _day = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) setState(() => _time = picked);
  }

  Future<void> _save() async {
    final l = context.l10n;
    if (_title.text.trim().length < 2) return setState(() => _error = l.sessionTitleRequired);
    if (!_startsAt.isAfter(DateTime.now())) return setState(() => _error = l.errStartInPast);
    setState(() {
      _busy = true;
      _error = null;
      _clashes = const [];
    });
    try {
      await ref.read(batchSessionsRepositoryProvider).addSession(
            widget.batch.id,
            NewSessionDraft(startsAt: _startsAt, durationMin: _duration, title: _title.text, notifyStudents: _notify),
          );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      final err = AppException.from(e);
      setState(() {
        _clashes = err.code == 'CONFLICT' ? ScheduleConflict.fromDetails(err.details) : const [];
        _error = err.describe(context);
      });
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
    final tz = widget.batch.timezone;
    final otherZone = _device != null && _device != tz;
    final hhmm = '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

    Widget tappable({required Key key, required String label, required IconData icon, required String value, String? helper, required VoidCallback onTap}) =>
        InkWell(
          key: key,
          onTap: _busy ? null : onTap,
          borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
          child: InputDecorator(
            decoration: fieldDecoration(label: label, icon: icon, helper: helper, action: const Icon(Icons.expand_more_rounded)),
            child: Text(value, style: t.bodyLarge),
          ),
        );

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        key: const Key('add-session-sheet'),
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          Text(l.addSessionTitle(widget.batch.code), style: t.titleLarge),
          const SizedBox(height: 4),
          Text(l.addSessionLead, style: t.bodySmall),
          const SizedBox(height: 16),
          TextField(
            key: const Key('session-title'),
            controller: _title,
            maxLength: 120,
            textCapitalization: TextCapitalization.sentences,
            decoration: fieldDecoration(
              label: l.sessionTitleLabel,
              icon: Icons.title_rounded,
              hint: l.sessionTitleHint,
              action: ClearFieldButton(controller: _title),
            ),
          ),
          const SizedBox(height: 4),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: tappable(
                key: const Key('session-date'),
                label: l.sessionDate,
                icon: Icons.event_outlined,
                value: f.dayLabel(_day),
                onTap: _pickDay,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: tappable(
                key: const Key('session-time'),
                label: l.startTime,
                icon: Icons.schedule_rounded,
                value: hhmm.digits(f.arabicDigits),
                onTap: _pickTime,
              ),
            ),
          ]),
          const SizedBox(height: 8),
          Row(key: const Key('session-timezone'), crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.public_rounded, size: 16, color: otherZone ? p.warning : p.muted),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                otherZone ? l.sessionTimeOtherZone(_device!, tz) : l.sessionTimeZone(tz),
                style: t.bodySmall?.copyWith(color: otherZone ? p.warning : null),
              ),
            ),
          ]),
          const SizedBox(height: 14),
          CountStepper(
            key: const ValueKey('session-duration'),
            label: l.sessionLength,
            icon: Icons.timelapse_rounded,
            value: _duration,
            min: NewSessionDraft.minMinutes,
            max: NewSessionDraft.maxMinutes,
            step: 15,
            helper: l.sessionLengthHelper,
            arabicDigits: f.arabicDigits,
            enabled: !_busy,
            onChanged: (v) => setState(() => _duration = v),
          ),
          SwitchListTile(
            key: const Key('session-notify'),
            contentPadding: EdgeInsets.zero,
            title: Text(l.notifyStudentsNow),
            subtitle: Text(l.notifyStudentsNowSub, style: t.bodySmall),
            value: _notify,
            onChanged: _busy ? null : (v) => setState(() => _notify = v),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            ProposalNotice(
              key: const Key('add-session-error'),
              title: _clashes.isEmpty ? l.couldNotAddSession : l.conflictCount(f.n(_clashes.length)),
              body: _error!,
              icon: _clashes.isEmpty ? Icons.error_outline_rounded : Icons.event_busy_rounded,
              tint: p.danger,
            ),
            for (final c in _clashes)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(children: [
                  Icon(Icons.circle, size: 6, color: p.danger),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Kicker(
                      [l.conflictWith(c.withBatch), if (c.localDate.isNotEmpty) c.localDate.digits(f.arabicDigits)].join(' · '),
                      color: p.danger,
                    ),
                  ),
                ]),
              ),
          ],
          const SizedBox(height: 16),
          BusyButton(key: const Key('save-session'), label: l.addSession, icon: Icons.add_rounded, busy: _busy, onPressed: _save),
        ]),
      ),
    );
  }
}

// ───────────────────────── Edit seats ─────────────────────────

/// Opens the "Edit seats" sheet (`PATCH /batches/:id { capacity }`); returns the updated batch or null.
Future<Batch?> showEditSeatsSheet(BuildContext context, Batch batch) => showModalBottomSheet<Batch>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _EditSeatsSheet(batch: batch),
    );

class _EditSeatsSheet extends ConsumerStatefulWidget {
  const _EditSeatsSheet({required this.batch});
  final Batch batch;

  @override
  ConsumerState<_EditSeatsSheet> createState() => _EditSeatsSheetState();
}

class _EditSeatsSheetState extends ConsumerState<_EditSeatsSheet> {
  late int _seats = widget.batch.capacity.clamp(1, 500);
  bool _busy = false;
  String? _error;

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await ref.read(batchSessionsRepositoryProvider).updateCapacity(widget.batch.id, _seats);
      if (mounted) Navigator.pop(context, updated);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
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
    final b = widget.batch;
    return SingleChildScrollView(
      key: const Key('edit-seats-sheet'),
      padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Text(l.editSeatsTitle(b.code), style: t.titleLarge),
        const SizedBox(height: 4),
        Text(f.n(l.editSeatsLead(b.seatsTaken)), style: t.bodySmall),
        const SizedBox(height: 16),
        CountStepper(
          key: const ValueKey('seats-stepper'),
          label: l.batchSeats,
          icon: Icons.event_seat_outlined,
          value: _seats,
          min: 1,
          max: 500,
          helper: l.seatsHelper,
          arabicDigits: f.arabicDigits,
          enabled: !_busy,
          onChanged: (v) => setState(() => _seats = v),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          ProposalNotice(key: const Key('edit-seats-error'), title: l.couldNotSaveSeats, body: _error!, icon: Icons.error_outline_rounded, tint: p.danger),
        ],
        const SizedBox(height: 16),
        BusyButton(key: const Key('save-seats'), label: l.saveSeats, busy: _busy, onPressed: _seats == b.capacity ? null : _save),
      ]),
    );
  }
}
