import 'package:flutter/foundation.dart';

import '../../../core/domain/enums.dart';
import '../../../core/utils/json.dart';
import '../../subscriptions/domain/subscription_models.dart' show SubscriptionStatus;

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
    this.completed = false,
    this.locked = false,
    this.videoPositionSec = 0,
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
        completed: j['completed'] == true,
        locked: j['locked'] == true,
        videoPositionSec: integer(j, 'videoPositionSec'),
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

  /// Marked done by the signed-in reader (`PUT /lessons/:id/complete`).
  final bool completed;

  /// A recorded course's lesson the reader has no plan for: only its title is served (the free preview lesson isn't).
  final bool locked;

  /// Where the reader stopped watching an uploaded video, in seconds (0 = from the start).
  final int videoPositionSec;

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

/// The first lesson not done yet (`progress.nextLesson`).
@immutable
class NextLesson {
  const NextLesson({required this.id, required this.titleEn, this.titleAr, required this.moduleId, this.moduleTitleEn = '', this.moduleTitleAr});

  factory NextLesson.fromJson(Json j) => NextLesson(
        id: str(j, 'id'),
        titleEn: str(j, 'titleEn'),
        titleAr: strOrNull(j, 'titleAr'),
        moduleId: str(j, 'moduleId'),
        moduleTitleEn: str(j, 'moduleTitleEn'),
        moduleTitleAr: strOrNull(j, 'moduleTitleAr'),
      );

  final String id;
  final String titleEn;
  final String? titleAr;
  final String moduleId;
  final String moduleTitleEn;
  final String? moduleTitleAr;

  String title(AppLocale l) => _pick(l, titleEn, titleAr);
  String moduleTitle(AppLocale l) => _pick(l, moduleTitleEn, moduleTitleAr);
}

/// Lessons done out of the course's total, and where to pick up.
@immutable
class LessonProgress {
  const LessonProgress({this.completed = 0, this.total = 0, this.nextLesson});

  factory LessonProgress.fromJson(Json j) => LessonProgress(
        completed: integer(j, 'completed'),
        total: integer(j, 'total'),
        nextLesson: j['nextLesson'] is Map ? NextLesson.fromJson(obj(j, 'nextLesson')) : null,
      );

  final int completed;
  final int total;
  final NextLesson? nextLesson;

  double get fraction => total <= 0 ? 0 : (completed / total).clamp(0.0, 1.0);
  bool get allDone => total > 0 && completed >= total;
}

/// A recorded course's plan as `GET /me/learning-progress` reports it (`subscription`).
@immutable
class CoursePlanAccess {
  const CoursePlanAccess({required this.status, this.currentPeriodEnd, this.cancelAtPeriodEnd = false, this.hasAccess = false});
  factory CoursePlanAccess.fromJson(Json j) => CoursePlanAccess(
        status: SubscriptionStatus.parse(j['status']),
        currentPeriodEnd: date(j, 'currentPeriodEnd'),
        cancelAtPeriodEnd: boolean(j, 'cancelAtPeriodEnd'),
        hasAccess: boolean(j, 'hasAccess'),
      );
  final SubscriptionStatus status;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final bool hasAccess;
}

/// One row of `GET /me/learning-progress`: a course with an ACTIVE enrollment, or a recorded course with progress
/// (also after its plan ended: `subscription.hasAccess` is then false and the progress is kept).
/// `type` and `subscription` may be missing on an older API; the row then reads as a live course.
@immutable
class CourseProgress {
  const CourseProgress({
    required this.courseId,
    this.slug = '',
    required this.titleEn,
    this.titleAr,
    this.progress = const LessonProgress(),
    this.recorded = false,
    this.subscription,
  });

  factory CourseProgress.fromJson(Json j) => CourseProgress(
        courseId: str(j, 'courseId'),
        slug: str(j, 'slug'),
        titleEn: str(j, 'titleEn'),
        titleAr: strOrNull(j, 'titleAr'),
        progress: LessonProgress.fromJson(j),
        recorded: str(j, 'type') == 'RECORDED',
        subscription: objOrNull(j, 'subscription') == null ? null : CoursePlanAccess.fromJson(obj(j, 'subscription')),
      );

  final String courseId;
  final String slug;
  final String titleEn;
  final String? titleAr;
  final LessonProgress progress;
  final bool recorded;
  final CoursePlanAccess? subscription;

  /// A recorded course whose plan no longer opens its lessons. Without a `subscription` we can't tell, so it isn't lapsed.
  bool get lapsed => recorded && subscription != null && !subscription!.hasAccess;

  String title(AppLocale l) => _pick(l, titleEn, titleAr);
}

/// `GET /courses/:idOrSlug/lessons`.
@immutable
class CourseLessons {
  const CourseLessons({required this.courseId, required this.slug, required this.titleEn, this.titleAr, this.modules = const [], this.progress});

  factory CourseLessons.fromJson(Json j) {
    final c = obj(j, 'course');
    return CourseLessons(
      courseId: str(c, 'id'),
      slug: str(c, 'slug'),
      titleEn: str(c, 'titleEn'),
      titleAr: strOrNull(c, 'titleAr'),
      modules: list(j, 'modules').map(LessonModule.fromJson).toList()..sort((a, b) => a.order.compareTo(b.order)),
      progress: j['progress'] is Map ? LessonProgress.fromJson(obj(j, 'progress')) : null,
    );
  }

  final String courseId;
  final String slug;
  final String titleEn;
  final String? titleAr;
  final List<LessonModule> modules;

  /// As served (the server's view before any local, not-yet-confirmed toggle).
  final LessonProgress? progress;

  String title(AppLocale l) => _pick(l, titleEn, titleAr);

  /// Every lesson in reading order (module order, then lesson order).
  List<Lesson> get allLessons => [for (final m in modules) ...m.lessons];

  int get lessonCount => allLessons.length;

  Lesson? lesson(String id) => allLessons.where((x) => x.id == id).firstOrNull;

  /// Whether [lesson] is done, with local toggles ([overrides], lesson id → done) winning over the server.
  static bool isDone(Lesson lesson, Map<String, bool> overrides) => overrides[lesson.id] ?? lesson.completed;

  /// Progress in reading order with [overrides] applied; the next lesson is the first not done (as the API does).
  LessonProgress progressWith([Map<String, bool> overrides = const {}]) {
    final all = allLessons;
    final next = all.where((x) => !isDone(x, overrides)).firstOrNull;
    final module = next == null ? null : modules.where((m) => m.id == next.moduleId).firstOrNull;
    return LessonProgress(
      completed: all.where((x) => isDone(x, overrides)).length,
      total: all.length,
      nextLesson: next == null
          ? null
          : NextLesson(
              id: next.id,
              titleEn: next.titleEn,
              titleAr: next.titleAr,
              moduleId: next.moduleId,
              moduleTitleEn: module?.titleEn ?? '',
              moduleTitleAr: module?.titleAr,
            ),
    );
  }
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
