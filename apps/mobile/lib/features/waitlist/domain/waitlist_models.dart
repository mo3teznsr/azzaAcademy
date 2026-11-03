import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';

String _courseName(Course course, String courseTitle, AppLocale l) {
  if (course.titleEn.isEmpty && course.titleAr == null) return courseTitle;
  return course.title(l);
}

/// A batch I'm waiting for (`GET /me/waitlist` → `items[]`).
@immutable
class WaitlistEntry {
  const WaitlistEntry({
    required this.enrollmentId,
    required this.batchId,
    required this.batchCode,
    required this.course,
    this.joinedAt,
    this.batchStatus = BatchStatus.full,
    this.startsOn,
    this.courseTitle = '',
    this.position = 0,
    this.total = 0,
  });

  factory WaitlistEntry.fromJson(Json j) => WaitlistEntry(
        enrollmentId: str(j, 'enrollmentId'),
        joinedAt: date(j, 'joinedAt'),
        batchId: str(j, 'batchId'),
        batchCode: str(j, 'batchCode'),
        batchStatus: BatchStatus.parse(j['batchStatus']),
        startsOn: date(j, 'startsOn'),
        course: Course.fromJson(obj(j, 'course')),
        courseTitle: str(j, 'courseTitle'),
        position: integer(j, 'position'),
        total: integer(j, 'total'),
      );

  final String enrollmentId;
  final DateTime? joinedAt;
  final String batchId;
  final String batchCode;
  final BatchStatus batchStatus;
  final DateTime? startsOn;
  final Course course;
  final String courseTitle;

  /// 1-based place in line (the order seats are offered in).
  final int position;

  /// People waiting for this batch.
  final int total;

  /// People ahead of me.
  int get ahead => position > 1 ? position - 1 : 0;
  bool get isNext => position == 1;

  String courseName(AppLocale l) => _courseName(course, courseTitle, l);
}

/// A seat offered to me from the waitlist (`promoted[]`): check out before [holdExpiresAt].
@immutable
class PromotedSeat {
  const PromotedSeat({
    required this.enrollmentId,
    required this.batchId,
    required this.batchCode,
    required this.course,
    this.batchStatus = BatchStatus.full,
    this.startsOn,
    this.courseTitle = '',
    this.promotedAt,
    this.holdExpiresAt,
  });

  factory PromotedSeat.fromJson(Json j) => PromotedSeat(
        enrollmentId: str(j, 'enrollmentId'),
        batchId: str(j, 'batchId'),
        batchCode: str(j, 'batchCode'),
        batchStatus: BatchStatus.parse(j['batchStatus']),
        startsOn: date(j, 'startsOn'),
        course: Course.fromJson(obj(j, 'course')),
        courseTitle: str(j, 'courseTitle'),
        promotedAt: date(j, 'promotedAt'),
        holdExpiresAt: date(j, 'holdExpiresAt'),
      );

  final String enrollmentId;
  final String batchId;
  final String batchCode;
  final BatchStatus batchStatus;
  final DateTime? startsOn;
  final Course course;
  final String courseTitle;
  final DateTime? promotedAt;
  final DateTime? holdExpiresAt;

  /// Time left on the hold (zero once expired; null when the API gave no deadline).
  Duration? remaining(DateTime now) {
    if (holdExpiresAt == null) return null;
    final d = holdExpiresAt!.difference(now);
    return d.isNegative ? Duration.zero : d;
  }

  bool expired(DateTime now) => holdExpiresAt != null && !now.isBefore(holdExpiresAt!);

  String courseName(AppLocale l) => _courseName(course, courseTitle, l);
}

@immutable
class WaitlistOverview {
  const WaitlistOverview({this.items = const [], this.promoted = const []});

  factory WaitlistOverview.fromJson(Json j) => WaitlistOverview(
        items: list(j, 'items').map(WaitlistEntry.fromJson).toList(),
        promoted: list(j, 'promoted').map(PromotedSeat.fromJson).toList(),
      );

  final List<WaitlistEntry> items;
  final List<PromotedSeat> promoted;

  bool get isEmpty => items.isEmpty && promoted.isEmpty;

  WaitlistOverview without(String batchId) => WaitlistOverview(
        items: items.where((e) => e.batchId != batchId).toList(),
        promoted: promoted,
      );
}
