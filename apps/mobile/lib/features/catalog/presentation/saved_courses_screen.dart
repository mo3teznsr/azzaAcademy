import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/widgets/ui.dart';
import '../data/reviews_repository.dart';
import '../domain/catalog_models.dart';
import 'catalog_widgets.dart';

/// The courses the user hearted (`GET /me/saved-courses`).
class SavedCoursesScreen extends ConsumerWidget {
  const SavedCoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final saved = ref.watch(savedCoursesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.savedCoursesTitle)),
      body: AsyncView<List<Course>>(
        value: saved,
        onRetry: () => ref.invalidate(savedCoursesProvider),
        isEmpty: (list) => list.isEmpty,
        empty: EmptyState(title: l.noSavedTitle, body: l.noSavedBody, icon: Icons.favorite_border_rounded),
        data: (list) => RefreshList(
          onRefresh: () async => ref.invalidate(savedCoursesProvider),
          children: [
            for (final c in list) ...[CourseCard(course: c), const SizedBox(height: 16)],
          ],
        ),
      ),
    );
  }
}
