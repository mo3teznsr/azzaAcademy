import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

/// Picks the Arabic text when the app is in Arabic and it exists, else the English.
String _pick(AppLocale l, String en, String? ar) => l == AppLocale.ar && ar != null && ar.trim().isNotEmpty ? ar : en;
List<String> _pickList(AppLocale l, List<String> en, List<String> ar) => l == AppLocale.ar && ar.isNotEmpty ? ar : en;

/// `GET /categories` item, and `Course.categoryRef`. A course's `category` field is the [slug].
@immutable
class CourseCategory {
  const CourseCategory({required this.slug, required this.nameEn, this.nameAr, this.icon, this.courseCount});
  factory CourseCategory.fromJson(Json j) => CourseCategory(
        slug: str(j, 'slug'),
        nameEn: str(j, 'nameEn', str(j, 'slug')),
        nameAr: strOrNull(j, 'nameAr'),
        icon: strOrNull(j, 'icon'),
        courseCount: intOrNull(j, 'courseCount'),
      );
  final String slug;
  final String nameEn;
  final String? nameAr;

  /// lucide icon name from the web admin (mapped to a Material icon on mobile).
  final String? icon;

  /// Published courses in it (only on `GET /categories`).
  final int? courseCount;
  String name(AppLocale l) => _pick(l, nameEn, nameAr);
}

@immutable
class CourseFaq {
  const CourseFaq({required this.qEn, required this.aEn, this.qAr, this.aAr});
  factory CourseFaq.fromJson(Json j) =>
      CourseFaq(qEn: str(j, 'qEn'), aEn: str(j, 'aEn'), qAr: strOrNull(j, 'qAr'), aAr: strOrNull(j, 'aAr'));
  final String qEn;
  final String aEn;
  final String? qAr;
  final String? aAr;
  String question(AppLocale l) => _pick(l, qEn, qAr);
  String answer(AppLocale l) => _pick(l, aEn, aAr);
  Map<String, dynamic> toJson() => {
        'qEn': qEn.trim(),
        'aEn': aEn.trim(),
        if (qAr != null && qAr!.trim().isNotEmpty) 'qAr': qAr!.trim(),
        if (aAr != null && aAr!.trim().isNotEmpty) 'aAr': aAr!.trim(),
      };
}

@immutable
class CourseModule {
  const CourseModule({required this.order, required this.titleEn, this.titleAr, this.descriptionEn, this.descriptionAr});
  factory CourseModule.fromJson(Json j) => CourseModule(
        order: integer(j, 'order'),
        titleEn: str(j, 'titleEn'),
        titleAr: strOrNull(j, 'titleAr'),
        descriptionEn: strOrNull(j, 'descriptionEn'),
        descriptionAr: strOrNull(j, 'descriptionAr'),
      );

  final int order;
  final String titleEn;
  final String? titleAr;
  final String? descriptionEn;
  final String? descriptionAr;
  String title(AppLocale l) => _pick(l, titleEn, titleAr);
  String? description(AppLocale l) {
    final d = _pick(l, descriptionEn ?? '', descriptionAr);
    return d.trim().isEmpty ? null : d;
  }
}

@immutable
class Course {
  const Course({
    required this.id,
    required this.slug,
    required this.titleEn,
    this.titleAr,
    this.descriptionEn = '',
    this.descriptionAr,
    this.category = '',
    this.level = CourseLevel.beginner,
    this.coverStyle = 'sun',
    this.coverImageUrl,
    this.introVideoUrl,
    this.priceFils = 0,
    this.status = CourseStatus.published,
    this.modules = const [],
    this.batchCount,
    this.createdById,
    this.reviewNote,
    this.submittedAt,
    this.categoryRef,
    this.outcomesEn = const [],
    this.outcomesAr = const [],
    this.requirementsEn = const [],
    this.requirementsAr = const [],
    this.audienceEn = const [],
    this.audienceAr = const [],
    this.faq = const [],
    this.ratingAvg = 0,
    this.ratingCount = 0,
    this.featuredRank,
  });

  factory Course.fromJson(Json j) => Course(
        id: str(j, 'id'),
        slug: str(j, 'slug'),
        titleEn: str(j, 'titleEn', str(j, 'title')),
        titleAr: strOrNull(j, 'titleAr'),
        descriptionEn: str(j, 'descriptionEn'),
        descriptionAr: strOrNull(j, 'descriptionAr'),
        category: str(j, 'category'),
        level: CourseLevel.parse(j['level']),
        coverStyle: str(j, 'coverStyle', 'sun'),
        coverImageUrl: strOrNull(j, 'coverImageUrl'),
        introVideoUrl: strOrNull(j, 'introVideoUrl'),
        priceFils: integer(j, 'priceFils'),
        status: CourseStatus.parse(j['status']),
        modules: list(j, 'modules').map(CourseModule.fromJson).toList()..sort((a, b) => a.order.compareTo(b.order)),
        batchCount: intOrNull(obj(j, '_count'), 'batches') ?? intOrNull(j, 'openBatches'),
        createdById: strOrNull(j, 'createdById'),
        reviewNote: strOrNull(j, 'reviewNote'),
        submittedAt: date(j, 'submittedAt'),
        categoryRef: objOrNull(j, 'categoryRef') == null ? null : CourseCategory.fromJson(obj(j, 'categoryRef')),
        outcomesEn: strings(j, 'outcomesEn'),
        outcomesAr: strings(j, 'outcomesAr'),
        requirementsEn: strings(j, 'requirementsEn'),
        requirementsAr: strings(j, 'requirementsAr'),
        audienceEn: strings(j, 'audienceEn'),
        audienceAr: strings(j, 'audienceAr'),
        faq: list(j, 'faq').map(CourseFaq.fromJson).toList(),
        ratingAvg: dbl(j, 'ratingAvg'),
        ratingCount: integer(j, 'ratingCount'),
        featuredRank: intOrNull(j, 'featuredRank'),
      );

