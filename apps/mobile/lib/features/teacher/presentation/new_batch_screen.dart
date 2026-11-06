import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/app_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/device_timezone.dart';
import '../../../core/utils/digits.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/count_stepper.dart';
import '../../../core/widgets/ui.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/domain/catalog_models.dart';
import '../data/proposals_repository.dart';
import '../domain/proposal_models.dart';
import 'proposal_widgets.dart';
import 'teacher_batches_screen.dart';

/// Teacher: propose a batch — course, code, seats, language, timezone and the weekly rule. "Preview schedule"
/// lists every session and any clash with the teacher's other batches; "Create batch" saves it as a DRAFT,
/// then "Submit for review" hands it to the admins.
class NewBatchScreen extends ConsumerStatefulWidget {
  const NewBatchScreen({super.key});

  @override
  ConsumerState<NewBatchScreen> createState() => _NewBatchScreenState();
}

class _NewBatchScreenState extends ConsumerState<NewBatchScreen> {
  final _code = TextEditingController();
  final _price = TextEditingController();
  int _seats = 12;
  final _timezone = TextEditingController();
  final _duration = TextEditingController(text: '90');
  final _sessions = TextEditingController(text: '8');
  String? _courseId;
  SessionLanguage _language = SessionLanguage.en;
  DateTime _startsOn = DateUtils.dateOnly(DateTime.now().add(const Duration(days: 7)));
  TimeOfDay _startTime = const TimeOfDay(hour: 19, minute: 0);
  final Set<int> _weekdays = {};
  String? _device;

