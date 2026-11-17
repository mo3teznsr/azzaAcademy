/// Streak, weekly goal and personal badges (`GET /api/v1/me/progress`, docs/PROGRESS.md).
library;

enum GoalUnit {
  days('DAYS'),
  lessons('LESSONS');

  const GoalUnit(this.wire);
  final String wire;

  static GoalUnit parse(Object? v) => v == 'LESSONS' ? GoalUnit.lessons : GoalUnit.days;
}

/// The targets offered (per week).
const goalTargets = [2, 3, 5];

/// Badge ids in display order (`BADGE_IDS` in @azza/shared).
const badgeIds = ['FIRST_LESSON', 'FIRST_LIVE_CLASS', 'LESSONS_10', 'PERFECT_QUIZ', 'STREAK_7', 'FIRST_CERTIFICATE', 'LESSONS_50', 'STREAK_30'];

class Streak {
  const Streak({this.current = 0, this.best = 0, this.todayDone = false, this.freezeAvailable = true, this.frozenDays = const []});
  final int current;
  final int best;
  final bool todayDone;
  final bool freezeAvailable;
  final List<String> frozenDays;

  factory Streak.fromJson(Map<String, dynamic> j) => Streak(
        current: (j['current'] as num?)?.toInt() ?? 0,
        best: (j['best'] as num?)?.toInt() ?? 0,
        todayDone: j['todayDone'] == true,
        freezeAvailable: j['freezeAvailable'] != false,
        frozenDays: [for (final d in (j['frozenDays'] as List? ?? const [])) '$d'],
      );
}

class WeekProgress {
  const WeekProgress({required this.start, this.days = const [], this.lessons = 0});
  /// Monday (YYYY-MM-DD).
  final String start;
  final List<String> days;
  final int lessons;

  factory WeekProgress.fromJson(Map<String, dynamic> j) => WeekProgress(
        start: '${j['start'] ?? ''}',
        days: [for (final d in (j['days'] as List? ?? const [])) '$d'],
        lessons: (j['lessons'] as num?)?.toInt() ?? 0,
      );

  /// Monday to Sunday (YYYY-MM-DD).
  List<String> get dates {
    final p = start.split('-').map(int.parse).toList();
    return [for (var i = 0; i < 7; i++) isoDay(DateTime.utc(p[0], p[1], p[2] + i))];
  }
}

String isoDay(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// A YYYY-MM-DD day as a local DateTime at noon (for formatting the weekday and date).
DateTime dayAsDate(String day) {
  final p = day.split('-').map(int.parse).toList();
  return DateTime(p[0], p[1], p[2], 12);
}

class LearningGoal {
  const LearningGoal({required this.unit, required this.target, this.reminders = true, this.progress = 0, this.met = false});
  final GoalUnit unit;
  final int target;
  final bool reminders;
  final int progress;
  final bool met;

  factory LearningGoal.fromJson(Map<String, dynamic> j) => LearningGoal(
        unit: GoalUnit.parse(j['unit']),
        target: (j['target'] as num?)?.toInt() ?? 3,
        reminders: j['reminders'] != false,
        progress: (j['progress'] as num?)?.toInt() ?? 0,
        met: j['met'] == true,
      );
}

class EarnedBadge {
  const EarnedBadge({required this.id, this.earnedAt});
  final String id;
  final DateTime? earnedAt;
  bool get earned => earnedAt != null;

  factory EarnedBadge.fromJson(Map<String, dynamic> j) =>
      EarnedBadge(id: '${j['id']}', earnedAt: j['earnedAt'] == null ? null : DateTime.tryParse('${j['earnedAt']}')?.toLocal());
}

class LearnerProgress {
  const LearnerProgress({
    required this.today,
    this.streak = const Streak(),
    required this.week,
    this.goal,
    this.latestBadges = const [],
    this.badgesEarned = 0,
    this.badgesTotal = 8,
  });
  final String today;
  final Streak streak;
  final WeekProgress week;
  final LearningGoal? goal;
  final List<EarnedBadge> latestBadges;
  final int badgesEarned;
  final int badgesTotal;

  factory LearnerProgress.fromJson(Map<String, dynamic> j) {
    final count = (j['badgeCount'] as Map?)?.cast<String, dynamic>() ?? const {};
    return LearnerProgress(
      today: '${j['today'] ?? ''}',
      streak: Streak.fromJson((j['streak'] as Map?)?.cast<String, dynamic>() ?? const {}),
      week: WeekProgress.fromJson((j['week'] as Map?)?.cast<String, dynamic>() ?? const {}),
      goal: j['goal'] is Map ? LearningGoal.fromJson((j['goal'] as Map).cast<String, dynamic>()) : null,
      latestBadges: [
        for (final b in (j['latestBadges'] as List? ?? const []))
          if (b is Map && badgeIds.contains(b['id'])) EarnedBadge.fromJson(b.cast<String, dynamic>()),
      ],
      badgesEarned: (count['earned'] as num?)?.toInt() ?? 0,
      badgesTotal: (count['total'] as num?)?.toInt() ?? badgeIds.length,
    );
  }
}
