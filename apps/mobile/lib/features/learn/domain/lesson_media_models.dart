import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

/// Adaptive streaming state of a lesson video (`stream` on `GET /lessons/:id`).
enum LessonStreamStatus { processing, ready, failed }

/// What the in-app player needs for one lesson: the saved position, the signed HLS / low-MP4 URLs when the stream is
/// ready, and whether the video may be saved for offline viewing.
@immutable
class LessonPlayback {
  const LessonPlayback({this.positionSec = 0, this.status, this.hlsUrl, this.lowMp4Url, this.posterUrl, this.durationSec, this.downloadable = false});

  factory LessonPlayback.fromJson(Json j) {
    final s = objOrNull(j, 'stream');
    return LessonPlayback(
      positionSec: integer(j, 'videoPositionSec'),
      status: s == null ? null : enumByName(LessonStreamStatus.values, str(s, 'status').toLowerCase(), LessonStreamStatus.processing),
      hlsUrl: s == null ? null : strOrNull(s, 'hlsUrl'),
      lowMp4Url: s == null ? null : strOrNull(s, 'lowMp4Url'),
      posterUrl: s == null ? null : strOrNull(s, 'posterUrl'),
      durationSec: s == null ? null : intOrNull(s, 'durationSec'),
      downloadable: j['downloadable'] == true,
    );
  }

  final int positionSec;
  final LessonStreamStatus? status;
  final String? hlsUrl;
  final String? lowMp4Url;
  final String? posterUrl;
  final int? durationSec;
  final bool downloadable;

  bool get ready => status == LessonStreamStatus.ready;
}

/// `POST /lessons/:id/download` — a short-lived link to the smallest file, and how long the copy may play offline.
@immutable
class DownloadTicket {
  const DownloadTicket({required this.url, required this.expiresAt, required this.offlineUntil, this.accessUntil, this.quality = 'original', this.durationSec});

  factory DownloadTicket.fromJson(Json j) => DownloadTicket(
        url: str(j, 'url'),
        expiresAt: dateOr(j, 'expiresAt', DateTime.now()),
        offlineUntil: dateOr(j, 'offlineUntil', DateTime.now()),
        accessUntil: date(j, 'accessUntil'),
        quality: str(j, 'quality', 'original'),
        durationSec: intOrNull(j, 'durationSec'),
      );

  final String url;
  final DateTime expiresAt;
  final DateTime offlineUntil;
  final DateTime? accessUntil;

  /// `low` (the lowest MP4 rendition) or `original` (the upload).
  final String quality;
  final int? durationSec;
}

/// One row of `POST /me/lesson-downloads/status`.
@immutable
class DownloadStatusItem {
  const DownloadStatusItem({required this.lessonId, required this.allowed, this.offlineUntil, this.accessUntil});

  factory DownloadStatusItem.fromJson(Json j) => DownloadStatusItem(
        lessonId: str(j, 'lessonId'),
        allowed: j['allowed'] == true,
        offlineUntil: date(j, 'offlineUntil'),
        accessUntil: date(j, 'accessUntil'),
      );

  final String lessonId;
  final bool allowed;
  final DateTime? offlineUntil;
  final DateTime? accessUntil;
}

/// A lesson video saved on this device (kept in shared preferences; the file lives in the app's documents folder).
@immutable
class DownloadEntry {
  const DownloadEntry({
    required this.lessonId,
    required this.courseId,
    required this.titleEn,
    this.titleAr,
    required this.fileName,
    required this.bytes,
    required this.downloadedAt,
    required this.offlineUntil,
    this.accessUntil,
    this.quality = 'original',
    this.durationSec,
    this.positionSec = 0,
    this.userId,
  });

  factory DownloadEntry.fromJson(Json j) => DownloadEntry(
        lessonId: str(j, 'lessonId'),
        courseId: str(j, 'courseId'),
        titleEn: str(j, 'titleEn'),
        titleAr: strOrNull(j, 'titleAr'),
        fileName: str(j, 'fileName'),
        bytes: integer(j, 'bytes'),
        downloadedAt: dateOr(j, 'downloadedAt', DateTime.fromMillisecondsSinceEpoch(0)),
        offlineUntil: dateOr(j, 'offlineUntil', DateTime.fromMillisecondsSinceEpoch(0)),
        accessUntil: date(j, 'accessUntil'),
        quality: str(j, 'quality', 'original'),
        durationSec: intOrNull(j, 'durationSec'),
        positionSec: integer(j, 'positionSec'),
        userId: strOrNull(j, 'userId'),
      );

  final String lessonId;
  final String courseId;
  final String titleEn;
  final String? titleAr;

  /// Name inside the downloads folder (never an absolute path: the app container moves on iOS updates).
  final String fileName;
  final int bytes;
  final DateTime downloadedAt;

  /// Plays offline until then; renewed by the online launch check.
  final DateTime offlineUntil;
  final DateTime? accessUntil;
  final String quality;
  final int? durationSec;

  /// Where the learner stopped in the offline copy.
  final int positionSec;

  /// The account that saved it; other accounts on the device never see it.
  final String? userId;

  String title(AppLocale l) => l == AppLocale.ar && titleAr != null && titleAr!.trim().isNotEmpty ? titleAr! : titleEn;

  DownloadEntry copyWith({DateTime? offlineUntil, DateTime? accessUntil, int? positionSec}) => DownloadEntry(
        lessonId: lessonId,
        courseId: courseId,
        titleEn: titleEn,
        titleAr: titleAr,
        fileName: fileName,
        bytes: bytes,
        downloadedAt: downloadedAt,
        offlineUntil: offlineUntil ?? this.offlineUntil,
        accessUntil: accessUntil ?? this.accessUntil,
        quality: quality,
        durationSec: durationSec,
        positionSec: positionSec ?? this.positionSec,
        userId: userId,
      );

  Json toJson() => {
        'lessonId': lessonId,
        'courseId': courseId,
        'titleEn': titleEn,
        'titleAr': ?titleAr,
        'fileName': fileName,
        'bytes': bytes,
        'downloadedAt': downloadedAt.toUtc().toIso8601String(),
        'offlineUntil': offlineUntil.toUtc().toIso8601String(),
        if (accessUntil != null) 'accessUntil': accessUntil!.toUtc().toIso8601String(),
        'quality': quality,
        'durationSec': ?durationSec,
        'positionSec': positionSec,
        'userId': ?userId,
      };
}
