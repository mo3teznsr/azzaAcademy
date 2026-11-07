import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';

String _pick(AppLocale l, String en, String? ar) => l == AppLocale.ar && ar != null && ar.trim().isNotEmpty ? ar : en;

/// A lesson's downloadable or linked extra (`attachments[]`).
@immutable
class LessonAttachment {
  const LessonAttachment({required this.title, required this.url});
  factory LessonAttachment.fromJson(Json j) => LessonAttachment(title: str(j, 'title'), url: str(j, 'url'));
  final String title;
  final String url;
}

@immutable
class Lesson {
  const Lesson({
    required this.id,
    required this.moduleId,
    required this.order,
    required this.titleEn,
    this.titleAr,
    this.bodyEn = '',
    this.bodyAr,
    this.videoUrl,
    this.attachments = const [],
  });

  factory Lesson.fromJson(Json j) => Lesson(
        id: str(j, 'id'),
        moduleId: str(j, 'moduleId'),
        order: integer(j, 'order'),
        titleEn: str(j, 'titleEn'),
        titleAr: strOrNull(j, 'titleAr'),
        bodyEn: str(j, 'bodyEn'),
        bodyAr: strOrNull(j, 'bodyAr'),
        videoUrl: strOrNull(j, 'videoUrl'),
        attachments: list(j, 'attachments').map(LessonAttachment.fromJson).where((a) => a.url.isNotEmpty).toList(),
      );

  final String id;
  final String moduleId;
  final int order;
  final String titleEn;
  final String? titleAr;

  /// Markdown.
  final String bodyEn;
  final String? bodyAr;
  final String? videoUrl;
  final List<LessonAttachment> attachments;

  String title(AppLocale l) => _pick(l, titleEn, titleAr);
  String body(AppLocale l) => _pick(l, bodyEn, bodyAr);
}

@immutable
class LessonModule {
  const LessonModule({required this.id, required this.order, required this.titleEn, this.titleAr, this.descriptionEn, this.descriptionAr, this.lessons = const []});

  factory LessonModule.fromJson(Json j) => LessonModule(
        id: str(j, 'id'),
        order: integer(j, 'order'),
        titleEn: str(j, 'titleEn'),
        titleAr: strOrNull(j, 'titleAr'),
        descriptionEn: strOrNull(j, 'descriptionEn'),
        descriptionAr: strOrNull(j, 'descriptionAr'),
        lessons: list(j, 'lessons').map(Lesson.fromJson).toList()..sort((a, b) => a.order.compareTo(b.order)),
      );

  final String id;
  final int order;
  final String titleEn;
  final String? titleAr;
  final String? descriptionEn;
  final String? descriptionAr;
  final List<Lesson> lessons;

  String title(AppLocale l) => _pick(l, titleEn, titleAr);
  String? description(AppLocale l) {
    final d = _pick(l, descriptionEn ?? '', descriptionAr);
    return d.trim().isEmpty ? null : d;
  }
}

/// `GET /courses/:idOrSlug/lessons`.
@immutable
class CourseLessons {
  const CourseLessons({required this.courseId, required this.slug, required this.titleEn, this.titleAr, this.modules = const []});

  factory CourseLessons.fromJson(Json j) {
    final c = obj(j, 'course');
    return CourseLessons(
      courseId: str(c, 'id'),
      slug: str(c, 'slug'),
      titleEn: str(c, 'titleEn'),
      titleAr: strOrNull(c, 'titleAr'),
      modules: list(j, 'modules').map(LessonModule.fromJson).toList()..sort((a, b) => a.order.compareTo(b.order)),
    );
  }

  final String courseId;
  final String slug;
  final String titleEn;
  final String? titleAr;
  final List<LessonModule> modules;

  String title(AppLocale l) => _pick(l, titleEn, titleAr);

  /// Every lesson in reading order (module order, then lesson order).
  List<Lesson> get allLessons => [for (final m in modules) ...m.lessons];

  int get lessonCount => allLessons.length;

  Lesson? lesson(String id) => allLessons.where((x) => x.id == id).firstOrNull;
}

enum CourseVideoKind { youtube, vimeo, file }

/// Mirror of the shared TS `parseCourseVideoUrl` (packages/shared/src/course-media.ts).
@immutable
class CourseVideoSource {
  const CourseVideoSource._(this.kind, this.url, {this.id});
  final CourseVideoKind kind;

  /// The URL to open: the watch page for YouTube / Vimeo, the file itself otherwise.
  final String url;
  final String? id;

  static final _storedVideo = RegExp(r'^(https?://[a-z0-9.-]+(:\d{1,5})?)?/uploads/course-videos/[a-f0-9]{32}\.(mp4|mov|webm)$', caseSensitive: false);
  static final _youtubeId = RegExp(r'^[A-Za-z0-9_-]{11}$');
  static const _videoExtensions = {'mp4', 'mov', 'webm'};

  /// Classifies a lesson / intro video URL, or `null` when it isn't one we accept.
  static CourseVideoSource? parse(String? v) {
    if (v == null || v.isEmpty) return null;
    if (_storedVideo.hasMatch(v)) return CourseVideoSource._(CourseVideoKind.file, v);
    final u = Uri.tryParse(v);
    if (u == null || u.scheme != 'https' || u.userInfo.isNotEmpty || u.host.isEmpty) return null;
    final host = u.host.toLowerCase().replaceFirst(RegExp(r'^(www\.|m\.)'), '');
    if (host == 'youtube.com' || host == 'youtube-nocookie.com' || host == 'youtu.be') {
      String? id;
      if (host == 'youtu.be') {
        id = u.pathSegments.isEmpty ? null : u.pathSegments.first;
      } else if (u.path == '/watch') {
        id = u.queryParameters['v'];
      } else {
        id = RegExp(r'^/(embed|shorts|live)/([^/]+)').firstMatch(u.path)?.group(2);
      }
      return id != null && _youtubeId.hasMatch(id) ? CourseVideoSource._(CourseVideoKind.youtube, 'https://www.youtube.com/watch?v=$id', id: id) : null;
    }
    if (host == 'vimeo.com' || host == 'player.vimeo.com') {
      final id = RegExp(r'^/(?:video/)?(\d{5,12})(?:/|$)').firstMatch(u.path)?.group(1);
      return id == null ? null : CourseVideoSource._(CourseVideoKind.vimeo, 'https://vimeo.com/$id', id: id);
    }
    final ext = RegExp(r'\.([a-z0-9]{2,5})$', caseSensitive: false).firstMatch(u.path)?.group(1)?.toLowerCase();
    return ext != null && _videoExtensions.contains(ext) ? CourseVideoSource._(CourseVideoKind.file, v) : null;
  }
}
