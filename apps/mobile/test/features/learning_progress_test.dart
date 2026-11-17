import 'package:azza/features/me/domain/me_models.dart';
import 'package:azza/features/progress/data/progress_repository.dart';
import 'package:azza/features/progress/domain/progress_models.dart';
import 'package:azza/features/progress/presentation/progress_card.dart';
import 'package:azza/features/progress/presentation/progress_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/harness.dart';
import '../helpers/progress_fakes.dart';

void main() {
  group('progress models', () {
    test('parse the summary', () {
      final p = LearnerProgress.fromJson({
        'today': '2026-11-20',
        'timezone': 'Asia/Dubai',
        'streak': {'current': 4, 'best': 9, 'todayDone': true, 'freezeAvailable': false, 'frozenDays': ['2026-11-18']},
        'week': {'start': '2026-11-16', 'days': ['2026-11-16'], 'lessons': 2},
        'goal': {'unit': 'LESSONS', 'target': 5, 'reminders': false, 'progress': 2, 'met': false},
        'latestBadges': [
          {'id': 'FIRST_LESSON', 'earnedAt': '2026-11-16T08:00:00.000Z'},
          {'id': 'SOMETHING_NEW', 'earnedAt': '2026-11-16T08:00:00.000Z'},
        ],
        'badgeCount': {'earned': 1, 'total': 8},
      });
      expect(p.streak.current, 4);
      expect(p.streak.frozenDays, ['2026-11-18']);
      expect(p.week.dates.first, '2026-11-16');
      expect(p.week.dates.last, '2026-11-22');
      expect(p.goal!.unit, GoalUnit.lessons);
      expect(p.goal!.reminders, isFalse);
      expect(p.latestBadges.map((b) => b.id), ['FIRST_LESSON']); // unknown ids are skipped
      expect(LearnerProgress.fromJson({'today': '2026-11-20', 'week': {'start': '2026-11-16'}, 'goal': null}).goal, isNull);
    });

    test('badge and goal notices open My progress', () {
      expect(notificationRoute('BADGE_EARNED', const {'badge': 'FIRST_LESSON'}), '/me/progress');
      expect(notificationRoute('LEARNING_GOAL_REMINDER', const {}), '/me/progress');
    });
  });

  testWidgets('home card shows the streak and invites a weekly goal', (tester) async {
    final repo = FakeProgressRepository();
    await pumpScreen(tester, const Scaffold(body: SingleChildScrollView(child: ProgressCard())), overrides: [progressRepositoryProvider.overrideWithValue(repo)]);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('home-progress')), findsOneWidget);
    expect(find.text('4 days'), findsOneWidget);
    expect(find.textContaining('Best: 9 days'), findsOneWidget);
    expect(find.text('Pick a weekly goal to keep a steady pace.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('progress-set-goal')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('goal-target-5')));
    await tester.tap(find.text('Lessons'));
    await tester.pump();
    await tester.tap(find.byKey(const Key('goal-save')));
    await tester.pumpAndSettle();
    expect(repo.saved.single, {'unit': 'LESSONS', 'target': 5, 'reminders': true});
    expect(find.textContaining('3 of 5 lessons'), findsOneWidget);
  });

  testWidgets('My progress lists earned and locked badges', (tester) async {
    final repo = FakeProgressRepository(
      progress: sampleProgress(goal: const LearningGoal(unit: GoalUnit.days, target: 3, progress: 3, met: true)),
      badgeList: [
        EarnedBadge(id: 'FIRST_LESSON', earnedAt: DateTime(2026, 11, 16)),
        for (final id in badgeIds.skip(1)) EarnedBadge(id: id),
      ],
    );
    await pumpScreen(tester, const ProgressScreen(), overrides: [progressRepositoryProvider.overrideWithValue(repo)]);
    await tester.pumpAndSettle();
    expect(find.text('Goal reached this week. Nicely done.'), findsOneWidget);
    expect(find.textContaining('3 of 3 learning days'), findsOneWidget);
    await tester.scrollUntilVisible(find.byKey(const Key('badge-STREAK_30')), 200);
    expect(find.text('First lesson'), findsOneWidget);
    expect(find.text('Not yet'), findsNWidgets(7));
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -600));
    await tester.pumpAndSettle();
    expect(find.text('Badges are personal. Nobody else sees them.'), findsOneWidget);
  });
}
