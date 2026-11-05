import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/money/money.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/ui.dart';
import '../../../router/routes.dart';
import '../../checkout/data/checkout_repository.dart';
import '../data/catalog_repository.dart';
import '../domain/catalog_models.dart';
import 'catalog_widgets.dart';

typedef CourseQuery = ({String q, String? category, CourseLevel? level});

final courseSearchProvider = FutureProvider.autoDispose.family<List<Course>, CourseQuery>((ref, query) {
  return ref.watch(catalogRepositoryProvider).courses(q: query.q, category: query.category, level: query.level?.wire);
});

/// Explore: search + filter courses; open a course to pick a batch.
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _q = '';
  String? _category;
  CourseLevel? _level;
  final Set<String> _knownCategories = {};

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearch(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => setState(() => _q = v.trim()));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final f = ref.watch(fmtProvider);
    final query = (q: _q, category: _category, level: _level);
    final courses = ref.watch(courseSearchProvider(query));
    final currency = ref.watch(displayCurrencyProvider);
    final fx = ref.watch(fxRatesProvider).value ?? FxRates.fallback;
    courses.whenData((list) => _knownCategories.addAll(list.map((c) => c.category).where((c) => c.isNotEmpty)));

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 12, AzzaSpace.gutter, 0),
              sliver: SliverList.list(children: [
                DisplayText(l.exploreTitle, size: 34),
                const SizedBox(height: 18),
                TextField(
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
                const SizedBox(height: 12),
                SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _chip(l.allFilter, _category == null && _level == null, () => setState(() {
                            _category = null;
                            _level = null;
                          })),
                      for (final c in _knownCategories) _chip(c, _category == c, () => setState(() => _category = _category == c ? null : c)),
                      for (final lv in CourseLevel.values)
                        _chip(l.levelN('${lv.number}'), _level == lv, () => setState(() => _level = _level == lv ? null : lv)),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                if (courses.hasValue) MonoLabel(l.coursesCount(f.n(courses.requireValue.length))),
                const SizedBox(height: 8),
              ]),
            ),
            SliverFillRemaining(
              hasScrollBody: true,
              child: AsyncView<List<Course>>(
                value: courses,
                onRetry: () => ref.invalidate(courseSearchProvider(query)),
                isEmpty: (list) => list.isEmpty,
                empty: EmptyState(title: l.noCoursesFound),
                data: (list) => ListView.separated(
                  padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 4, AzzaSpace.gutter, 32),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 14),
                  itemBuilder: (context, i) {
                    final c = list[i];
                    return InkWell(
                      borderRadius: BorderRadius.circular(AzzaSpace.radius),
                      onTap: () => context.push(Routes.course(c.slug.isNotEmpty ? c.slug : c.id)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CourseCover(course: c, locale: locale, height: 170, compact: true),
                          const SizedBox(height: 10),
                          CourseMetaLine(course: c),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Expanded(child: Text(c.title(locale), style: Theme.of(context).textTheme.titleMedium)),
                              Text(f.money(c.priceFils, currency, fx.rateFor(currency)), style: Theme.of(context).textTheme.titleSmall),
                            ],
                          ),
                          if (c.batchCount != null) Text(l.chooseBatchN(f.n(c.batchCount!)), style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) {
    final p = AzzaPalette.of(context);
    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        showCheckmark: false,
        labelStyle: TextStyle(color: selected ? p.onAccent : p.text),
        onSelected: (_) => onTap(),
      ),
    );
  }
}
