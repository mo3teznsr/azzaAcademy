import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/lesson_media_repository.dart';
import '../data/lesson_progress_repository.dart';
import '../domain/download_policy.dart';
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

  int? _durationSec;

  int get positionSec => _position;
  bool get ended => _ended;

  /// The video's length in seconds, once the player has reported it.
  int? get durationSec => _durationSec;

  void start() => _timer ??= Timer.periodic(interval, (_) => unawaited(flush()));

  /// The player reports where it is, and the video's length when it knows it (call it as often as it likes).
  void update(int sec, {int? durationSec}) {
    if (durationSec != null && durationSec > 0) _durationSec = durationSec;
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
/// [url] is an https file, an HLS playlist (`.m3u8`) or a `file://` saved copy. With [onDataSaver], the player shows a
/// data-saver toggle (the URL then changes to the lowest rendition and the player is rebuilt at the same spot).
class LessonPlayerRequest {
  const LessonPlayerRequest({required this.url, required this.startSec, required this.tracker, this.dataSaver = false, this.onDataSaver});
  final String url;
  final int startSec;
  final VideoPositionTracker tracker;
  final bool dataSaver;
  final ValueChanged<bool>? onDataSaver;
}

typedef LessonPlayerBuilder = Widget Function(BuildContext context, LessonPlayerRequest request);

/// The in-app video player for uploaded and direct video files, or null where the app has none.
/// The app sets it to `LessonVideoPlayer` in `main.dart`; tests leave it null or pass a fake.
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
    final playback = ref.watch(lessonPlaybackProvider(lessonId));
    // Wait for the saved position (and the stream) so the player opens at it; a failed lookup just plays the file from 0.
    if (playback.isLoading) return const SizedBox(key: Key('lesson-video-loading'), height: 200, child: Center(child: CircularProgressIndicator()));
    final dataSaver = ref.watch(dataSaverProvider);
    final pb = playback.value;
    final fileUrl = ref.read(appConfigProvider).resolveMediaUrl(source.url) ?? source.url;
    return ResumableLessonVideo(
      key: Key('resumable-$lessonId'),
      lessonId: lessonId,
      url: pickLessonVideoUrl(fileUrl: fileUrl, playback: pb, dataSaver: dataSaver),
      startSec: pb?.positionSec ?? 0,
      builder: builder,
      // Data saver only changes something when there is a low rendition to switch to.
      dataSaver: dataSaver,
      onDataSaver: pb != null && pb.ready && pb.lowMp4Url != null ? (on) => ref.read(dataSaverProvider.notifier).set(on) : null,
    );
  }
}

final lessonVideoPositionProvider = FutureProvider.autoDispose.family<int, String>(
  (ref, lessonId) => ref.watch(lessonProgressRepositoryProvider).videoPosition(lessonId),
);

class ResumableLessonVideo extends ConsumerStatefulWidget {
  const ResumableLessonVideo({
    super.key,
    required this.lessonId,
    required this.url,
    required this.startSec,
    required this.builder,
    this.dataSaver = false,
    this.onDataSaver,
    this.save,
  });
  final String lessonId;
  final String url;
  final int startSec;
  final LessonPlayerBuilder builder;
  final bool dataSaver;
  final ValueChanged<bool>? onDataSaver;

  /// Where positions go; defaults to the server (`PUT /lessons/:id/video-position`). Offline copies save locally.
  final Future<void> Function(int sec, {int? durationSec, bool ended})? save;

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
    _tracker = VideoPositionTracker(
      save: (sec) => widget.save != null
          ? widget.save!(sec, durationSec: _tracker.durationSec, ended: _tracker.ended)
          : _repo.saveVideoPosition(widget.lessonId, sec, durationSec: _tracker.durationSec, ended: _tracker.ended),
      startSec: widget.startSec,
    )..start();
  }

  @override
  void dispose() {
    unawaited(_tracker.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => KeyedSubtree(
        // A new URL (data saver on or off) is a new player, opened where the learner was.
        key: ValueKey(widget.url),
        child: widget.builder(
          context,
          LessonPlayerRequest(
            url: widget.url,
            startSec: _switched ? _tracker.positionSec : widget.startSec,
            tracker: _tracker,
            dataSaver: widget.dataSaver,
            onDataSaver: widget.onDataSaver,
          ),
        ),
      );

  bool _switched = false;

  @override
  void didUpdateWidget(ResumableLessonVideo old) {
    super.didUpdateWidget(old);
    if (old.url != widget.url) _switched = true;
  }
}
