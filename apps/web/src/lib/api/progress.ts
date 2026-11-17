import type { BadgeId, BadgeView, LearnerProgress, LearningGoalUnit, UpdateLearningGoalInput } from '@azza/shared';
import { http } from './client';

export type { BadgeId, BadgeView, LearnerProgress, LearningGoalUnit, UpdateLearningGoalInput };

/** Streak, weekly goal and personal badges (docs/PROGRESS.md). */
export const progressApi = {
  summary: () => http.get<LearnerProgress>('/api/v1/me/progress'),
  badges: () => http.get<{ items: BadgeView[] }>('/api/v1/me/badges'),
  setGoal: (input: UpdateLearningGoalInput) => http.put<LearnerProgress>('/api/v1/me/progress/goal', input),
  clearGoal: () => http.del<LearnerProgress>('/api/v1/me/progress/goal'),
};
