import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

/// A course link on a directory card.
@immutable
class InstructorCourse {
  const InstructorCourse({required this.id, required this.slug, required this.titleEn, this.titleAr});
  factory InstructorCourse.fromJson(Json j) =>
      InstructorCourse(id: str(j, 'id'), slug: str(j, 'slug'), titleEn: str(j, 'titleEn'), titleAr: strOrNull(j, 'titleAr'));
  final String id;
  final String slug;
  final String titleEn;
  final String? titleAr;
  String title(AppLocale l) => l == AppLocale.ar && titleAr != null ? titleAr! : titleEn;
}

/// `GET /api/v1/teachers` → `items[]`: one card in the public instructors directory.
@immutable
class InstructorCard {
  const InstructorCard({
    required this.id,
    required this.name,
    this.image,
    this.headline,
    this.languages = const [],
    this.categories = const [],
    this.courses = const [],
    this.openBatches = 0,
  });

  factory InstructorCard.fromJson(Json j) => InstructorCard(
        id: str(j, 'id'),
        name: str(j, 'name'),
        image: strOrNull(j, 'image'),
        headline: strOrNull(j, 'headline'),
        languages: strings(j, 'languages').map(SessionLanguage.parse).toSet().toList(),
        categories: strings(j, 'categories'),
        courses: list(j, 'courses').map(InstructorCourse.fromJson).toList(),
        openBatches: integer(j, 'openBatches'),
      );

  final String id;
  final String name;
  final String? image;
  final String? headline;
  final List<SessionLanguage> languages;

  /// Category slugs.
  final List<String> categories;
  final List<InstructorCourse> courses;
  final int openBatches;
}

enum ApplicationStatus implements WireEnum {
  pending('PENDING'),
  approved('APPROVED'),
  rejected('REJECTED');

  const ApplicationStatus(this.wire);
  @override
  final String wire;
  static ApplicationStatus parse(Object? raw) =>
      values.firstWhere((v) => v.wire == '$raw', orElse: () => ApplicationStatus.pending);
}

/// The applicant, on the admin's list.
@immutable
class Applicant {
  const Applicant({required this.id, required this.name, required this.email, this.image});
  factory Applicant.fromJson(Json j) =>
      Applicant(id: str(j, 'id'), name: str(j, 'name'), email: str(j, 'email'), image: strOrNull(j, 'image'));
  final String id;
  final String name;
  final String email;
  final String? image;
}

/// An instructor application (`/api/v1/instructor-applications`).
@immutable
class InstructorApplication {
  const InstructorApplication({
    required this.id,
    required this.status,
    this.headline = '',
    this.bio = '',
    this.categories = const [],
    this.languages = const [],
    this.experience = '',
    this.sampleUrl,
    this.phone,
    this.reviewNote,
    this.createdAt,
    this.decidedAt,
    this.user,
  });

  factory InstructorApplication.fromJson(Json j) => InstructorApplication(
        id: str(j, 'id'),
        status: ApplicationStatus.parse(j['status']),
        headline: str(j, 'headline'),
        bio: str(j, 'bio'),
        categories: strings(j, 'categories'),
        languages: strings(j, 'languages').map(SessionLanguage.parse).toSet().toList(),
        experience: str(j, 'experience'),
        sampleUrl: strOrNull(j, 'sampleUrl'),
        phone: strOrNull(j, 'phone'),
        reviewNote: strOrNull(j, 'reviewNote'),
        createdAt: date(j, 'createdAt'),
        decidedAt: date(j, 'decidedAt'),
        user: objOrNull(j, 'user') == null ? null : Applicant.fromJson(obj(j, 'user')),
      );

  final String id;
  final ApplicationStatus status;
  final String headline;
  final String bio;
  final List<String> categories;
  final List<SessionLanguage> languages;
  final String experience;
  final String? sampleUrl;
  final String? phone;
  final String? reviewNote;
  final DateTime? createdAt;
  final DateTime? decidedAt;
  final Applicant? user;
}

/// The student's application form (`instructorApplicationInput`).
@immutable
class InstructorApplicationDraft {
  const InstructorApplicationDraft({
    required this.headline,
    required this.bio,
    required this.categories,
    required this.languages,
    required this.experience,
    this.sampleUrl,
    this.phone,
  });

  final String headline;
  final String bio;
  final List<String> categories;
  final List<SessionLanguage> languages;
  final String experience;
  final String? sampleUrl;
  final String? phone;

  Map<String, dynamic> toJson() => {
        'headline': headline.trim(),
        'bio': bio.trim(),
        'categories': categories,
        'languages': [for (final l in languages) l.wire],
        'experience': experience.trim(),
        if (sampleUrl != null && sampleUrl!.trim().isNotEmpty) 'sampleUrl': sampleUrl!.trim(),
        if (phone != null && phone!.trim().isNotEmpty) 'phone': phone!.trim(),
      };
}
