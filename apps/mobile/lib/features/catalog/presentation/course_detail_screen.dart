import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/cover_scroll_view.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../checkout/data/checkout_repository.dart';
import '../data/catalog_repository.dart';
import '../domain/catalog_models.dart';
import 'catalog_widgets.dart';

/// Course detail: full-bleed cover with a header that appears on scroll, then title, teacher, outcomes, syllabus.
class CourseDetailScreen extends ConsumerWidget {
  const CourseDetailScreen({super.key, required this.courseId});
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final course = ref.watch(courseProvider(courseId));
    final locale = ref.watch(localeProvider);
    final f = ref.watch(fmtProvider);
    final currency = ref.watch(displayCurrencyProvider);
    final fx = ref.watch(fxRatesProvider).value ?? FxRates.fallback;

    return Scaffold(
      appBar: course.hasValue ? null : AppBar(),
      body: AsyncView<Course>(
        value: course,
        onRetry: () => ref.invalidate(courseProvider(courseId)),
        data: (c) {
          final batches = ref.watch(courseBatchesProvider(c.id));
          final list = batches.value ?? const <Batch>[];
          final teachers = {
            for (final b in list)
              if (b.teacher != null) b.teacher!.id: b.teacher!,
          };
          final sessions = list.isEmpty ? null : list.first.sessionCount;
          final outcomes = c.outcomes(locale);
          final t = Theme.of(context).textTheme;
          final p = AzzaPalette.of(context);
          final flat = ColoredBox(color: coverColor(c.coverStyle));
          return CoverScrollView(
            title: c.title(locale),
            cover: MediaImage(c.coverImageUrl, fallback: flat),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 18, AzzaSpace.gutter, 32),
                sliver: SliverList.list(
                  children: [
                    CourseMetaLine(course: c),
                    const SizedBox(height: 6),
                    DisplayText(c.title(locale), size: 34, maxLines: 3),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (sessions != null && sessions > 0) StatusChip(label: l.liveSessionsN(f.n(sessions)), color: AzzaColors.sky),
                        StatusChip(label: l.recordings, look: ChipLook.outline, color: p.muted),
                        StatusChip(label: l.certificate, look: ChipLook.outline, color: p.muted),
                      ],
                    ),
                    for (final teacher in teachers.values) ...[
                      const SizedBox(height: 10),
                      Semantics(
                        button: true,
                        hint: l.teacherViewProfile,
                        child: InkWell(
                          key: Key('teacher-row-${teacher.id}'),
                          borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
                          onTap: () => context.push(Routes.teacher(teacher.id)),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                InitialsAvatar(teacher.name, color: coverColor(c.coverStyle), imageUrl: teacher.image),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(teacher.name, style: t.titleSmall),
                                      Text(
                                        l.teaches(list.where((b) => b.teacher?.id == teacher.id).map((b) => b.code).join(', ')),
                                        style: t.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(Icons.chevron_right_rounded, color: p.muted),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                    if (outcomes.isNotEmpty) ...[
                      SectionHeader(l.outcomesTitle),
                      for (final o in outcomes)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: SignalMark(size: 14, color: p.accent),
                              ),
                              const SizedBox(width: 10),
                              Expanded(child: Text(o, style: t.bodyMedium)),
                            ],
                          ),
                        ),
                    ],
                    if (c.modules.isNotEmpty) ...[
                      SectionHeader(l.syllabusN(f.n(c.modules.length))),
                      for (final (i, m) in c.modules.indexed)
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            border: Border(top: BorderSide(color: p.line)),
                          ),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 40,
                                child: Text((i + 1).toString().padLeft(2, '0'), style: AzzaFonts.mono(size: 13, color: p.muted)),
                              ),
                              Expanded(child: Text(m.title(locale), style: t.titleSmall)),
                            ],
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: course.hasValue
          ? BottomActionBar(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        l.fromPrice(f.money(course.requireValue.priceFils, currency, fx.rateFor(currency))),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    FilledButton(
                      onPressed: () => context.push(Routes.batchPicker(course.requireValue.id)),
                      child: Text(l.chooseBatchN(f.n(ref.watch(courseBatchesProvider(course.requireValue.id)).value?.length ?? 0))),
                    ),
                  ],
                ),
              ],
            )
          : null,
    );
  }
}