  SchedulePreview? _preview;
  Batch? _created;
  bool _previewing = false;
  bool _creating = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _timezone.text = ref.read(currentUserProvider)?.timezone ?? '';
    if (_timezone.text.isEmpty) _timezone.text = 'Asia/Dubai';
    deviceTimezone().then((tz) {
      if (!mounted || tz == null) return;
      setState(() {
        _device = tz;
        _timezone.text = tz; // default to the phone's timezone
      });
    });
  }

  @override
  void dispose() {
    for (final c in [_code, _price, _timezone, _duration, _sessions]) {
      c.dispose();
    }
    super.dispose();
  }

  String get _hhmm => '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}';

  int? _int(TextEditingController c) => int.tryParse(c.text.trim());

  /// Seat price in AED, or null when empty / not a positive number.
  num? get _priceAed {
    final v = num.tryParse(_price.text.trim().replaceAll(',', '.'));
    return v == null || v <= 0 ? null : v;
  }

  /// The first schedule problem, or null.
  String? _scheduleProblem() {
    final l = context.l10n;
    if (_weekdays.isEmpty) return l.pickWeekdays;
    final d = _int(_duration);
    if (d == null || d < 15 || d > 480) return l.lengthInvalid;
    final n = _int(_sessions);
    if (n == null || n < 1 || n > 200) return l.sessionCountInvalid;
    return null;
  }

  ScheduleDraft _schedule() => ScheduleDraft(
        weekdays: _weekdays.toList(),
        startTime: _hhmm,
        durationMin: _int(_duration)!,
        sessionCount: _int(_sessions)!,
        startsOn: _startsOn,
      );

  void _changed() {
    if (_preview != null) setState(() => _preview = null); // stale once the rule changes
  }

  Future<void> _runPreview() async {
    final problem = _scheduleProblem();
    if (problem != null) return showToast(context, problem);
    setState(() => _previewing = true);
    try {
      final preview = await ref.read(proposalsRepositoryProvider).previewSchedule(_schedule(), timezone: _timezone.text.trim());
      if (mounted) setState(() => _preview = preview);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _previewing = false);
    }
  }

  Future<void> _create() async {
    final l = context.l10n;
    if (_courseId == null) return showToast(context, l.pickCourse);
    if (!BatchDraft.codePattern.hasMatch(_code.text.trim())) return showToast(context, l.batchCodeInvalid);
    final price = _priceAed;
    if (price == null) return showToast(context, l.seatPriceRequired);
    final seats = _seats;
    if (seats < 1 || seats > 500) return showToast(context, l.seatsInvalid);
    final problem = _scheduleProblem();
    if (problem != null) return showToast(context, problem);
    setState(() => _creating = true);
    try {
      final batch = await ref.read(proposalsRepositoryProvider).createBatch(BatchDraft(
            courseId: _courseId!,
            code: _code.text.trim(),
            capacity: seats,
            priceAed: price,
            language: _language,
            timezone: _timezone.text.trim(),
            schedule: _schedule(),
          ));
      ref.invalidate(teacherBatchesProvider);
      if (!mounted) return;
      setState(() => _created = batch);
      showToast(context, l.batchCreated);
    } catch (e) {
      if (!mounted) return;
      final err = AppException.from(e);
      final conflicts = err.code == 'CONFLICT' ? ScheduleConflict.fromDetails(err.details) : const <ScheduleConflict>[];
      if (conflicts.isNotEmpty) {
        // Show the clash on the preview list (fetch it when the teacher has not previewed yet).
        setState(() => _preview = SchedulePreview(sessions: _preview?.sessions ?? const [], conflicts: conflicts));
      }
      showToast(context, err.describe(context));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _submit() async {
    final batch = _created;
    if (batch == null) return;
    setState(() => _submitting = true);
    try {
      final updated = await ref.read(proposalsRepositoryProvider).submitBatch(batch.id);
      ref.invalidate(teacherBatchesProvider);
      if (!mounted) return;
      setState(() => _created = updated.id.isEmpty ? batch : updated);
      showToast(context, context.l10n.sentForReview);
    } catch (e) {
      if (mounted) showToast(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickDate() async {
    final now = DateUtils.dateOnly(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: _startsOn.isBefore(now) ? now : _startsOn,
      firstDate: now,
      lastDate: now.add(const Duration(days: 730)),
    );
    if (picked != null) {
      setState(() => _startsOn = picked);
      _changed();
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _startTime);
    if (picked != null) {
      setState(() => _startTime = picked);
      _changed();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final courses = ref.watch(batchableCoursesProvider);
    final locked = _created != null;

    Widget tappable({required Key key, required String label, required IconData icon, required String value, required VoidCallback onTap}) =>
        InkWell(
          key: key,
          onTap: locked ? null : onTap,
          borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
          child: InputDecorator(
            decoration: fieldDecoration(label: label, icon: icon, action: const Icon(Icons.expand_more_rounded)),
            child: Text(value, style: t.bodyLarge),
          ),
        );

    Widget section(String? title, List<Widget> children) => SectionCard(
          title: title,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        );

    final children = <Widget>[
      if (_created != null) ...[
        _CreatedCard(batch: _created!, submitting: _submitting, onSubmit: _submit),
        const SizedBox(height: 8),
      ],
      section(null, [
        AsyncView<List<Course>>(
          value: courses,
          onRetry: () => ref.invalidate(batchableCoursesProvider),
          isEmpty: (list) => list.isEmpty,
          empty: EmptyState(title: l.noBatchableCourses, icon: Icons.auto_stories_outlined),
          data: (list) => DropdownButtonFormField<String>(
            key: const Key('batch-course'),
            initialValue: _courseId,
            isExpanded: true,
            hint: Text(l.pickCourse),
            decoration: fieldDecoration(label: l.batchCourse, icon: Icons.auto_stories_outlined),
            items: [
              for (final c in list)
                DropdownMenuItem(
                  value: c.id,
                  child: Text(
                    c.status == CourseStatus.published ? c.title(locale) : '${c.title(locale)} · ${_statusWord(l, c.status)}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: locked
                ? null
                : (id) => setState(() {
                      _courseId = id;
                      final course = list.where((c) => c.id == id).firstOrNull;
                      if (course != null && course.modules.isNotEmpty) _sessions.text = '${course.modules.length}';
                    }),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
              key: const Key('batch-code'),
              controller: _code,
              readOnly: locked,
              textCapitalization: TextCapitalization.characters,
              textDirection: TextDirection.ltr,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[bB0-9]')),
                LengthLimitingTextInputFormatter(5),
                TextInputFormatter.withFunction((_, v) => v.copyWith(text: v.text.toUpperCase())),
              ],
              decoration: fieldDecoration(
                label: l.batchCode,
                icon: Icons.tag_rounded,
                hint: 'B07',
                helper: l.batchCodeHint,
                action: locked ? null : ClearFieldButton(controller: _code),
              ),
            ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('batch-price'),
          controller: _price,
          readOnly: locked,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
          textDirection: TextDirection.ltr,
          onChanged: (_) => setState(() {}),
          decoration: fieldDecoration(
            label: l.seatPriceAed,
            icon: Icons.sell_outlined,
            hint: l.seatPriceHint,
            helper: l.seatPriceHelper,
            prefixText: 'AED ',
            action: locked ? null : ClearFieldButton(controller: _price),
          ),
        ),
        const SizedBox(height: 12),
        CountStepper(
          key: const ValueKey('batch-seats'),
          label: l.batchSeats,
          icon: Icons.event_seat_outlined,
          value: _seats,
          min: 1,
          max: 500,
          helper: l.seatsHelper,
          arabicDigits: f.arabicDigits,
          enabled: !locked,
          onChanged: (v) => setState(() => _seats = v),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<SessionLanguage>(
          key: const Key('batch-language'),
          initialValue: _language,
          isExpanded: true,
          decoration: fieldDecoration(label: l.sessionLanguage, icon: Icons.record_voice_over_outlined),
          items: [for (final lang in SessionLanguage.values) DropdownMenuItem(value: lang, child: Text(languageLabel(l, lang)))],
          onChanged: locked ? null : (v) => setState(() => _language = v ?? _language),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('batch-timezone'),
          controller: _timezone,
          readOnly: locked,
          textDirection: TextDirection.ltr,
          onChanged: (_) => _changed(),
          decoration: fieldDecoration(
            label: l.timezone,
            icon: Icons.public_rounded,
            action: !locked && _device != null && _device != _timezone.text
                ? FieldActionButton(
                    label: l.useThisPhone,
                    onPressed: () {
                      setState(() => _timezone.text = _device!);
                      _changed();
                    },
                  )
                : null,
          ),
        ),
      ]),

      section(l.navSchedule, [
        Row(children: [
          Expanded(
            child: tappable(
              key: const Key('batch-start-date'),
              label: l.firstDay,
              icon: Icons.event_outlined,
              value: f.dayLabel(_startsOn),
              onTap: _pickDate,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: tappable(
              key: const Key('batch-start-time'),
              label: l.startTime,
              icon: Icons.schedule_rounded,
              value: _hhmm.digits(f.arabicDigits),
              onTap: _pickTime,
            ),
          ),
        ]),
        const SizedBox(height: 14),
        MonoLabel(l.weekdaysLabel),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 4, children: [
          for (var d = 0; d < 7; d++)
            FilterChip(
              key: Key('weekday-$d'),
              // 2023-01-01 is a Sunday (API: 0 = Sunday).
              label: Text(DateFormat('EEE', locale.wire).format(DateTime(2023, 1, 1 + d)).digits(f.arabicDigits)),
              selected: _weekdays.contains(d),
              showCheckmark: false,
              materialTapTargetSize: MaterialTapTargetSize.padded,
              onSelected: locked
                  ? null
                  : (on) {
                      setState(() => on ? _weekdays.add(d) : _weekdays.remove(d));
                      _changed();
                    },
            ),
        ]),
        const SizedBox(height: 14),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: TextField(
              key: const Key('batch-duration'),
              controller: _duration,
              readOnly: locked,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => _changed(),
              decoration: fieldDecoration(label: l.sessionLength, icon: Icons.timelapse_rounded),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              key: const Key('batch-sessions'),
              controller: _sessions,
              readOnly: locked,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => _changed(),
              decoration: fieldDecoration(label: l.sessionCountLabel, icon: Icons.format_list_numbered_rounded),
            ),
          ),
        ]),
        const SizedBox(height: 14),
        if (!locked)
          BusyButton(
            key: const Key('preview-schedule'),
            label: l.previewSchedule,
            icon: Icons.calendar_view_week_rounded,
            filled: false,
            busy: _previewing,
            onPressed: _runPreview,
          ),
      ]),
      if (_preview != null) ...[
        const SizedBox(height: 16),
        _PreviewList(preview: _preview!, startTime: _hhmm),
      ],
    ];

    return Scaffold(
      appBar: AppBar(title: Text(l.newBatch)),
      bottomNavigationBar: locked
          ? null
          : BottomActionBar(children: [
              BusyButton(key: const Key('create-batch'), label: l.createBatch, busy: _creating, onPressed: _create),
            ]),
      body: ListView(
        key: const Key('new-batch'),
        padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 8, AzzaSpace.gutter, 32),
        children: children,
      ),
    );
  }
}

String _statusWord(AppLocalizations l, CourseStatus s) => switch (s) {
      CourseStatus.draft => l.batchDraft,
      CourseStatus.pendingReview => l.statusPendingReview,
      CourseStatus.published => l.statusPublished,
      CourseStatus.archived => l.statusArchived,
    };

/// Every planned session, with a clash marker where it overlaps another batch.
class _PreviewList extends ConsumerWidget {
  const _PreviewList({required this.preview, required this.startTime});
  final SchedulePreview preview;
  final String startTime;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);
    final clash = p.danger;
    String day(String iso) {
      final d = DateTime.tryParse(iso);
      return d == null ? iso : f.dayLabel(d);
    }

    final conflicts = preview.conflicts;
    return Column(key: const Key('schedule-preview'), crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (conflicts.isEmpty)
        ProposalNotice(title: l.noConflicts, body: preview.endsOn == null ? '' : l.lastSessionOn(day(preview.endsOn!)),
            icon: Icons.event_available_rounded, tint: p.success)
      else
        ProposalNotice(
          key: const Key('schedule-conflicts'),
          title: l.conflictCount(f.n(conflicts.length)),
          body: l.errScheduleConflict,
          icon: Icons.event_busy_rounded,
          tint: p.danger,
        ),
      if (preview.sessions.isNotEmpty || conflicts.isNotEmpty)
        SectionCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (final (i, s) in preview.sessions.indexed)
              Builder(builder: (context) {
                final c = preview.conflictFor(s.number);
                return Container(
                  constraints: const BoxConstraints(minHeight: 44),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
                  child: Row(children: [
                    SizedBox(width: 44, child: MonoLabel('S${f.n(s.number)}')),
                    Expanded(child: Text('${day(s.localDate)} · ${startTime.digits(f.arabicDigits)}', style: t.bodyMedium)),
                    if (c != null) MonoLabel(l.conflictWith(c.withBatch), color: clash),
                  ]),
                );
              }),
            // A clash reported by "Create batch" before any preview: list it on its own.
            if (preview.sessions.isEmpty)
              for (final (i, c) in conflicts.indexed)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: p.line))),
                  child: Row(children: [
                    SizedBox(width: 44, child: MonoLabel('S${f.n(c.sessionNumber)}')),
                    Expanded(child: Text(day(c.localDate), style: t.bodyMedium)),
                    MonoLabel(l.conflictWith(c.withBatch), color: clash),
                  ]),
                ),
          ]),
        ),
    ]);
  }
}

/// After "Create batch": the draft's status and the hand-off to the admins.
class _CreatedCard extends StatelessWidget {
  const _CreatedCard({required this.batch, required this.submitting, required this.onSubmit});
  final Batch batch;
  final bool submitting;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return RaisedCard(
      key: const Key('created-batch'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Slate(batch.code),
          const Spacer(),
          StatusChip.batch(context, batch.status),
        ]),
        const SizedBox(height: 10),
        Text(batch.status == BatchStatus.draft ? l.batchDraftBody : l.batchPendingBody, style: Theme.of(context).textTheme.bodyMedium),
        if (batch.status == BatchStatus.draft) ...[
          const SizedBox(height: 12),
          BusyButton(key: const Key('submit-batch'), label: l.submitForReview, busy: submitting, onPressed: onSubmit),
        ],
      ]),
    );
  }
}
