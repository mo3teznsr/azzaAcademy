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
import '../data/proposals_repository.dart';
import 'proposal_widgets.dart';

/// The teacher's course proposals (any status), with the admin's note on the ones sent back.
class MyCoursesScreen extends ConsumerWidget {
  const MyCoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final courses = ref.watch(myCoursesProvider);
    Future<void> propose() async {
      await context.push(Routes.teacherNewCourse);
      ref.invalidate(myCoursesProvider);
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.myCoursesTitle)),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('propose-course'),
        onPressed: propose,
        icon: const Icon(Icons.add_rounded),
        label: Text(l.proposeCourse),
      ),
      body: AsyncView<List<Course>>(
        value: courses,
        onRetry: () => ref.invalidate(myCoursesProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(
          title: l.noProposedCourses,
          body: l.noProposedCoursesBody,
          icon: Icons.auto_stories_outlined,
          action: l.proposeCourse,
          onAction: propose,
        ),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(myCoursesProvider),
          children: [
            for (final c in list) ...[
              ProposedCourseCard(course: c),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 72), // clear of the FAB
          ],
        ),
      ),
    );
  }
}

class ProposedCourseCard extends ConsumerWidget {
  const ProposedCourseCard({super.key, required this.course});
  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(fmtProvider);
    final locale = ref.watch(localeProvider);
    final t = Theme.of(context).textTheme;
    final c = course;
    return RaisedCard(
      key: Key('course-${c.id}'),
      onTap: () async {
        // A recorded course has no classes: its hub holds the quizzes, preview lesson and numbers.
        await context.push(c.type == CourseType.recorded ? Routes.teacherCourseHub(c.id) : Routes.teacherCourse(c.id));
        ref.invalidate(myCoursesProvider);
      },
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Colour swatch / photo thumbnail beside the title (no text on the image).
          ClipRRect(
            borderRadius: BorderRadius.circular(AzzaSpace.radiusSm),
            child: SizedBox.square(
              dimension: 52,
              child: MediaImage(c.coverImageUrl, fallback: ColoredBox(color: coverColor(c.coverStyle)), cacheWidth: 52),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.title(locale), style: t.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Kicker([
                if (c.categoryName(locale).isNotEmpty) c.categoryName(locale),
                levelLabel(l, c.level),
                if (c.priceFils != null) l.fromPrice(f.aed(c.priceFils!)),
              ].join(' · ')),
            ]),
          ),
          const SizedBox(width: 8),
          Flexible(child: StatusChip.course(context, c.status)),
        ]),
        if (c.status == CourseStatus.draft && (c.reviewNote?.isNotEmpty ?? false)) ...[
          const SizedBox(height: 12),
          ProposalNotice.changes(context, c.reviewNote!, key: Key('review-note-${c.id}')),
        ],
        if (c.status == CourseStatus.pendingReview && c.submittedAt != null) ...[
          const SizedBox(height: 8),
          Text(l.submittedOn(f.shortDate(c.submittedAt!.toLocal())), style: t.bodySmall),
        ],
      ]),
    );
  }
}
