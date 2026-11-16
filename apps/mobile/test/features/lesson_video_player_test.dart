import 'package:azza/features/learn/presentation/lesson_video_player.dart';
import 'package:azza/features/learn/presentation/lesson_video_tracker.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:video_player/video_player.dart';

VideoPlayerValue playing(
  int sec, {
  int duration = 600,
  bool isPlaying = true,
  bool isCompleted = false,
}) => VideoPlayerValue(
  duration: Duration(seconds: duration),
  position: Duration(seconds: sec),
  isInitialized: true,
  isPlaying: isPlaying,
  isCompleted: isCompleted,
);

void main() {
  group('lesson video progress', () {
    late List<int> saved;
    late VideoPositionTracker tracker;

    setUp(() {
      saved = [];
      tracker = VideoPositionTracker(
        save: (sec) async => saved.add(sec),
        interval: const Duration(hours: 1),
      );
    });

    test('reports the position and the length while the video plays', () {
      reportLessonVideoProgress(playing(42), tracker);
      expect(tracker.positionSec, 42);
      expect(tracker.durationSec, 600);
      expect(tracker.ended, isFalse);
    });

    test('ignores a player that is not ready yet', () {
      reportLessonVideoProgress(
        VideoPlayerValue(
          duration: Duration.zero,
          position: const Duration(seconds: 9),
        ),
        tracker,
      );
      expect(tracker.positionSec, 0);
    });

    test('a finished video saves "from the start", once', () async {
      reportLessonVideoProgress(
        playing(600, isPlaying: false, isCompleted: true),
        tracker,
      );
      reportLessonVideoProgress(
        playing(600, isPlaying: false, isCompleted: true),
        tracker,
      );
      await Future<void>.delayed(Duration.zero);
      expect(tracker.ended, isTrue);
      expect(saved, [0]);
    });

    test(
      'stopping at the very end counts as finished; pausing midway does not',
      () async {
        reportLessonVideoProgress(playing(300, isPlaying: false), tracker);
        expect(tracker.ended, isFalse);
        reportLessonVideoProgress(playing(600, isPlaying: false), tracker);
        await Future<void>.delayed(Duration.zero);
        expect(tracker.ended, isTrue);
      },
    );
  });

  test('speeds offered include normal speed', () {
    expect(lessonVideoSpeeds, contains(1.0));
  });
}
