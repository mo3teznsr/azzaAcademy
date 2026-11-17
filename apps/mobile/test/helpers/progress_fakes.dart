import 'package:azza/features/progress/data/progress_repository.dart';
import 'package:azza/features/progress/domain/progress_models.dart';

/// Monday 16 Nov 2026 week; Sam learned Mon, Tue and Thu, Wed was covered by the freeze.
LearnerProgress sampleProgress({LearningGoal? goal, List<EarnedBadge> latest = const []}) => LearnerProgress(
      today: '2026-11-20',
      streak: const Streak(current: 4, best: 9, todayDone: false, freezeAvailable: false, frozenDays: ['2026-11-18']),
      week: const WeekProgress(start: '2026-11-16', days: ['2026-11-16', '2026-11-17', '2026-11-19'], lessons: 3),
      goal: goal,
      latestBadges: latest,
      badgesEarned: latest.length,
    );

class FakeProgressRepository implements ProgressRepository {
  FakeProgressRepository({LearnerProgress? progress, this.badgeList = const []}) : progress = progress ?? sampleProgress();
  LearnerProgress progress;
  List<EarnedBadge> badgeList;
  final List<Map<String, Object?>> saved = [];
  int cleared = 0;

  @override
  Future<LearnerProgress> summary() async => progress;

  @override
  Future<List<EarnedBadge>> badges() async => badgeList;

  @override
  Future<LearnerProgress> setGoal({required GoalUnit unit, required int target, required bool reminders}) async {
    saved.add({'unit': unit.wire, 'target': target, 'reminders': reminders});
    progress = sampleProgress(goal: LearningGoal(unit: unit, target: target, reminders: reminders, progress: 3));
    return progress;
  }

  @override
  Future<LearnerProgress> clearGoal() async {
    cleared++;
    progress = sampleProgress();
    return progress;
  }
}
