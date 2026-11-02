import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../data/teacher_repository.dart';

enum _RosterFilter { all, atRisk, waitlist }

/// Batch roster: who's in, who's slipping, who's on the waitlist.
class RosterScreen extends ConsumerStatefulWidget {
  const RosterScreen({super.key, required this.batchId});
  final String batchId;

  @override
  ConsumerState<RosterScreen> createState() => _RosterScreenState();
}

class _RosterScreenState extends ConsumerState<RosterScreen> {
  _RosterFilter _filter = _RosterFilter.all;
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final batch = ref.watch(batchProvider(widget.batchId)).value;
    final roster = ref.watch(rosterProvider(widget.batchId));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<List<RosterStudent>>(
        value: roster,
        onRetry: () => ref.invalidate(rosterProvider(widget.batchId)),
        data: (all) {
          final enrolled = all.where((s) => !s.waitlisted).toList();
          final atRisk = enrolled.where((s) => s.atRisk).toList();
          final waitlist = all.where((s) => s.waitlisted).toList();
          final pcts = enrolled.map((s) => s.attendancePct).whereType<double>().toList();
          final avg = pcts.isEmpty ? null : pcts.reduce((a, b) => a + b) / pcts.length;
          final shown = switch (_filter) {
            _RosterFilter.all => enrolled,
            _RosterFilter.atRisk => atRisk,
            _RosterFilter.waitlist => waitlist,
          }
              .where((s) => _q.isEmpty || s.name.toLowerCase().contains(_q.toLowerCase()))
              .toList();
          return RefreshList(
            onRefresh: () async => ref.invalidate(rosterProvider(widget.batchId)),
            children: [
              if (batch != null) ...[
                MonoLabel('${batch.course?.title(locale) ?? ''} · ${scheduleLabel(f, batch.schedule)}'),
                DisplayText(l.rosterTitle(batch.code), size: 34),
              ],
              const SizedBox(height: 16),
              Row(children: [
                _Metric(label: l.enrolledLabel, value: '${f.n(enrolled.length)}${batch == null ? '' : ' / ${f.n(batch.capacity)}'}'),
                _Metric(label: l.avgAttendance, value: avg == null ? '—' : f.percent(avg)),
                if (batch != null) _Metric(label: l.doneLabel, value: '${f.n(batch.sessionsDone(DateTime.now()))} / ${f.n(batch.sessionCount)}'),
              ]),
              const SizedBox(height: 16),
              TextField(
                onChanged: (v) => setState(() => _q = v.trim()),
                decoration: InputDecoration(prefixIcon: const Icon(Icons.search_rounded), hintText: l.searchStudents),
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
              const SizedBox(height: 8),
              if (shown.isEmpty) EmptyState(title: l.noStudents),
              for (final s in shown)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: InitialsAvatar(s.name, size: 40),
                  title: Text(s.name, style: t.titleSmall),
                  subtitle: Text(s.note ?? s.email, style: t.bodySmall),
                  trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                    if (s.attendancePct != null)
                      Text(f.percent(s.attendancePct!), style: t.titleSmall?.copyWith(color: s.atRisk ? AzzaColors.peach : null)),
                    if (s.atRisk) MonoLabel(l.atRisk, color: AzzaColors.peach),
                    if (s.waitlisted) MonoLabel(l.waitlist),
                  ]),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          MonoLabel(label, size: 9),
          const SizedBox(height: 2),
          DisplayText(value, size: 22),
        ]),
      );
}
