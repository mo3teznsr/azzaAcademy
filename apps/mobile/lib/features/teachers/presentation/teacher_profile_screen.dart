import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../data/teachers_repository.dart';
import '../domain/teacher_models.dart';

String _languageName(SessionLanguage l) => l == SessionLanguage.ar ? 'العربية' : 'English';

/// Public teacher profile: portrait, headline, bio, the courses they teach and their open batches.
class TeacherProfileScreen extends ConsumerWidget {
  const TeacherProfileScreen({super.key, required this.teacherId});
  final String teacherId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final profile = ref.watch(teacherProfileProvider(teacherId));
    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<TeacherProfile>(
        value: profile,
        onRetry: () => ref.invalidate(teacherProfileProvider(teacherId)),
        data: (tp) {
          final locale = ref.watch(localeProvider);
          final t = Theme.of(context).textTheme;
          final p = AzzaPalette.of(context);
          return ListView(
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 32),
            children: [
              Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                InitialsAvatar(tp.name, size: 104, color: p.accent, imageUrl: tp.image),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    DisplayText(tp.name, size: 30, maxLines: 2),
                    if (tp.headline != null) ...[
                      const SizedBox(height: 6),
                      Text(tp.headline!, style: t.bodyMedium?.copyWith(color: p.muted)),
                    ],
                  ]),
                ),
              ]),
              if (tp.languages.isNotEmpty) ...[
                const SizedBox(height: 18),
                Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                  MonoLabel(l.teacherTeachesIn),
                  for (final lang in tp.languages) StatusChip(label: _languageName(lang), look: ChipLook.outline, color: p.text),
                ]),
              ],
              if (tp.bio != null) ...[
                SectionHeader(l.teacherAbout),
                Text(tp.bio!, style: t.bodyLarge),
              ],
              if (tp.courses.isNotEmpty) ...[
                SectionHeader(l.teacherCourses),
                SizedBox(
                  height: 150,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: tp.courses.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 12),
                    itemBuilder: (context, i) {
                      final c = tp.courses[i];
                      return SizedBox(
                        width: 240,
                        child: Semantics(
                          button: true,
                          label: c.title(locale),
                          child: GestureDetector(
                            onTap: () => context.push(Routes.course(c.slug.isNotEmpty ? c.slug : c.id)),
                            child: CourseCover(course: c, locale: locale, height: 150, compact: true),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
              SectionHeader(l.teacherUpcomingBatches),
              if (tp.upcomingBatches.isEmpty)
                Text(l.noOpenBatches, style: t.bodySmall)
              else
                for (final (i, b) in tp.upcomingBatches.indexed) ...[
                  FadeSlideIn(index: i, child: _UpcomingBatchCard(batch: b)),
                  const SizedBox(height: 12),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _UpcomingBatchCard extends ConsumerWidget {
  const _UpcomingBatchCard({required this.batch});
  final TeacherBatch batch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final b = batch;
    return RaisedCard(
      key: Key('teacher-batch-${b.id}'),
      onTap: b.courseId.isEmpty ? null : () => context.push(Routes.batchPicker(b.courseId)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Slate(b.code),
          const SizedBox(width: 10),
          Expanded(child: Text(b.course(locale), style: t.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis)),
          const SizedBox(width: 8),
          b.isFull
              ? StatusChip(label: l.teacherBatchFull, color: AzzaColors.peach, textColor: AzzaColors.ink)
              : StatusChip(label: l.seatsLeft(f.n(b.seatsLeft)), color: AzzaColors.sage, textColor: AzzaColors.ink),
        ]),
        const SizedBox(height: 12),
        if (b.scheduleSummary.isNotEmpty) Text(b.scheduleSummary, style: t.bodyMedium),
        Text(
          [
            if (b.startsOn != null) l.startsOnDate(f.shortDate(b.startsOn!)),
            _languageName(b.language),
          ].join(' · '),
          style: t.bodySmall,
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: Text(f.aed(b.priceFils), style: t.titleMedium)),
          FilledButton(
            onPressed: () => context.push(Routes.checkout(b.id)),
            child: Text(b.isFull ? l.joinWaitlist : l.enrollIn(b.code), maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
        ]),
      ]),
    );
  }
}
