import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

@immutable
class CourseModule {
  const CourseModule({required this.order, required this.titleEn, this.titleAr});
  factory CourseModule.fromJson(Json j) =>
      CourseModule(order: integer(j, 'order'), titleEn: str(j, 'titleEn'), titleAr: strOrNull(j, 'titleAr'));

  final int order;
  final String titleEn;
  final String? titleAr;
  String title(AppLocale l) => l == AppLocale.ar && titleAr != null ? titleAr! : titleEn;
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

  String title(AppLocale l) => l == AppLocale.ar && titleAr != null ? titleAr! : titleEn;
  String description(AppLocale l) => l == AppLocale.ar && descriptionAr != null ? descriptionAr! : descriptionEn;

  /// Outcome bullets: description lines (API has no dedicated outcomes field yet).
  List<String> outcomes(AppLocale l) => description(l)
      .split(RegExp(r'\n+|(?<=\.)\s+'))
      .map((e) => e.replaceFirst(RegExp(r'^[-•*]\s*'), '').trim())
      .where((e) => e.isNotEmpty)
      .take(5)
      .toList();
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
