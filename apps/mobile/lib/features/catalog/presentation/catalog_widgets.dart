import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/digits.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../domain/catalog_models.dart';

Color coverColor(String style) => switch (style) {
      'sky' => AzzaColors.sky,
      'sage' => AzzaColors.sage,
      'peach' => AzzaColors.peach,
      _ => AzzaColors.sun,
    };

/// `Tue & Thu · 19:00–20:30` from a schedule rule (0 = Sunday).
String scheduleLabel(Fmt f, ScheduleRule rule, {DateTime? sample}) {
  if (rule.weekdays.isEmpty) return '';
  // 2023-01-01 is a Sunday.
  final names = rule.weekdays.map((d) => DateFormat('EEE', f.locale.wire).format(DateTime(2023, 1, 1 + d)).digits(f.arabicDigits));
  final days = names.length <= 2 ? names.join(' & ') : names.join(' · ');
  if (rule.startTime.isEmpty) return days;
  final parts = rule.startTime.split(':');
  final start = DateTime(2023, 1, 1, int.tryParse(parts.first) ?? 0, parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0);
  final end = start.add(Duration(minutes: rule.durationMin));
  return '$days · ${f.time(start)}–${f.time(end)}';
}

/// Typographic course cover (no photos — giant type on a section colour).
class CourseCover extends StatelessWidget {
  const CourseCover({super.key, required this.course, required this.locale, this.height = 180, this.compact = false});
  final Course course;
  final AppLocale locale;
  final double height;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Container(
      height: height,
      width: double.infinity,
      padding: EdgeInsets.all(compact ? 14 : 20),
      decoration: BoxDecoration(color: coverColor(course.coverStyle), borderRadius: BorderRadius.circular(AzzaSpace.radius)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MonoLabel('${course.category} · ${l.levelN('${course.level.number}')}', color: AzzaColors.ink),
          const Spacer(),
          Text(
            course.title(locale),
            maxLines: compact ? 2 : 3,
            overflow: TextOverflow.ellipsis,
            style: AzzaFonts.display(arabic: locale.isRtl, size: compact ? 24 : 40, weight: FontWeight.w800, color: AzzaColors.ink),
          ),
        ],
      ),
    );
  }
}

/// One call-sheet row: slate, time, title, subtitle, status.
class SessionRow extends StatelessWidget {
  const SessionRow({super.key, required this.session, required this.fmt, this.onTap, this.subtitle, this.showDay = false});
  final SessionSummary session;
  final Fmt fmt;
  final VoidCallback? onTap;
  final String? subtitle;
  final bool showDay;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 76,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(fmt.time(session.startsAt), style: AzzaFonts.mono(size: 15, color: p.text, weight: FontWeight.w500, tracking: 0)),
                  if (showDay) MonoLabel(fmt.weekday(session.startsAt)),
                ],
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (session.batchCode.isNotEmpty) MonoLabel(Fmt.slate(session.batchCode, session.number)),
                  const SizedBox(height: 2),
                  Text(session.title, style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                  if (subtitle != null && subtitle!.isNotEmpty) Text(subtitle!, style: t.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 8),
            StatusChip.session(context, session.status, startsAt: session.startsAt, moved: session.movedFrom != null),
          ],
        ),
      ),
    );
  }
}
