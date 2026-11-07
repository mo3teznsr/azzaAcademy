import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';

/// `YYYY-MM-DD` for a calendar day (no timezone shift).
String isoDay(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// One module row in the course editor.
@immutable
class ModuleDraft {
  const ModuleDraft({required this.titleEn, this.titleAr, this.descriptionEn, this.descriptionAr});
  final String titleEn;
  final String? titleAr;
  final String? descriptionEn;
  final String? descriptionAr;
}

/// Body of `POST /courses` and `PATCH /courses/:id` (a teacher never sends `status`; the server makes the slug).
/// No price: seats are priced per batch, and the course's "from" price is derived from its open batches.
@immutable
class CourseDraft {
  const CourseDraft({
    required this.titleEn,
    this.titleAr,
    this.descriptionEn = '',
    this.descriptionAr,
    this.category = '',
    this.level = CourseLevel.beginner,
    this.coverStyle = 'sun',
    this.coverImageUrl,
    this.introVideoUrl,
    this.modules = const [],
    this.outcomesEn = const [],
    this.outcomesAr = const [],
    this.requirementsEn = const [],
    this.requirementsAr = const [],
    this.audienceEn = const [],
    this.audienceAr = const [],
    this.faq = const [],
  });

  final String titleEn;
  final String? titleAr;
  final String descriptionEn;
  final String? descriptionAr;
  final String category;
  final CourseLevel level;
  final String coverStyle;
  final String? coverImageUrl;
  final String? introVideoUrl;
  final List<ModuleDraft> modules;
  final List<String> outcomesEn;
  final List<String> outcomesAr;
  final List<String> requirementsEn;
  final List<String> requirementsAr;
  final List<String> audienceEn;
  final List<String> audienceAr;
  final List<CourseFaq> faq;

  static List<String> _bullets(List<String> v) => v.map((e) => e.trim()).where((e) => e.isNotEmpty).toList();

  static String? _opt(String? v) => v == null || v.trim().isEmpty ? null : v.trim();

  Map<String, dynamic> toJson() => {
        'titleEn': titleEn.trim(),
        'titleAr': ?_opt(titleAr),
        'descriptionEn': descriptionEn.trim(),
        'descriptionAr': ?_opt(descriptionAr),
        'category': category.trim(),
        'level': level.wire,
        'coverStyle': coverStyle,
        'coverImageUrl': ?_opt(coverImageUrl),
        'introVideoUrl': ?_opt(introVideoUrl),
        'modules': [
          for (final (i, m) in modules.indexed)
            {
              'titleEn': m.titleEn.trim(),
              'titleAr': ?_opt(m.titleAr),
              'descriptionEn': ?_opt(m.descriptionEn),
              'descriptionAr': ?_opt(m.descriptionAr),
              'order': i + 1,
            },
        ],
        'outcomesEn': _bullets(outcomesEn),
        'outcomesAr': _bullets(outcomesAr),
        'requirementsEn': _bullets(requirementsEn),
        'requirementsAr': _bullets(requirementsAr),
        'audienceEn': _bullets(audienceEn),
        'audienceAr': _bullets(audienceAr),
        'faq': [for (final q in faq) q.toJson()],
      };
}

/// The recurring rule a batch's sessions are generated from (0 = Sunday).
@immutable
class ScheduleDraft {
  const ScheduleDraft({
    required this.weekdays,
    required this.startTime,
    required this.durationMin,
    required this.sessionCount,
    required this.startsOn,
    this.skipDates = const [],
  });

  final List<int> weekdays;

  /// `HH:MM`, 24h, in the batch timezone.
  final String startTime;
  final int durationMin;
  final int sessionCount;
  final DateTime startsOn;
  final List<DateTime> skipDates;

  Map<String, dynamic> toJson() => {
        'weekdays': [...weekdays]..sort(),
        'startTime': startTime,
        'durationMin': durationMin,
        'sessionCount': sessionCount,
        'startsOn': isoDay(startsOn),
        'skipDates': skipDates.map(isoDay).toList(),
      };
}

/// Body of `POST /batches` from a teacher (`teacherId` is forced server-side; the batch starts as DRAFT).
@immutable
class BatchDraft {
  const BatchDraft({
    required this.courseId,
    required this.code,
    required this.capacity,
    required this.language,
    required this.timezone,
    required this.schedule,
    required this.priceAed,
    this.waitlistEnabled = true,
    this.minStudents = 0,
  });

  final String courseId;
  final String code;
  final int capacity;
  final SessionLanguage language;
  final String timezone;
  final ScheduleDraft schedule;

  /// Seat price in AED (required: pricing lives on the batch).
  final num priceAed;
  final bool waitlistEnabled;
  final int minStudents;

  static final codePattern = RegExp(r'^B\d{2,4}$');

  Map<String, dynamic> toJson() => {
        'courseId': courseId,
        'code': code,
        'capacity': capacity,
        'language': language.wire,
        'timezone': timezone,
        'priceAed': priceAed,
        'waitlistEnabled': waitlistEnabled,
        'minStudents': minStudents,
        'schedule': schedule.toJson(),
      };
}

@immutable
class PlannedSession {
  const PlannedSession({required this.number, required this.startsAt, required this.endsAt, required this.localDate});
  factory PlannedSession.fromJson(Json j) {
    final starts = dateOr(j, 'startsAt', DateTime.now());
    return PlannedSession(
      number: integer(j, 'number', 1),
      startsAt: starts,
      endsAt: dateOr(j, 'endsAt', starts),
      localDate: str(j, 'localDate'),
    );
  }
  final int number;
  final DateTime startsAt;
  final DateTime endsAt;
  final String localDate;
}

/// A planned session that overlaps another batch the teacher already runs.
@immutable
class ScheduleConflict {
  const ScheduleConflict({required this.sessionNumber, required this.localDate, required this.withBatch});
  factory ScheduleConflict.fromJson(Json j) =>
      ScheduleConflict(sessionNumber: integer(j, 'sessionNumber'), localDate: str(j, 'localDate'), withBatch: str(j, 'withBatch'));
  final int sessionNumber;
  final String localDate;
  final String withBatch;

  /// `details.conflicts` of a 409 `CONFLICT` from `POST /batches`.
  static List<ScheduleConflict> fromDetails(Object? details) {
    if (details is! Map) return const [];
    final raw = details['conflicts'];
    if (raw is! List) return const [];
    return raw.whereType<Map>().map((e) => ScheduleConflict.fromJson(e.cast<String, dynamic>())).toList();
  }
}

/// `POST /batches/schedule/preview` → `{ sessions[], skipped[], endsOn, conflicts[] }`.
@immutable
class SchedulePreview {
  const SchedulePreview({this.sessions = const [], this.skipped = const [], this.endsOn, this.conflicts = const []});
  factory SchedulePreview.fromJson(Json j) => SchedulePreview(
        sessions: list(j, 'sessions').map(PlannedSession.fromJson).toList(),
        skipped: strings(j, 'skipped'),
        endsOn: strOrNull(j, 'endsOn'),
        conflicts: list(j, 'conflicts').map(ScheduleConflict.fromJson).toList(),
      );
  final List<PlannedSession> sessions;
  final List<String> skipped;
  final String? endsOn;
  final List<ScheduleConflict> conflicts;

  ScheduleConflict? conflictFor(int sessionNumber) {
    for (final c in conflicts) {
      if (c.sessionNumber == sessionNumber) return c;
    }
    return null;
  }
}
