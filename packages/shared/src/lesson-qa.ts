import { z } from 'zod';

// ---------- Lesson questions and answers (recorded courses) ----------

/** Longest question a learner may post. */
export const LESSON_QUESTION_MAX = 2000;
/** Longest answer the course author or an admin may post. */
export const LESSON_ANSWER_MAX = 4000;
/** Questions one learner may post per rolling 24 hours, across all lessons. */
export const LESSON_QUESTIONS_PER_DAY = 10;

/** POST /lessons/:lessonId/questions */
export const lessonQuestionInput = z.object({ body: z.string().trim().min(3).max(LESSON_QUESTION_MAX) });
export type LessonQuestionInput = z.infer<typeof lessonQuestionInput>;

/** POST /lesson-questions/:id/answers */
export const lessonAnswerInput = z.object({ body: z.string().trim().min(1).max(LESSON_ANSWER_MAX) });
export type LessonAnswerInput = z.infer<typeof lessonAnswerInput>;

/** PUT /lesson-questions/:id/hidden and PUT /lesson-answers/:id/hidden — the course author or an admin. */
export const lessonQaHiddenInput = z.object({ hidden: z.boolean() });
export type LessonQaHiddenInput = z.infer<typeof lessonQaHiddenInput>;

/** GET /lessons/:lessonId/questions — newest first. */
export const lessonQuestionsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type LessonQuestionsQuery = z.infer<typeof lessonQuestionsQuery>;

// ---------- Teacher analytics per recorded course ----------

/** Learners with a live plan and no lesson activity for this many days are listed as inactive. */
export const INACTIVE_AFTER_DAYS = 14;
