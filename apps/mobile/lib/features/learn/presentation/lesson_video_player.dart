import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/tokens.dart';
import 'lesson_screen.dart' show LessonVideoCard;
import 'lesson_video_tracker.dart';

/// Playback speeds offered in the speed menu.
const lessonVideoSpeeds = [0.75, 1.0, 1.25, 1.5, 2.0];

/// Reports a player state to the tracker: the position while it plays, and `finish()` once it reaches the end.
/// Kept apart from the widget so it can be tested without a platform video player.
void reportLessonVideoProgress(
  VideoPlayerValue value,
  VideoPositionTracker tracker,
) {
  if (!value.isInitialized) return;
  tracker.update(value.position.inSeconds, durationSec: value.duration.inSeconds);
  final atEnd =
      value.duration > Duration.zero &&
      value.position >= value.duration - const Duration(milliseconds: 500);
  if (value.isCompleted || (atEnd && !value.isPlaying)) {
    unawaited(tracker.finish());
  }
}

/// The in-app player for uploaded lesson videos: opens at the saved position, saves progress as it plays,
/// and offers play/pause, scrubbing and playback speed. If the file can't be played here, it falls back to
/// the card that opens the video outside the app.
class LessonVideoPlayer extends StatefulWidget {
  const LessonVideoPlayer({super.key, required this.request});
  final LessonPlayerRequest request;

  @override
  State<LessonVideoPlayer> createState() => _LessonVideoPlayerState();
}

class _LessonVideoPlayerState extends State<LessonVideoPlayer> {
  late final VideoPlayerController _controller;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.request.url),
    )..addListener(_onTick);
    unawaited(_open());
  }

  Future<void> _open() async {
    try {
      await _controller.initialize();
      final start = Duration(seconds: widget.request.startSec);
      if (start > Duration.zero && start < _controller.value.duration) {
        await _controller.seekTo(start);
      }
      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  void _onTick() {
    final value = _controller.value;
    if (value.hasError && !_failed) {
      setState(() => _failed = true);
      return;
    }
    reportLessonVideoProgress(value, widget.request.tracker);
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onTick)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return LessonVideoCard(url: widget.request.url);
    final value = _controller.value;
    if (!value.isInitialized) {
      return const AspectRatio(
        aspectRatio: 16 / 9,
        child: ColoredBox(
          color: Colors.black,
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    return ClipRRect(
      key: const Key('lesson-video-player'),
      borderRadius: BorderRadius.circular(12),
      child: ColoredBox(
        color: Colors.black,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: value.aspectRatio > 0 ? value.aspectRatio : 16 / 9,
              child: GestureDetector(
                onTap: _toggle,
                child: VideoPlayer(_controller),
              ),
            ),
            _Controls(controller: _controller, onToggle: _toggle),
          ],
        ),
      ),
    );
  }

  void _toggle() {
    final value = _controller.value;
    if (value.isPlaying) {
      unawaited(_controller.pause());
    } else {
      // A finished video starts again from the top.
      if (value.position >= value.duration) {
        unawaited(_controller.seekTo(Duration.zero));
      }
      unawaited(_controller.play());
    }
  }
}

class _Controls extends StatelessWidget {
  const _Controls({required this.controller, required this.onToggle});
  final VideoPlayerController controller;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AzzaPalette.of(context);
    return ValueListenableBuilder<VideoPlayerValue>(
      valueListenable: controller,
      builder: (context, value, _) => Directionality(
        // Video timelines run left to right in both languages.
        textDirection: TextDirection.ltr,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 0, 8, 4),
          child: Row(
            children: [
              IconButton(
                key: const Key('lesson-video-toggle'),
                tooltip: value.isPlaying
                    ? l.lessonVideoPause
                    : l.lessonVideoPlay,
                onPressed: onToggle,
                icon: Icon(
                  value.isPlaying
                      ? Icons.pause_rounded
                      : Icons.play_arrow_rounded,
                  color: Colors.white,
                ),
              ),
              Text(
                _clock(value.position),
                style: const TextStyle(
                  color: Colors.white,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: VideoProgressIndicator(
                  controller,
                  allowScrubbing: true,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  colors: VideoProgressColors(
                    playedColor: p.accent,
                    bufferedColor: Colors.white38,
                    backgroundColor: Colors.white12,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                _clock(value.duration),
                style: const TextStyle(
                  color: Colors.white70,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              PopupMenuButton<double>(
                key: const Key('lesson-video-speed'),
                tooltip: l.lessonVideoSpeed,
                initialValue: value.playbackSpeed,
                onSelected: (speed) =>
                    unawaited(controller.setPlaybackSpeed(speed)),
                itemBuilder: (_) => [
                  for (final s in lessonVideoSpeeds)
                    PopupMenuItem(value: s, child: Text('${_speed(s)}×')),
                ],
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 10,
                  ),
                  child: Text(
                    '${_speed(value.playbackSpeed)}×',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _speed(double s) =>
      s == s.roundToDouble() ? s.toStringAsFixed(0) : s.toString();

  static String _clock(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(h > 0 ? 2 : 1, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }
}