  final String id;
  final String slug;
  final String titleEn;
  final String? titleAr;
  final String descriptionEn;
  final String? descriptionAr;
  final String category;
  final CourseLevel level;
  final String coverStyle;

  /// Photo cover (`/media/...` or absolute URL); null = typographic cover.
  final String? coverImageUrl;

  /// Short intro video (uploaded file or an https link such as YouTube).
  final String? introVideoUrl;
  final int priceFils;
  final CourseStatus status;
  final List<CourseModule> modules;
  final int? batchCount;

  /// The teacher who proposed the course (null for admin-made courses).
  final String? createdById;

  /// The admin's note when the course was sent back to the teacher.
  final String? reviewNote;
  final DateTime? submittedAt;

  /// `{ slug, nameEn, nameAr, icon }` of [category]; null on older payloads.
  final CourseCategory? categoryRef;
  final List<String> outcomesEn;
  final List<String> outcomesAr;
  final List<String> requirementsEn;
  final List<String> requirementsAr;
  final List<String> audienceEn;
  final List<String> audienceAr;
  final List<CourseFaq> faq;
  final double ratingAvg;
  final int ratingCount;

  /// Position on the featured rail (null = not featured).
  final int? featuredRank;

  String title(AppLocale l) => _pick(l, titleEn, titleAr);
  String description(AppLocale l) => _pick(l, descriptionEn, descriptionAr);

  /// The category's name in the app language (falls back to the slug).
  String categoryName(AppLocale l) => categoryRef?.name(l) ?? category;

  /// "What you'll learn" bullets.
  List<String> outcomes(AppLocale l) => _pickList(l, outcomesEn, outcomesAr);
  List<String> requirements(AppLocale l) => _pickList(l, requirementsEn, requirementsAr);
  List<String> audience(AppLocale l) => _pickList(l, audienceEn, audienceAr);
}

@immutable
class PersonRef {
  const PersonRef({required this.id, required this.name, this.image});
  factory PersonRef.fromJson(Json j) => PersonRef(id: str(j, 'id'), name: str(j, 'name'), image: strOrNull(j, 'image'));
  final String id;
  final String name;
  final String? image;
}

@immutable
class ScheduleRule {
  const ScheduleRule({this.weekdays = const [], this.startTime = '', this.durationMin = 60, this.sessionCount = 0});
  factory ScheduleRule.fromJson(Json j) => ScheduleRule(
        weekdays: (j['weekdays'] is List) ? (j['weekdays'] as List).map((e) => e is int ? e : int.tryParse('$e') ?? 0).toList() : const [],
        startTime: str(j, 'startTime'),
        durationMin: integer(j, 'durationMin', 60),
        sessionCount: integer(j, 'sessionCount'),
      );

  /// 0 = Sunday (API convention).
  final List<int> weekdays;
  final String startTime;
  final int durationMin;
  final int sessionCount;
}

@immutable
class SessionSummary {
  const SessionSummary({
    required this.id,
    required this.number,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    this.status = SessionStatus.scheduled,
    this.batchId = '',
    this.movedFrom,
    this.recordingUrl,
    this.batchCode = '',
    this.courseTitle = '',
    this.courseTitleAr,
    this.participantCount,
  });

  factory SessionSummary.fromJson(Json j) {
    final batch = obj(j, 'batch');
    final course = obj(batch, 'course');
    final starts = dateOr(j, 'startsAt', DateTime.now());
    return SessionSummary(
      id: str(j, 'id'),
      batchId: str(j, 'batchId', str(batch, 'id')),
      number: integer(j, 'number', 1),
      title: str(j, 'title'),
      startsAt: starts,
      endsAt: dateOr(j, 'endsAt', starts.add(const Duration(minutes: 90))),
      status: SessionStatus.parse(j['status']),
      movedFrom: date(j, 'movedFrom'),
      recordingUrl: strOrNull(j, 'recordingUrl'),
      batchCode: str(j, 'batchCode', str(batch, 'code')),
      courseTitle: str(j, 'courseTitle', str(course, 'titleEn')),
      courseTitleAr: strOrNull(course, 'titleAr'),
      participantCount: intOrNull(j, 'participantCount') ?? intOrNull(j, 'inRoom'),
    );
  }

