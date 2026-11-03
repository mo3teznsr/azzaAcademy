import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../catalog/domain/catalog_models.dart';

/// Course title from the embedded course ref, falling back to the flat `courseTitle`.
String _courseName(Course course, String courseTitle, AppLocale l) {
  if (course.titleEn.isEmpty && course.titleAr == null) return courseTitle;
  return course.title(l);
}

/// An earned certificate (`GET /me/certificates` item, or `GET /certificates/:code`).
@immutable
class Certificate {
  const Certificate({
    required this.code,
    required this.batchId,
    required this.batchCode,
    required this.course,
    this.id = '',
    this.issuedAt,
    this.attended = 0,
    this.total = 0,
    this.courseTitle = '',
    this.teacherName = '',
    this.startsOn,
    this.endsOn,
    this.holderName,
  });

  factory Certificate.fromJson(Json j) => Certificate(
        id: str(j, 'id'),
        code: str(j, 'code'),
        issuedAt: date(j, 'issuedAt'),
        attended: integer(j, 'attended'),
        total: integer(j, 'total'),
        batchId: str(j, 'batchId'),
        batchCode: str(j, 'batchCode'),
        course: Course.fromJson(obj(j, 'course')),
        courseTitle: str(j, 'courseTitle'),
        teacherName: str(j, 'teacherName'),
        startsOn: date(j, 'startsOn'),
        endsOn: date(j, 'endsOn'),
        holderName: strOrNull(j, 'holderName'),
      );

  final String id;

  /// `AZ-CERT-7Q4K`.
  final String code;
  final DateTime? issuedAt;
  final int attended;
  final int total;
  final String batchId;
  final String batchCode;
  final Course course;
  final String courseTitle;
  final String teacherName;
  final DateTime? startsOn;
  final DateTime? endsOn;

  /// Only on the public verify response.
  final String? holderName;

  String courseName(AppLocale l) => _courseName(course, courseTitle, l);
}

/// An ACTIVE batch that isn't over yet, with how far the student is from a certificate.
@immutable
class CertificateProgress {
  const CertificateProgress({
    required this.batchId,
    required this.batchCode,
    required this.course,
    this.courseTitle = '',
    this.teacherName = '',
    this.startsOn,
    this.endsOn,
    this.attended = 0,
    this.total = 0,
    this.required = 0,
    this.needed = 0,
    this.sessionsEnded = 0,
    this.reachable = true,
  });

  factory CertificateProgress.fromJson(Json j) => CertificateProgress(
        batchId: str(j, 'batchId'),
        batchCode: str(j, 'batchCode'),
        course: Course.fromJson(obj(j, 'course')),
        courseTitle: str(j, 'courseTitle'),
        teacherName: str(j, 'teacherName'),
        startsOn: date(j, 'startsOn'),
        endsOn: date(j, 'endsOn'),
        attended: integer(j, 'attended'),
        total: integer(j, 'total'),
        required: integer(j, 'required'),
        needed: integer(j, 'needed'),
        sessionsEnded: integer(j, 'sessionsEnded'),
        reachable: boolean(j, 'reachable', true),
      );

  final String batchId;
  final String batchCode;
  final Course course;
  final String courseTitle;
  final String teacherName;
  final DateTime? startsOn;
  final DateTime? endsOn;
  final int attended;

  /// Non-cancelled sessions in the batch.
  final int total;

  /// Sessions to attend for the certificate (80 %, rounded up).
  final int required;

  /// Still to attend.
  final int needed;
  final int sessionsEnded;

  /// `needed` ≤ sessions left.
  final bool reachable;

  /// Progress towards the requirement, 0–1.
  double get fraction => required <= 0 ? 0 : (attended / required).clamp(0.0, 1.0);

  String courseName(AppLocale l) => _courseName(course, courseTitle, l);
}

@immutable
class CertificatesOverview {
  const CertificatesOverview({this.items = const [], this.inProgress = const []});

  factory CertificatesOverview.fromJson(Json j) => CertificatesOverview(
        items: list(j, 'items').map(Certificate.fromJson).toList()
          ..sort((a, b) => (b.issuedAt ?? DateTime(0)).compareTo(a.issuedAt ?? DateTime(0))),
        inProgress: list(j, 'inProgress').map(CertificateProgress.fromJson).toList(),
      );

  final List<Certificate> items;
  final List<CertificateProgress> inProgress;

  bool get isEmpty => items.isEmpty && inProgress.isEmpty;
}
