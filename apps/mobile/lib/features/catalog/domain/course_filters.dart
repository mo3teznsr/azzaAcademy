import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';

/// `sort` on `GET /courses` (shared `COURSE_SORTS`).
enum CourseSort implements WireEnum {
  newest('newest'),
  rating('rating'),
  priceAsc('price_asc'),
  priceDesc('price_desc'),
  popular('popular');

  const CourseSort(this.wire);
  @override
  final String wire;
}

/// Everything the Explore search and filter sheet can ask `GET /courses` for.
@immutable
class CourseFilters {
  const CourseFilters({
    this.q = '',
    this.category,
    this.level,
    this.language,
    this.minPriceAed,
    this.maxPriceAed,
    this.minRating,
    this.sort = CourseSort.newest,
    this.featured = false,
    this.type,
  });

  final String q;

  /// Category slug.
  final String? category;
  final CourseLevel? level;

  /// Has an open batch taught in this language.
  final SessionLanguage? language;
  final num? minPriceAed;
  final num? maxPriceAed;
  final double? minRating;
  final CourseSort sort;
  final bool featured;

  /// Live classes or recorded lessons; null = both.
  final CourseType? type;

  /// Filters set in the sheet (search text and the category rail are visible on screen, so they don't count).
  int get activeCount => [
        level != null,
        language != null,
        minPriceAed != null || maxPriceAed != null,
        minRating != null,
        sort != CourseSort.newest,
        type != null,
      ].where((on) => on).length;

  Map<String, dynamic> toQuery() => {
        if (q.trim().isNotEmpty) 'q': q.trim(),
        'category': ?category,
        'level': ?level?.wire,
        'language': ?language?.wire,
        'minPriceAed': ?minPriceAed,
        'maxPriceAed': ?maxPriceAed,
        'minRating': ?minRating,
        if (sort != CourseSort.newest) 'sort': sort.wire,
        if (featured) 'featured': 'true',
        'type': ?type?.wire,
      };

  CourseFilters copyWith({
    String? q,
    ValueGetter<String?>? category,
    ValueGetter<CourseLevel?>? level,
    ValueGetter<SessionLanguage?>? language,
    ValueGetter<num?>? minPriceAed,
    ValueGetter<num?>? maxPriceAed,
    ValueGetter<double?>? minRating,
    CourseSort? sort,
    ValueGetter<CourseType?>? type,
  }) =>
      CourseFilters(
        q: q ?? this.q,
        category: category == null ? this.category : category(),
        level: level == null ? this.level : level(),
        language: language == null ? this.language : language(),
        minPriceAed: minPriceAed == null ? this.minPriceAed : minPriceAed(),
        maxPriceAed: maxPriceAed == null ? this.maxPriceAed : maxPriceAed(),
        minRating: minRating == null ? this.minRating : minRating(),
        sort: sort ?? this.sort,
        featured: featured,
        type: type == null ? this.type : type(),
      );

  /// Keeps search text and category; clears what the sheet sets.
  CourseFilters clearedSheet() => CourseFilters(q: q, category: category);

  @override
  bool operator ==(Object other) =>
      other is CourseFilters &&
      other.q == q &&
      other.category == category &&
      other.level == level &&
      other.language == language &&
      other.minPriceAed == minPriceAed &&
      other.maxPriceAed == maxPriceAed &&
      other.minRating == minRating &&
      other.sort == sort &&
      other.featured == featured &&
      other.type == type;

  @override
  int get hashCode => Object.hash(q, category, level, language, minPriceAed, maxPriceAed, minRating, sort, featured, type);
}
