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
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/catalog_widgets.dart';
import '../data/back_office_repository.dart';
import 'admin_widgets.dart';

/// Courses: every course in every state; tap to edit (status, publish, featured rank), "+" to create.
class AdminCoursesScreen extends ConsumerStatefulWidget {
  const AdminCoursesScreen({super.key, this.initialStatus});
  final CourseStatus? initialStatus;

  @override
  ConsumerState<AdminCoursesScreen> createState() => _AdminCoursesScreenState();
}

class _AdminCoursesScreenState extends ConsumerState<AdminCoursesScreen> {
  late CourseStatus? _status = widget.initialStatus;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final courses = ref.watch(adminCoursesProvider(_status));
    final t = Theme.of(context).textTheme;
    final p = AzzaPalette.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.adminCoursesTitle), actions: [
        IconButton(
          key: const Key('new-course'),
          tooltip: l.newCourse,
          icon: const Icon(Icons.add_rounded),
          onPressed: () => context.push(Routes.adminNewCourse),
        ),
      ]),
      body: Column(children: [
        const SizedBox(height: 4),
        ChoiceChipsRow<CourseStatus>(
          keyPrefix: 'course-status',
          values: const [null, CourseStatus.published, CourseStatus.pendingReview, CourseStatus.draft, CourseStatus.archived],
          selected: _status,
          label: (s) => s == null ? l.allFilter : courseStatusLabel(l, s),
          onSelected: (s) => setState(() => _status = s),
        ),
        Expanded(
          child: AsyncView<List<Course>>(
            value: courses,
            onRetry: () => ref.invalidate(adminCoursesProvider(_status)),
            isEmpty: (list) => list.isEmpty,
            empty: EmptyState(title: l.adminNoCourses, action: l.newCourse, onAction: () => context.push(Routes.adminNewCourse)),
            data: (list) {
              final sorted = [...list]..sort((a, b) => (a.featuredRank ?? 1000).compareTo(b.featuredRank ?? 1000));
              return RefreshList(
                onRefresh: () async => ref.invalidate(adminCoursesProvider(_status)),
                children: [
                  for (final c in sorted) ...[
                    RaisedCard(
                      key: Key('admin-course-${c.id}'),
                      padding: const EdgeInsets.all(12),
                      onTap: () => context.push(Routes.adminCourse(c.id)),
                      child: Row(children: [
                        Container(
                          width: 8,
                          height: 48,
                          decoration: BoxDecoration(color: coverColor(c.coverStyle), borderRadius: BorderRadius.circular(4)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(c.title(locale), style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                            Text(
                              [
                                c.categoryRef?.name(locale) ?? c.category,
                                if (c.priceFils != null) l.adminFromPrice(f.aed(c.priceFils!)),
                                if (c.featuredRank != null) l.adminFeaturedAt(f.n(c.featuredRank!)),
                              ].where((s) => s.isNotEmpty).join(' · '),
                              style: t.bodySmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ]),
                        ),
                        const SizedBox(width: 8),
                        if (c.featuredRank != null) Padding(
                          padding: const EdgeInsetsDirectional.only(end: 6),
                          child: Icon(Icons.star_rounded, size: 18, color: p.accent),
                        ),
                        StatusChip.course(context, c.status),
                      ]),
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              );
            },
          ),
        ),
      ]),
    );
  }
}
