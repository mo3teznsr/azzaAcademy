import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';

/// An upcoming batch on a teacher's public profile.
@immutable
class TeacherBatch {
  const TeacherBatch({
    required this.id,
    required this.code,
    required this.courseId,
    this.courseTitle = '',
    this.courseTitleAr,
    this.courseSlug = '',
    this.language = SessionLanguage.en,
    this.timezone = 'Asia/Dubai',
    this.startsOn,
    this.scheduleSummary = '',
    this.seatsLeft = 0,
    this.status = BatchStatus.enrolling,
    this.priceFils = 0,
  });

  factory TeacherBatch.fromJson(Json j) => TeacherBatch(
        id: str(j, 'id'),
        code: str(j, 'code'),
        courseId: str(j, 'courseId'),
        courseTitle: str(j, 'courseTitle'),
        courseTitleAr: strOrNull(j, 'courseTitleAr'),
        courseSlug: str(j, 'courseSlug'),
        language: SessionLanguage.parse(j['language']),
        timezone: str(j, 'timezone', 'Asia/Dubai'),
        startsOn: date(j, 'startsOn'),
        scheduleSummary: str(j, 'scheduleSummary'),
        seatsLeft: integer(j, 'seatsLeft'),
        status: BatchStatus.parse(j['status']),
        priceFils: integer(j, 'priceFils'),
      );

  final String id;
  final String code;
  final String courseId;
  final String courseTitle;
  final String? courseTitleAr;
  final String courseSlug;
  final SessionLanguage language;
  final String timezone;
  final DateTime? startsOn;

  /// `Tue & Thu · 19:00 · 12 sessions` (English, from the API).
  final String scheduleSummary;
  final int seatsLeft;
  final BatchStatus status;

  /// Batch price, else the course price (AED fils).
  final int priceFils;

  bool get isFull => status == BatchStatus.full || seatsLeft <= 0;
  String course(AppLocale l) => l == AppLocale.ar && courseTitleAr != null ? courseTitleAr! : courseTitle;
}

/// `GET /api/v1/teachers/:id` — public teacher profile.
@immutable
class TeacherProfile {
  const TeacherProfile({
    required this.id,
    required this.name,
    this.image,
    this.headline,
    this.bio,
    this.languages = const [],
    this.courses = const [],
    this.upcomingBatches = const [],
  });

  factory TeacherProfile.fromJson(Json j) => TeacherProfile(
        id: str(j, 'id'),
        name: str(j, 'name'),
        image: strOrNull(j, 'image'),
        headline: strOrNull(j, 'headline'),
        bio: strOrNull(j, 'bio'),
        languages: strings(j, 'languages').map(SessionLanguage.parse).toSet().toList(),
        courses: list(j, 'courses').map(Course.fromJson).toList(),
        upcomingBatches: list(j, 'upcomingBatches').map(TeacherBatch.fromJson).toList()
          ..sort((a, b) => (a.startsOn ?? DateTime(9999)).compareTo(b.startsOn ?? DateTime(9999))),
      );

  final String id;
  final String name;
  final String? image;
  final String? headline;
  final String? bio;
  final List<SessionLanguage> languages;
  final List<Course> courses;
  final List<TeacherBatch> upcomingBatches;
}
