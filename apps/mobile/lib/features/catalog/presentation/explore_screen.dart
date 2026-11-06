import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../data/catalog_repository.dart';
import '../domain/catalog_models.dart';
import '../domain/course_filters.dart';
import 'catalog_widgets.dart';
import 'explore_filters_sheet.dart';

final courseSearchProvider = FutureProvider.autoDispose.family<List<Course>, CourseFilters>(
  (ref, filters) => ref.watch(catalogRepositoryProvider).courses(filters),
);

/// Explore: search, the category rail, filters & sort, the featured rail; open a course to pick a batch.
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  CourseFilters _filters = const CourseFilters();

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearch(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => setState(() => _filters = _filters.copyWith(q: v.trim())));
  }

  Future<void> _openFilters() async {
    final next = await showCourseFilters(context, _filters);
    if (next != null && mounted) setState(() => _filters = next);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final f = ref.watch(fmtProvider);
    final courses = ref.watch(courseSearchProvider(_filters));
    final categories = ref.watch(categoriesProvider).value ?? const <CourseCategory>[];
    final browsing = _filters == const CourseFilters();
    final featured = browsing ? (ref.watch(featuredCoursesProvider).value ?? const <Course>[]) : const <Course>[];
    final active = _filters.activeCount;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 12, AzzaSpace.gutter, 0),
              sliver: SliverList.list(children: [
                DisplayText(l.exploreTitle, size: 34),
                const SizedBox(height: 18),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _search,
                      onChanged: _onSearch,
                      textInputAction: TextInputAction.search,
                      decoration: fieldDecoration(
                        label: l.searchCourses,
                        icon: Icons.search_rounded,
                        labelIsHint: true,
                        action: ClearFieldButton(controller: _search, onCleared: () => _onSearch('')),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.outlined(
                    key: const Key('open-filters'),
                    tooltip: l.filters,
                    constraints: const BoxConstraints(minWidth: 52, minHeight: 52),
                    onPressed: _openFilters,
                    icon: Badge(
                      key: const Key('filters-badge'),
                      isLabelVisible: active > 0,
                      label: Text(f.n(active)),
                      child: const Icon(Icons.tune_rounded),
                    ),
                  ),
                ]),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: ListView(
                    key: const Key('category-rail'),
                    scrollDirection: Axis.horizontal,
                    children: [
                      _chip(l.allFilter, _filters.category == null, () => setState(() => _filters = _filters.copyWith(category: () => null))),
                      for (final c in categories)
                        _chip(
                          c.courseCount == null ? c.name(locale) : '${c.name(locale)} ${f.n(c.courseCount!)}',
                          _filters.category == c.slug,
                          () => setState(() => _filters = _filters.copyWith(category: () => _filters.category == c.slug ? null : c.slug)),
                          icon: categoryIcon(c.icon),
                          key: Key('category-${c.slug}'),
                        ),
                    ],
                  ),
                ),
                CourseRail(railKey: const Key('featured-courses'), title: l.featuredTitle, courses: featured),
                if (browsing) ...[
                  const SizedBox(height: 12),
                  CardGroup(children: [
                    ListTile(
                      key: const Key('explore-instructors'),
                      minTileHeight: 56,
                      leading: Icon(Icons.groups_2_outlined, color: AzzaPalette.of(context).accent),
                      title: Text(l.meetInstructors),
                      subtitle: Text(l.meetInstructorsHint),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => context.push(Routes.instructors),
                    ),
                  ]),
                ],
                const SizedBox(height: 8),
                if (courses.hasValue) MonoLabel(l.coursesCount(f.n(courses.requireValue.length))),
                const SizedBox(height: 8),
              ]),
            ),
            SliverFillRemaining(
              hasScrollBody: true,
              child: AsyncView<List<Course>>(
                value: courses,
                onRetry: () => ref.invalidate(courseSearchProvider(_filters)),
                isEmpty: (list) => list.isEmpty,
                empty: EmptyState(title: l.noCoursesFound),
                data: (list) => ListView.separated(
                  padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 4, AzzaSpace.gutter, 32),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 14),
                  itemBuilder: (context, i) => CourseCard(course: list[i]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap, {IconData? icon, Key? key}) {
    final p = AzzaPalette.of(context);
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 8),
      child: ChoiceChip(
        key: key,
        avatar: icon == null ? null : Icon(icon, size: 16, color: selected ? p.onAccent : p.text),
        label: Text(label),
        selected: selected,
        showCheckmark: false,
        labelStyle: TextStyle(color: selected ? p.onAccent : p.text),
        onSelected: (_) => onTap(),
      ),
    );
  }
}
