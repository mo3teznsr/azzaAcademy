import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/digits.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/money/money.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../checkout/data/checkout_repository.dart';
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

/// Course cover: the film-set photo shown clean — no scrim, no text on it; callers put the title
/// beneath. Without a photo it falls back to the typographic cover (giant type on a section colour).
class CourseCover extends StatelessWidget {
  const CourseCover({
    super.key,
    required this.course,
    required this.locale,
    this.height = 180,
    this.compact = false,
    this.radius = AzzaSpace.radius,
  });
  final Course course;
  final AppLocale locale;
  final double height;
  final bool compact;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final typographic = Padding(
      padding: EdgeInsets.all(compact ? 14 : 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MonoLabel('${course.categoryName(locale)} · ${l.levelN('${course.level.number}')}', color: AzzaColors.ink),
          Expanded(
            child: Align(
              alignment: AlignmentDirectional.bottomStart,
              child: Text(
                course.title(locale),
                maxLines: compact ? 2 : 3,
                overflow: TextOverflow.ellipsis,
                style: AzzaFonts.display(arabic: locale.isRtl, size: compact ? 24 : 40, weight: FontWeight.w800, color: AzzaColors.ink),
              ),
            ),
          ),
        ],
      ),
    );
    final flat = ColoredBox(color: coverColor(course.coverStyle), child: typographic);
    return Container(
      height: height,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: coverColor(course.coverStyle), borderRadius: BorderRadius.circular(radius)),
      child: course.coverImageUrl == null ? typographic : MediaImage(course.coverImageUrl, fallback: flat),
    );
  }
}

/// Category · level line that sits under a cover (category in the app language).
class CourseMetaLine extends ConsumerWidget {
  const CourseMetaLine({super.key, required this.course});
  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = course.categoryName(ref.watch(localeProvider));
    final level = context.l10n.levelN('${course.level.number}');
    return MonoLabel(name.isEmpty ? level : '$name · $level');
  }
}

/// Material icon for a category's lucide icon name (set in the web admin).
IconData categoryIcon(String? lucide) => switch (lucide) {
      'pen-tool' || 'pencil' || 'pen' => Icons.draw_outlined,
      'languages' || 'globe' => Icons.translate_rounded,
      'chart-line' || 'line-chart' || 'bar-chart' || 'chart-bar' || 'database' => Icons.insights_rounded,
      'palette' || 'paintbrush' || 'brush' => Icons.palette_outlined,
      'briefcase' => Icons.work_outline_rounded,
      'code' || 'laptop' || 'cpu' || 'terminal' => Icons.code_rounded,
      'book-open' || 'book' => Icons.menu_book_outlined,
      'sprout' || 'leaf' => Icons.spa_outlined,
      'brain' || 'sparkles' => Icons.psychology_outlined,
      'camera' => Icons.photo_camera_outlined,
      'music' || 'mic' => Icons.music_note_outlined,
      'calculator' => Icons.calculate_outlined,
      'heart' || 'heart-pulse' => Icons.favorite_border_rounded,
      'megaphone' => Icons.campaign_outlined,
      'graduation-cap' => Icons.school_outlined,
      'dumbbell' => Icons.fitness_center_rounded,
      'utensils' || 'chef-hat' => Icons.restaurant_outlined,
      'video' || 'film' => Icons.movie_outlined,
      _ => Icons.category_outlined,
    };

/// Five stars filled to [rating] (halves rounded to the nearest half).
class RatingStars extends StatelessWidget {
  const RatingStars(this.rating, {super.key, this.size = 14, this.color});
  final double rating;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? (AzzaPalette.of(context).isDark ? AzzaColors.sun : AzzaColors.sunDeep);
    final halves = (rating * 2).round();
    return ExcludeSemantics(
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            halves >= i * 2 ? Icons.star_rounded : (halves == i * 2 - 1 ? Icons.star_half_rounded : Icons.star_outline_rounded),
            size: size,
            color: c,
          ),
      ]),
    );
  }
}

/// `★★★★☆ 4.6 (128)` — only shown when the course has ratings.
class RatingLine extends ConsumerWidget {
  const RatingLine({super.key, required this.avg, required this.count, this.size = 14});
  final double avg;
  final int count;
  final double size;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (count <= 0) return const SizedBox.shrink();
    final f = ref.watch(fmtProvider);
    final t = Theme.of(context).textTheme;
    final label = context.l10n.ratingSemantics(f.n(avg.toStringAsFixed(1)), f.n(count));
    return Semantics(
      label: label,
      child: ExcludeSemantics(
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          RatingStars(avg, size: size),
          const SizedBox(width: 6),
          Text(f.n(avg.toStringAsFixed(1)), style: t.labelLarge),
          const SizedBox(width: 4),
          Text('(${f.n(count)})', style: t.bodySmall),
        ]),
      ),
    );
  }
}

/// Full-width course card (Explore, Saved): cover, then category · level, title, price, rating.
class CourseCard extends ConsumerWidget {
  const CourseCard({super.key, required this.course, this.trailing});
  final Course course;
  final Widget? trailing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final currency = ref.watch(displayCurrencyProvider);
    final fx = ref.watch(fxRatesProvider).value ?? FxRates.fallback;
    final c = course;
    final t = Theme.of(context).textTheme;
    return InkWell(
      key: Key('course-card-${c.id}'),
      borderRadius: BorderRadius.circular(AzzaSpace.radius),
      onTap: () => context.push(Routes.course(c.slug.isNotEmpty ? c.slug : c.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CourseCover(course: c, locale: locale, height: 170, compact: true),
          const SizedBox(height: 10),
          Row(children: [Expanded(child: CourseMetaLine(course: c)), ?trailing]),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(c.title(locale), style: t.titleMedium)),
              const SizedBox(width: 8),
              Text(f.money(c.priceFils, currency, fx.rateFor(currency)), style: t.titleSmall),
            ],
          ),
          if (c.ratingCount > 0) ...[const SizedBox(height: 4), RatingLine(avg: c.ratingAvg, count: c.ratingCount)],
          if (c.batchCount != null) Text(l.chooseBatchN(f.n(c.batchCount!)), style: t.bodySmall),
        ],
      ),
    );
  }
}

/// Horizontal rail of small course cards (Featured, Related). Renders nothing when [courses] is empty.
class CourseRail extends ConsumerWidget {
  const CourseRail({super.key, required this.title, required this.courses, this.railKey});
  final String title;
  final List<Course> courses;
  final Key? railKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (courses.isEmpty) return const SizedBox.shrink();
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    return Column(key: railKey, crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionHeader(title, padding: const EdgeInsets.only(top: 20, bottom: 10)),
      SizedBox(
        height: 214,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: courses.length,
          separatorBuilder: (_, _) => const SizedBox(width: 12),
          itemBuilder: (context, i) {
            final c = courses[i];
            return SizedBox(
              width: 200,
              child: InkWell(
                key: Key('rail-course-${c.id}'),
                borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
                onTap: () => context.push(Routes.course(c.slug.isNotEmpty ? c.slug : c.id)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  CourseCover(course: c, locale: locale, height: 120, compact: true, radius: AzzaSpace.radiusSm),
                  const SizedBox(height: 8),
                  Text(c.title(locale), style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                  if (c.ratingCount > 0) RatingLine(avg: c.ratingAvg, count: c.ratingCount, size: 12),
                ]),
              ),
            );
          },
        ),
      ),
    ]);
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
