import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/domain/enums.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/prefs/app_prefs.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/ui.dart';
import '../../teacher/presentation/proposal_widgets.dart' show levelLabel, languageLabel;
import '../data/catalog_repository.dart';
import '../domain/catalog_models.dart';
import '../domain/course_filters.dart';

String sortLabel(AppLocalizations l, CourseSort s) => switch (s) {
      CourseSort.newest => l.sortNewest,
      CourseSort.rating => l.sortRating,
      CourseSort.priceAsc => l.sortPriceAsc,
      CourseSort.priceDesc => l.sortPriceDesc,
      CourseSort.popular => l.sortPopular,
    };

/// Opens the Explore filter sheet; returns the new filters, or null when dismissed.
Future<CourseFilters?> showCourseFilters(BuildContext context, CourseFilters current) => showModalBottomSheet<CourseFilters>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (_) => CourseFiltersSheet(initial: current),
    );

class CourseFiltersSheet extends ConsumerStatefulWidget {
  const CourseFiltersSheet({super.key, required this.initial});
  final CourseFilters initial;

  @override
  ConsumerState<CourseFiltersSheet> createState() => _CourseFiltersSheetState();
}

class _CourseFiltersSheetState extends ConsumerState<CourseFiltersSheet> {
  late CourseFilters _f = widget.initial;
  late final _min = TextEditingController(text: _fmt(widget.initial.minPriceAed));
  late final _max = TextEditingController(text: _fmt(widget.initial.maxPriceAed));
  String? _priceError;

  static String _fmt(num? v) => v == null ? '' : (v == v.roundToDouble() ? '${v.round()}' : '$v');
  static num? _parse(String s) => num.tryParse(s.trim().replaceAll(',', '.'));

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  void _apply() {
    final min = _parse(_min.text), max = _parse(_max.text);
    if (min != null && max != null && min > max) return setState(() => _priceError = context.l10n.priceRangeInvalid);
    Navigator.pop(context, _f.copyWith(minPriceAed: () => min, maxPriceAed: () => max));
  }

  void _reset() {
    _min.clear();
    _max.clear();
    setState(() {
      _f = CourseFilters(q: _f.q);
      _priceError = null;
    });
  }

  Widget _group<T>(String title, List<(T?, String)> options, T? selected, ValueChanged<T?> onSelect, {String keyPrefix = ''}) {
    final p = AzzaPalette.of(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(top: 18, bottom: 8), child: MonoLabel(title)),
      Wrap(spacing: 8, runSpacing: 4, children: [
        for (final (value, label) in options)
          ChoiceChip(
            key: Key('$keyPrefix-${value is WireEnum ? (value as WireEnum).wire : value ?? 'any'}'),
            label: Text(label),
            selected: selected == value,
            showCheckmark: false,
            materialTapTargetSize: MaterialTapTargetSize.padded,
            labelStyle: TextStyle(color: selected == value ? p.onAccent : p.text),
            onSelected: (_) => onSelect(value),
          ),
      ]),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final locale = ref.watch(localeProvider);
    final categories = ref.watch(categoriesProvider).value ?? const <CourseCategory>[];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AzzaSpace.gutter),
          child: Row(children: [
            Expanded(child: Text(l.filters, style: Theme.of(context).textTheme.titleLarge)),
            TextButton(
              key: const Key('reset-filters'),
              style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
              onPressed: _reset,
              child: Text(l.resetFilters),
            ),
          ]),
        ),
        Flexible(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(AzzaSpace.gutter, 0, AzzaSpace.gutter, 12),
            children: [
              _group<CourseSort>(l.sortLabel, [for (final s in CourseSort.values) (s, sortLabel(l, s))], _f.sort,
                  (v) => setState(() => _f = _f.copyWith(sort: v ?? CourseSort.newest)),
                  keyPrefix: 'sort'),
              if (categories.isNotEmpty)
                _group<String>(l.courseCategory, [(null, l.anyOption), for (final c in categories) (c.slug, c.name(locale))], _f.category,
                    (v) => setState(() => _f = _f.copyWith(category: () => v)),
                    keyPrefix: 'category'),
              _group<CourseLevel>(l.courseLevel, [(null, l.anyOption), for (final lv in CourseLevel.values) (lv, levelLabel(l, lv))], _f.level,
                  (v) => setState(() => _f = _f.copyWith(level: () => v)),
                  keyPrefix: 'level'),
              _group<SessionLanguage>(
                  l.sessionLanguage, [(null, l.anyOption), for (final lang in SessionLanguage.values) (lang, languageLabel(l, lang))], _f.language,
                  (v) => setState(() => _f = _f.copyWith(language: () => v)),
                  keyPrefix: 'language'),
              _group<double>(l.minRatingLabel, [(null, l.anyOption), for (final r in const [3.0, 4.0, 4.5]) (r, l.ratingAtLeast(_fmt(r)))],
                  _f.minRating, (v) => setState(() => _f = _f.copyWith(minRating: () => v)),
                  keyPrefix: 'rating'),
              Padding(padding: const EdgeInsets.only(top: 18, bottom: 8), child: MonoLabel(l.priceRangeAed)),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (final (i, c, label) in [(0, _min, l.minPrice), (1, _max, l.maxPrice)]) ...[
                  if (i == 1) const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      key: Key(i == 0 ? 'min-price' : 'max-price'),
                      controller: c,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                      textDirection: TextDirection.ltr,
                      onChanged: (_) {
                        if (_priceError != null) setState(() => _priceError = null);
                      },
                      decoration: fieldDecoration(label: label, icon: Icons.payments_outlined, action: ClearFieldButton(controller: c))
                          .copyWith(errorText: i == 0 ? _priceError : null),
                    ),
                  ),
                ],
              ]),
            ],
          ),
        ),
        BottomActionBar(children: [
          FilledButton(
            key: const Key('apply-filters'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            onPressed: _apply,
            child: Text(l.applyFilters),
          ),
        ]),
      ]),
    );
  }
}
