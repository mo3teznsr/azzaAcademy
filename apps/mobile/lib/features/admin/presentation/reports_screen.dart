import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

/// Reports (read-only): the key figures from `GET /admin/reports` against the previous period of equal length.
class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  int _days = 30;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final report = ref.watch(adminReportProvider(_days));
    final t = Theme.of(context).textTheme;

    String pct(double rate) => f.percent(rate * 100);

    return Scaffold(
      appBar: AppBar(title: Text(l.adminReportsTitle)),
      body: Column(children: [
        const SizedBox(height: 4),
        ChoiceChipsRow<int>(
          keyPrefix: 'range',
          values: const [7, 30, 90, 365],
          selected: _days,
          label: (d) => f.n(l.adminLastDays(d ?? 0)),
          onSelected: (d) => setState(() => _days = d ?? 30),
        ),
        Expanded(
          child: AsyncView<AdminReport>(
            value: report,
            onRetry: () => ref.invalidate(adminReportProvider(_days)),
            data: (r) => RefreshList(
              onRefresh: () async => ref.invalidate(adminReportProvider(_days)),
              children: [
                if (r.from != null && r.to != null) Kicker('${f.dateRange(r.from!, r.to!)} · ${l.adminVsPrevious}'),
                const SizedBox(height: 10),
                LayoutBuilder(builder: (context, c) {
                  final w = (c.maxWidth - 10) / 2;
                  return Wrap(spacing: 10, runSpacing: 10, children: [
                    for (final k in [
                      (l.adminRevenue, f.aed(r.kpis.revenueFils), r.kpis.revenueFils.toDouble(), r.previous.revenueFils.toDouble(), false),
                      (l.adminNewEnrollments, f.n(r.kpis.newEnrollments), r.kpis.newEnrollments.toDouble(), r.previous.newEnrollments.toDouble(), false),
                      (l.seatsFilled, pct(r.kpis.fillRate), r.kpis.fillRate, r.previous.fillRate, false),
                      (l.adminAttendance, pct(r.kpis.attendanceRate), r.kpis.attendanceRate, r.previous.attendanceRate, false),
                      (l.adminCompletion, pct(r.kpis.completionRate), r.kpis.completionRate, r.previous.completionRate, false),
                      (l.adminRefunds, f.aed(r.kpis.refundsFils), r.kpis.refundsFils.toDouble(), r.previous.refundsFils.toDouble(), true),
                    ])
                      SizedBox(width: w, child: _ReportTile(label: k.$1, value: k.$2, now: k.$3, before: k.$4, lowerIsBetter: k.$5)),
                  ]);
                }),
                if (r.recorded != null) ...[
                  SectionHeader(l.reportsRecordedTitle),
                  SectionCard(
                    key: const Key('reports-recorded'),
                    margin: EdgeInsets.zero,
                    child: r.recorded!.isEmpty
                        ? Text(l.reportsRecordedNone, style: t.bodySmall)
                        : Column(children: [
                            KeyValueRow(l.reportsGross, f.aed(r.recorded!.grossFils)),
                            KeyValueRow(l.adminRefunds, '−${f.aed(r.recorded!.refundsFils)}'),
                            KeyValueRow(l.reportsFees, '−${f.aed(r.recorded!.feesFils)}'),
                            KeyValueRow(l.reportsVat, '−${f.aed(r.recorded!.vatFils)}'),
                            KeyValueRow(l.reportsNet, f.aed(r.recorded!.netFils)),
                          ]),
                  ),
                ],
                if (r.revenueByCourse.isNotEmpty) ...[
                  SectionHeader(l.adminRevenueByCourse),
                  SectionCard(
                    margin: EdgeInsets.zero,
                    child: Column(children: [
                      for (final c in r.revenueByCourse.take(8)) KeyValueRow(c.title, f.aed(c.fils)),
                    ]),
                  ),
                ],
                if (r.teachers.isNotEmpty) ...[
                  SectionHeader(l.adminTeachersReport),
                  CardGroup(children: [
                    for (final tr in r.teachers)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(tr.name, style: t.titleSmall),
                          Text(
                            f.n(l.adminTeacherStats(tr.sessionsRun, pct(tr.avgAttendance), pct(tr.onTimeStartRate))),
                            style: t.bodySmall,
                          ),
                        ]),
                      ),
                  ]),
                ],
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

class _ReportTile extends ConsumerWidget {
  const _ReportTile({required this.label, required this.value, required this.now, required this.before, this.lowerIsBetter = false});
  final String label;
  final String value;
  final double now;
  final double before;
  final bool lowerIsBetter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final f = ref.watch(fmtProvider);
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final delta = before == 0 ? null : (now - before) / before * 100;
    final good = delta == null ? null : (lowerIsBetter ? delta <= 0 : delta >= 0);
    return RaisedCard(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Kicker(label),
        const SizedBox(height: 6),
        Text(value, style: t.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
        if (delta != null)
          Text(
            '${delta >= 0 ? '▲' : '▼'} ${f.percent(delta.abs())}',
            style: t.bodySmall?.copyWith(color: good! ? p.success : p.danger, fontWeight: FontWeight.w600),
          ),
      ]),
    );
  }
}
