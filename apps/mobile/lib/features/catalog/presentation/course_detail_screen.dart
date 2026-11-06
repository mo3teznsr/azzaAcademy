import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/utils/share.dart';
import '../../../core/utils/links.dart';
import '../../../core/providers.dart';
import '../../../core/money/money.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/cover_scroll_view.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../checkout/data/checkout_repository.dart';
import '../data/catalog_repository.dart';
import '../domain/catalog_models.dart';
import 'catalog_widgets.dart';
import 'course_reviews.dart';
import 'save_course_button.dart';

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
    final user = ref.watch(currentUserProvider);

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
          final first = list.isEmpty ? null : list.first;
          final minutes = first == null ? 0 : first.sessionCount * first.schedule.durationMin;
          final t = Theme.of(context).textTheme;
          final p = AzzaPalette.of(context);
          final flat = ColoredBox(color: coverColor(c.coverStyle));
          return CoverScrollView(
            title: c.title(locale),
            cover: MediaImage(c.coverImageUrl, fallback: flat),
            actions: [
              CoverButton(
                key: const Key('share-course'),
                icon: Icons.ios_share_rounded,
                tooltip: l.shareCourse,
                onPressed: () => ref.read(shareLinkProvider)(
                  Uri.parse(ref.read(appConfigProvider).courseUrl(c.slug.isNotEmpty ? c.slug : c.id)),
                  subject: c.title(locale),
                ),
              ),
              if (user != null) ...[const SizedBox(width: 8), SaveCourseButton(courseId: c.id)],
            ],
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 18, AzzaSpace.gutter, 32),
                sliver: SliverList.list(
                  children: [
                    CourseMetaLine(course: c),
                    const SizedBox(height: 6),
                    DisplayText(c.title(locale), size: 34, maxLines: 3),
                    if (c.ratingCount > 0) ...[const SizedBox(height: 6), RatingLine(avg: c.ratingAvg, count: c.ratingCount)],
                    const SizedBox(height: 14),
                    if (c.introVideoUrl != null) ...[
                      _IntroVideoCard(url: ref.read(appConfigProvider).resolveMediaUrl(c.introVideoUrl)!),
                      const SizedBox(height: 14),
                    ],
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (sessions != null && sessions > 0) StatusChip(label: l.liveSessionsN(f.n(sessions)), color: AzzaPalette.of(context).infoBg, textColor: AzzaPalette.of(context).info),
                        if (minutes > 0)
                          StatusChip(
                            key: const Key('total-hours'),
                            label: l.totalHoursLive(f.n(_hours(minutes))),
                            look: ChipLook.outline,
                            color: p.muted,
                          ),
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
                    for (final (key, title, items) in [
                      ('outcomes', l.whatYoullLearn, c.outcomes(locale)),
                      ('requirements', l.requirementsTitle, c.requirements(locale)),
                      ('audience', l.audienceTitle, c.audience(locale)),
                    ])
                      if (items.isNotEmpty) ...[
                        SectionHeader(title, key: Key('section-$key')),
                        for (final o in items) _Bullet(text: o),
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
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 40,
                                child: Text((i + 1).toString().padLeft(2, '0'), style: AzzaFonts.mono(size: 13, color: p.muted)),
                              ),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(m.title(locale), style: t.titleSmall),
                                  if (m.description(locale) != null) ...[
                                    const SizedBox(height: 4),
                                    Text(m.description(locale)!, style: t.bodySmall),
                                  ],
                                ]),
                              ),
                            ],
                          ),
                        ),
                    ],
                    if (c.faq.isNotEmpty) ...[
                      SectionHeader(l.faqTitle, key: const Key('section-faq')),
                      for (final (i, q) in c.faq.indexed)
                        Theme(
                          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                          child: ExpansionTile(
                            key: Key('faq-$i'),
                            tilePadding: EdgeInsets.zero,
                            childrenPadding: const EdgeInsets.only(bottom: 12),
                            expandedAlignment: AlignmentDirectional.centerStart,
                            shape: Border(top: BorderSide(color: p.line)),
                            collapsedShape: Border(top: BorderSide(color: p.line)),
                            title: Text(q.question(locale), style: t.titleSmall),
                            children: [Text(q.answer(locale), style: t.bodyMedium)],
                          ),
                        ),
                    ],
                    CourseReviewsSection(
                      course: c,
                      canReply: user?.role == Role.teacher && (c.createdById == user!.id || teachers.containsKey(user.id)),
                      isAdmin: user?.role == Role.admin,
                    ),
                    CourseRail(
                      railKey: const Key('related-courses'),
                      title: l.relatedTitle,
                      courses: ref.watch(relatedCoursesProvider(c.id)).value ?? const [],
                    ),
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

/// `18` or `13.5` hours.
String _hours(int minutes) {
  final h = minutes / 60;
  return h == h.roundToDouble() ? '${h.round()}' : h.toStringAsFixed(1);
}

/// One "What you'll learn" / requirement / audience line.
class _Bullet extends StatelessWidget {
  const _Bullet({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = AzzaPalette.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(padding: const EdgeInsets.only(top: 4), child: SignalMark(size: 14, color: p.accent)),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

/// "Watch the intro" — opens the course's intro video in the system player (or YouTube/Vimeo).
class _IntroVideoCard extends StatelessWidget {
  const _IntroVideoCard({required this.url});
  final String url;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    return RaisedCard(
      key: const Key('intro-video'),
      onTap: () => openExternal(context, url),
      child: Row(children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(color: p.accent, shape: BoxShape.circle),
          child: Icon(Icons.play_arrow_rounded, color: p.onAccent, size: 30),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.watchIntro, style: t.titleSmall),
            Text(l.watchIntroHint, style: t.bodySmall),
          ]),
        ),
        Icon(Icons.chevron_right_rounded, color: p.muted),
      ]),
    );
  }
}
