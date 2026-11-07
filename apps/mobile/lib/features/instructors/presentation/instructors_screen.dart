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
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../teacher/presentation/proposal_widgets.dart';
import '../data/instructors_repository.dart';
import '../domain/instructor_models.dart';

/// Category slug → its localised name (the slug itself while categories load or for an unknown slug).
String categoryName(List<CourseCategory> categories, String slug, AppLocale locale) {
  for (final c in categories) {
    if (c.slug == slug) return c.name(locale);
  }
  return slug;
}

/// The public instructors directory: one card per teacher, each opening their profile.
class InstructorsScreen extends ConsumerWidget {
  const InstructorsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final directory = ref.watch(instructorDirectoryProvider);
    final p = AzzaPalette.of(context);
    Future<void> refresh() async => ref.invalidate(instructorDirectoryProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.instructorsTitle)),
      body: AsyncView<List<InstructorCard>>(
        value: directory,
        onRetry: refresh,
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.instructorsEmpty, icon: Icons.school_outlined),
        data: (list) => RefreshList(
          key: const Key('instructors-list'),
          onRefresh: refresh,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Text(l.instructorsLede, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.muted)),
            ),
            for (final i in list) InstructorCardTile(instructor: i),
          ],
        ),
      ),
    );
  }
}

class InstructorCardTile extends ConsumerWidget {
  const InstructorCardTile({super.key, required this.instructor});
  final InstructorCard instructor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final categories = ref.watch(categoriesProvider).value ?? const <CourseCategory>[];
    final p = AzzaPalette.of(context);
    final t = Theme.of(context).textTheme;
    final i = instructor;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Semantics(
        button: true,
        hint: l.teacherViewProfile,
        child: RaisedCard(
          key: Key('instructor-${i.id}'),
          onTap: () => context.push(Routes.teacher(i.id)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              InitialsAvatar(i.name, size: 56, color: p.accent, imageUrl: i.image),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(i.name, style: t.titleMedium),
                  if (i.headline != null) ...[
                    const SizedBox(height: 2),
                    Text(i.headline!, style: t.bodySmall?.copyWith(color: p.muted), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                  if (i.languages.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    MonoLabel(i.languages.map((lang) => languageLabel(l, lang)).join(' · ')),
                  ],
                ]),
              ),
              Icon(Icons.chevron_right_rounded, color: p.muted),
            ]),
            if (i.categories.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(spacing: 6, runSpacing: 6, children: [
                for (final slug in i.categories)
                  StatusChip(label: categoryName(categories, slug, locale), color: p.successBg, textColor: p.success),
              ]),
            ],
            const SizedBox(height: 12),
            Text(
              [l.instructorCoursesN(f.n(i.courses.length)), l.instructorOpenBatchesN(f.n(i.openBatches))].join(' · '),
              key: Key('instructor-counts-${i.id}'),
              style: t.bodySmall,
            ),
          ]),
        ),
      ),
    );
  }
}