  final String id;
  final String batchId;
  final int number;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
  final SessionStatus status;
  final DateTime? movedFrom;
  final String? recordingUrl;
  final String batchCode;
  final String courseTitle;
  final String? courseTitleAr;
  final int? participantCount;

  Duration get duration => endsAt.difference(startsAt);
  bool get isLive => status == SessionStatus.live;
  String course(AppLocale l) => l == AppLocale.ar && courseTitleAr != null ? courseTitleAr! : courseTitle;

  /// Lobby opens 15 min before start (API rule) and stays open while live.
  bool lobbyOpen(DateTime now) =>
      status == SessionStatus.live ||
      (status == SessionStatus.scheduled && now.isAfter(startsAt.subtract(const Duration(minutes: 15))) && now.isBefore(endsAt));
}

@immutable
class Batch {
  const Batch({
    required this.id,
    required this.code,
    required this.courseId,
    this.course,
    this.teacher,
    this.capacity = 0,
    this.language = SessionLanguage.en,
    this.timezone = 'Asia/Dubai',
    this.priceFils,
    this.status = BatchStatus.enrolling,
    this.startsOn,
    this.endsOn,
    this.schedule = const ScheduleRule(),
    this.seatsTaken = 0,
    this.sessionCount = 0,
    this.sessions = const [],
    this.waitlistEnabled = true,
    this.waitlistCount,
    this.reviewNote,
    this.submittedAt,
  });

  factory Batch.fromJson(Json j) {
    final count = obj(j, '_count');
    final courseJson = objOrNull(j, 'course');
    final sessions = list(j, 'sessions').map(SessionSummary.fromJson).toList()..sort((a, b) => a.number.compareTo(b.number));
    final code = str(j, 'code');
    final course = courseJson == null ? null : Course.fromJson(courseJson);
    return Batch(
      id: str(j, 'id'),
      code: code,
      courseId: str(j, 'courseId', course?.id ?? ''),
      course: course,
      teacher: objOrNull(j, 'teacher') == null ? null : PersonRef.fromJson(obj(j, 'teacher')),
      capacity: integer(j, 'capacity'),
      language: SessionLanguage.parse(j['language']),
      timezone: str(j, 'timezone', 'Asia/Dubai'),
      priceFils: intOrNull(j, 'priceFils'),
      status: BatchStatus.parse(j['status']),
      startsOn: date(j, 'startsOn'),
      endsOn: date(j, 'endsOn'),
      schedule: ScheduleRule.fromJson(obj(j, 'schedule')),
      seatsTaken: intOrNull(j, 'seatsTaken') ?? integer(count, 'enrollments'),
      sessionCount: intOrNull(count, 'sessions') ?? (sessions.isNotEmpty ? sessions.length : integer(obj(j, 'schedule'), 'sessionCount')),
      sessions: [
        for (final s in sessions)
          SessionSummary(
            id: s.id,
            batchId: s.batchId.isEmpty ? str(j, 'id') : s.batchId,
            number: s.number,
            title: s.title,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            status: s.status,
            movedFrom: s.movedFrom,
            recordingUrl: s.recordingUrl,
            batchCode: s.batchCode.isEmpty ? code : s.batchCode,
            courseTitle: s.courseTitle.isEmpty ? (course?.titleEn ?? '') : s.courseTitle,
            courseTitleAr: s.courseTitleAr ?? course?.titleAr,
          ),
      ],
      waitlistEnabled: boolean(j, 'waitlistEnabled', true),
      waitlistCount: intOrNull(j, 'waitlistCount'),
      reviewNote: strOrNull(j, 'reviewNote'),
      submittedAt: date(j, 'submittedAt'),
    );
  }

  final String id;
  final String code;
  final String courseId;
  final Course? course;
  final PersonRef? teacher;
  final int capacity;
  final SessionLanguage language;
  final String timezone;
  final int? priceFils;
  final BatchStatus status;
  final DateTime? startsOn;
  final DateTime? endsOn;
  final ScheduleRule schedule;
  final int seatsTaken;
  final int sessionCount;
  final List<SessionSummary> sessions;
  final bool waitlistEnabled;
  final int? waitlistCount;

  /// The admin's note when the batch was sent back to the teacher.
  final String? reviewNote;
  final DateTime? submittedAt;

  int get seatsLeft => (capacity - seatsTaken).clamp(0, capacity);
  int get effectivePriceFils => priceFils ?? course?.priceFils ?? 0;
  int sessionsDone(DateTime now) =>
      sessions.where((s) => s.status == SessionStatus.ended || (s.status != SessionStatus.cancelled && s.endsAt.isBefore(now))).length;

  SessionSummary? nextSession(DateTime now) {
    for (final s in sessions) {
      if (s.status == SessionStatus.live) return s;
      if (s.status == SessionStatus.scheduled && s.endsAt.isAfter(now)) return s;
    }
    return null;
  }
}
