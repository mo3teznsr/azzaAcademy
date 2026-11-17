# Learning progress: streaks, weekly goal, badges

Calm, personal motivation for learners. Nothing here is public: there is no leaderboard and no learner sees another's progress.

Code: `apps/api/src/modules/progress` (pure rules in `progress.policy.ts`), shared contract in `packages/shared/src/progress.ts`.

## Learning day

A calendar day **in the learner's timezone** (`user.timezone`, Asia/Dubai when unknown) with at least one of:

- a lesson completed (`LessonProgress.completedAt`),
- 5 minutes or more of lesson video watched that day, across lessons (`LessonWatchTime`),
- a quiz submitted (`QuizAttempt.submittedAt`),
- a live class attended (`Attendance.joinedAt`, or a teacher's PRESENT / LATE / LEFT_EARLY mark at the session's start).

Known approximation: `LessonWatchTime` is stored per UTC day, so video minutes count on their UTC date. For the UAE
(UTC+4) this only moves video watched between midnight and 04:00 to the previous day.

## Streak

- The current streak counts learning days in a row up to today. Today never breaks it: it stays "pending" until midnight.
- **Freeze:** one missed day per week (weeks start on Monday) is bridged automatically. The bridged day does not add to the count.
- Two missed days in a row, or a second missed day in the same week, end the streak.
- The best streak is the longest run ever, under the same rule (history looks back 400 days).

## Weekly goal

- The learner picks learning days or lessons per week (the apps offer 2, 3 or 5; the API accepts 1–7 days or 1–20 lessons).
- Progress resets every Monday.
- **Reminder:** at most one per week, in-app and push, in the learner's language. It is sent on Friday from 17:00 local
  time (or on Saturday if Friday was missed) only when the goal is not met and can still be met this week. Claimed in
  `LifecycleMessage` under `goal-reminder:<monday>`. Turning reminders off in the goal settings stops it.

## Badges

| Badge | Earned when |
| --- | --- |
| FIRST_LESSON | first lesson completed |
| FIRST_LIVE_CLASS | first live class attended |
| LESSONS_10 / LESSONS_50 | 10 / 50 lessons completed |
| PERFECT_QUIZ | a quiz submitted in time with full marks |
| STREAK_7 / STREAK_30 | best streak reaches 7 / 30 days |
| FIRST_CERTIFICATE | first certificate issued |

Awarded once (`LearnerBadge`, unique per learner and badge) when the learner opens their progress and by the hourly
`learning-progress` job for learners active in the last two days, each with an in-app and push notice (`BADGE_EARNED`).

## API

- `GET /me/progress` — streak, this week, goal and the latest three badges (`LearnerProgress`).
- `PUT /me/progress/goal` — `{ unit: 'DAYS' | 'LESSONS', target, reminders? }`; returns the summary.
- `DELETE /me/progress/goal` — removes the goal.
- `GET /me/badges` — every badge in display order with `earnedAt` (null while locked).
