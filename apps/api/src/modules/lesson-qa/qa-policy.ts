import { LESSON_QUESTIONS_PER_DAY, type Role } from '@azza/shared';

// Pure rules for lesson Q&A. Reading the lesson (LessonService's rule) is checked first; these decide the rest.

export type QaActor = { id: string; role: Role };
export type QaCourse = { createdById: string | null };

/** The course author or an admin: answers, hides posts, and their answers carry the "Instructor" badge. */
export function isInstructor(actor: QaActor, course: QaCourse): boolean {
  return actor.role === 'ADMIN' || (course.createdById !== null && course.createdById === actor.id);
}

/** Learners ask; the people who answer don't post questions under their own course. */
export function canAsk(actor: QaActor, course: QaCourse): boolean {
  return !isInstructor(actor, course);
}

/** The asker may delete their question while nobody has answered it (hidden answers count: the thread has started). */
export function canDeleteQuestion(actor: QaActor, question: { authorId: string; answerCount: number }): boolean {
  return question.authorId === actor.id && question.answerCount === 0;
}

/** Only the asker marks the answer that helped. */
export function canAccept(actor: QaActor, question: { authorId: string }): boolean {
  return question.authorId === actor.id;
}

/** Hidden posts stay visible to instructors (to unhide them) and to whoever wrote them. */
export function canSee(viewer: QaActor, course: QaCourse, post: { authorId: string; hiddenAt: Date | null }): boolean {
  return !post.hiddenAt || isInstructor(viewer, course) || post.authorId === viewer.id;
}

const DAY_MS = 86_400_000;

/** Start of the rolling window the daily question limit counts from. */
export function limitWindowStart(now: Date): Date {
  return new Date(now.getTime() - DAY_MS);
}

/** Questions the learner may still post in the rolling 24 hours (never below 0). */
export function questionsLeft(postedInWindow: number, max = LESSON_QUESTIONS_PER_DAY): number {
  return Math.max(0, max - postedInWindow);
}

/** A short preview of user text for notification bodies. */
export function preview(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
