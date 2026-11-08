import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/lesson_progress_repository.dart';
import '../domain/lesson_models.dart';
import 'lesson_screen.dart' show LessonVideoCard;

/// Saves where the reader is in a lesson video so the next visit picks up there:
/// every [interval] while it plays, on [dispose], and a 0 once at the end (so a finished video restarts from the top).
/// A save that fails is dropped: the next tick tries again, and watching is never interrupted.
class VideoPositionTracker {
  VideoPositionTracker({required this.save, this.interval = const Duration(seconds: 10), int startSec = 0}) : _position = startSec;

  final Future<void> Function(int sec) save;
  final Duration interval;
  int _position;
  int? _lastSaved;
  bool _ended = false;
  Timer? _timer;

  int get positionSec => _position;
  bool get ended => _ended;

  void start() => _timer ??= Timer.periodic(interval, (_) => unawaited(flush()));

  /// The player reports where it is (call it as often as it likes).
  void update(int sec) {
    if (!_ended) _position = sec < 0 ? 0 : sec;
  }

  Future<void> flush() async {
    if (_ended || _position == _lastSaved) return;
    final sec = _position;
    _lastSaved = sec;
    try {
      await save(sec);
    } catch (_) {
      _lastSaved = null; // retried on the next tick
    }
  }

  /// The video played to the end: remember "from the start", once.
  Future<void> finish() async {
    if (_ended) return;
    _ended = true;
    _timer?.cancel();
    try {
      await save(0);
    } catch (_) {}
  }

  Future<void> dispose() async {
    _timer?.cancel();
    _timer = null;
    await flush();
  }
}

/// What an in-app lesson player is given: where to start, and the tracker it reports to.
/// The player seeks to [startSec], calls `tracker.update(seconds)` as it plays and `tracker.finish()` at the end.
class LessonPlayerRequest {
  const LessonPlayerRequest({required this.url, required this.startSec, required this.tracker});
  final String url;
  final int startSec;
  final VideoPositionTracker tracker;
}

typedef LessonPlayerBuilder = Widget Function(BuildContext context, LessonPlayerRequest request);

/// The in-app video player for uploaded and direct video files, or null where the app has none.
/// Without one, a lesson's video opens in the system player, which can't report a position, so nothing is saved.
final lessonPlayerBuilderProvider = Provider<LessonPlayerBuilder?>((ref) => null);

/// A lesson's video: resumable in the in-app player when there is one and the video is a file the app can play
/// (YouTube and Vimeo embeds can't report a position); otherwise the card that opens it outside.
class LessonVideo extends ConsumerWidget {
  const LessonVideo({super.key, required this.lessonId, required this.url});
  final String lessonId;
  final String url;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final builder = ref.watch(lessonPlayerBuilderProvider);
    final source = CourseVideoSource.parse(url);
    if (builder == null || source == null || source.kind != CourseVideoKind.file) return LessonVideoCard(url: url);
    final start = ref.watch(lessonVideoPositionProvider(lessonId));
    // Wait for the saved position so the player opens at it; a failed lookup just starts from 0.
    if (start.isLoading) return const SizedBox(key: Key('lesson-video-loading'), height: 200, child: Center(child: CircularProgressIndicator()));
    return ResumableLessonVideo(
      key: Key('resumable-$lessonId'),
      lessonId: lessonId,
      url: ref.read(appConfigProvider).resolveMediaUrl(source.url) ?? source.url,
      startSec: start.value ?? 0,
      builder: builder,
    );
  }
}

final lessonVideoPositionProvider = FutureProvider.autoDispose.family<int, String>(
  (ref, lessonId) => ref.watch(lessonProgressRepositoryProvider).videoPosition(lessonId),
);

class ResumableLessonVideo extends ConsumerStatefulWidget {
  const ResumableLessonVideo({super.key, required this.lessonId, required this.url, required this.startSec, required this.builder});
  final String lessonId;
  final String url;
  final int startSec;
  final LessonPlayerBuilder builder;

  @override
  ConsumerState<ResumableLessonVideo> createState() => _ResumableLessonVideoState();
}

class _ResumableLessonVideoState extends ConsumerState<ResumableLessonVideo> {
  late final VideoPositionTracker _tracker;
  late final LessonProgressRepository _repo;

  @override
  void initState() {
    super.initState();
    _repo = ref.read(lessonProgressRepositoryProvider);
    _tracker = VideoPositionTracker(save: (sec) => _repo.saveVideoPosition(widget.lessonId, sec), startSec: widget.startSec)..start();
  }

  @override
  void dispose() {
    unawaited(_tracker.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      widget.builder(context, LessonPlayerRequest(url: widget.url, startSec: widget.startSec, tracker: _tracker));
}
