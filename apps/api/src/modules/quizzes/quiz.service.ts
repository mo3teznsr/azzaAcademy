import type { QuizInput, QuizSubmissionInput, Role, UpdateQuizInput } from '@azza/shared';
import { BusinessRuleError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { BatchAccessPolicy } from '../batches/batch-access';
import type { Notifier } from '../notifications/notification.types';
import { answerKey, gradeQuiz, normalizeQuestions, percentOf, publicQuestion, type StoredQuestion } from './quiz-grader';
import type { AttemptRecord, QuizRecord, QuizRepository } from './quiz.repository';

type Viewer = { id: string; role: Role };

/** Network and clock slack allowed after a time limit or due date before a submission is refused. */
export const SUBMIT_GRACE_MS = 30_000;

export type StudentQuizStatus = 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'MISSED';

const totalPoints = (qs: StoredQuestion[]) => qs.reduce((s, q) => s + q.points, 0);

/**
 * Auto-graded quizzes on a batch.
 * - The batch teacher and admins author, publish and read results; students with an ACTIVE enrollment take PUBLISHED quizzes.
 * - Correct answers (and per-question correctness, which would give them away) are only sent to a student once they may
 *   see them: after the due date, or once all their attempts are used.
 * - The time limit is enforced on the server from the attempt's `startedAt`.
 */
export class QuizService {
  constructor(
    private readonly repo: QuizRepository,
    private readonly access: BatchAccessPolicy,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  // ───────── staff ─────────

  async list(batchId: string, viewer: Viewer) {
    const role = await this.access.require(batchId, viewer, ['admin', 'teacher', 'student']);
    if (role !== 'student') {
      const quizzes = await this.repo.listByBatch(batchId, false);
      const attempts = await Promise.all(quizzes.map((q) => this.repo.attempts(q.id)));
      return {
        items: quizzes.map((q, i) => {
          const submitted = attempts[i]!.filter((a) => a.submittedAt);
          return { ...this.summary(q), attemptCount: submitted.length, studentsAttempted: new Set(submitted.map((a) => a.userId)).size };
        }),
      };
    }
    const quizzes = await this.repo.listByBatch(batchId, true);
    const mine = await this.repo.attemptsOf(viewer.id, quizzes.map((q) => q.id));
    return { items: quizzes.map((q) => ({ ...this.summary(q), mine: this.progress(q, mine.filter((a) => a.quizId === q.id)) })) };
  }

  async create(batchId: string, input: QuizInput, viewer: Viewer) {
    await this.access.require(batchId, viewer, ['admin', 'teacher']);
    await this.assertModule(batchId, input.moduleId);
    const { dueAt, questions, ...data } = input;
    return this.repo.create(batchId, { ...data, dueAt: dueAt ? new Date(dueAt) : null, questions: normalizeQuestions(questions) });
  }

  async update(batchId: string, quizId: string, input: UpdateQuizInput, viewer: Viewer) {
    const quiz = await this.staffQuiz(batchId, quizId, viewer);
    if (input.moduleId !== undefined) await this.assertModule(batchId, input.moduleId);
    if (input.questions && (await this.repo.attempts(quiz.id)).length > 0) {
      throw new BusinessRuleError('Students have already taken this quiz, so its questions are locked', 'QUIZ_HAS_ATTEMPTS');
    }
    const { dueAt, questions, ...data } = input;
    return this.repo.update(quiz.id, {
      ...data,
      ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
      ...(questions && { questions: normalizeQuestions(questions) }),
    });
  }

  async remove(batchId: string, quizId: string, viewer: Viewer) {
    const quiz = await this.staffQuiz(batchId, quizId, viewer);
    await this.repo.delete(quiz.id);
    return { ok: true };
  }

  async publish(batchId: string, quizId: string, viewer: Viewer) {
    const quiz = await this.staffQuiz(batchId, quizId, viewer);
    if (quiz.status === 'PUBLISHED') throw new BusinessRuleError('This quiz is already published', 'ALREADY_PUBLISHED');
    if (quiz.questions.length === 0) throw new BusinessRuleError('Add at least one question before publishing', 'QUIZ_EMPTY');
    const published = await this.repo.update(quiz.id, { status: 'PUBLISHED', publishedAt: this.clock.now() });
    const [batch, students] = await Promise.all([this.repo.batch(batchId), this.repo.activeStudents(batchId)]);
    if (students.length) {
      await this.notifier.notify(
        students.map((s) => s.id),
        {
          type: 'QUIZ_PUBLISHED',
          title: `New quiz · ${quiz.title}`,
          body: [batch ? `${batch.course.titleEn} ${batch.code}` : null, quiz.dueAt ? `due ${quiz.dueAt.toISOString().slice(0, 10)}` : null].filter(Boolean).join(' · '),
          data: { quizId: quiz.id, batchId },
        },
        { channels: ['in-app', 'realtime', 'push'] },
      );
    }
    return published;
  }

  /** Back to DRAFT while nobody has started it. */
  async unpublish(batchId: string, quizId: string, viewer: Viewer) {
    const quiz = await this.staffQuiz(batchId, quizId, viewer);
    if ((await this.repo.attempts(quiz.id)).length > 0) {
      throw new BusinessRuleError('Students have already taken this quiz', 'QUIZ_HAS_ATTEMPTS');
    }
    return this.repo.update(quiz.id, { status: 'DRAFT', publishedAt: null });
  }

  async results(quizId: string, viewer: Viewer) {
    const quiz = await this.quiz(quizId);
    await this.access.require(quiz.batchId, viewer, ['admin', 'teacher']);
    const [students, attempts] = await Promise.all([this.repo.activeStudents(quiz.batchId), this.repo.attempts(quiz.id)]);
    const submitted = attempts.filter((a) => a.submittedAt);
    const best = new Map<string, AttemptRecord>();
    for (const a of submitted) {
      const b = best.get(a.userId);
      if (!b || (a.score ?? 0) > (b.score ?? 0)) best.set(a.userId, a);
    }
    const rows = students.map((user) => {
      const mine = submitted.filter((a) => a.userId === user.id);
      const top = best.get(user.id);
      return {
        user,
        attempts: mine.length,
        bestScore: top?.score ?? null,
        bestPercent: top ? percentOf(top.score, top.maxScore) : null,
        lastSubmittedAt: mine.at(-1)?.submittedAt ?? null,
      };
    });
    // Correctness rates use each student's best attempt (one data point per student).
    const bests = [...best.values()];
    const questions = quiz.questions.map((q) => {
      const answered = bests.map((a) => a.results.find((r) => r.questionId === q.id)).filter((r) => r !== undefined);
      const correct = answered.filter((r) => r.correct).length;
      return {
        questionId: q.id,
        type: q.type,
        promptEn: q.promptEn,
        promptAr: q.promptAr,
        points: q.points,
        answered: answered.length,
        correct,
        rate: answered.length ? Math.round((correct / answered.length) * 100) / 100 : null,
      };
    });
    const percents = rows.flatMap((r) => (r.bestPercent === null ? [] : [r.bestPercent]));
    return {
      quiz: this.summary(quiz),
      summary: {
        students: students.length,
        submitted: percents.length,
        averagePercent: percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null,
      },
      students: rows,
      questions,
    };
  }

  // ───────── everyone in the batch ─────────

  /** Staff get the full quiz (with answers); students the published quiz without answers, plus their own progress. */
  async get(quizId: string, viewer: Viewer) {
    const quiz = await this.quiz(quizId);
    const role = await this.access.require(quiz.batchId, viewer, ['admin', 'teacher', 'student']);
    if (role !== 'student') {
      const attempts = await this.repo.attempts(quiz.id);
      return { ...quiz, totalPoints: totalPoints(quiz.questions), attemptCount: attempts.filter((a) => a.submittedAt).length, hasAttempts: attempts.length > 0 };
    }
    if (quiz.status !== 'PUBLISHED') throw new NotFoundError('Quiz', quizId);
    const attempts = await this.closeExpired(quiz, await this.repo.attempts(quiz.id, viewer.id));
    return this.studentView(quiz, attempts);
  }

  // ───────── students ─────────

  /** Opens an attempt (or returns the open one). The clock for a timed quiz starts here. */
  async start(quizId: string, viewer: Viewer) {
    const quiz = await this.studentQuiz(quizId, viewer);
    const attempts = await this.closeExpired(quiz, await this.repo.attempts(quiz.id, viewer.id));
    if (!attempts.some((a) => !a.submittedAt)) await this.openAttempt(quiz, attempts, viewer.id);
    return this.studentView(quiz, await this.repo.attempts(quiz.id, viewer.id));
  }

  /** Grades the open attempt. Untimed quizzes may be submitted without calling `start` first. */
  async submit(quizId: string, input: QuizSubmissionInput, viewer: Viewer) {
    const quiz = await this.studentQuiz(quizId, viewer);
    const now = this.clock.now();
    let attempts = await this.repo.attempts(quiz.id, viewer.id);
    let open = attempts.find((a) => !a.submittedAt);
    if (!open) {
      if (quiz.timeLimitMin) throw new BusinessRuleError('Start the quiz first', 'ATTEMPT_NOT_STARTED');
      open = await this.openAttempt(quiz, attempts, viewer.id);
    }
    const deadline = this.deadline(quiz, open);
    if (deadline && now.getTime() > deadline.getTime() + SUBMIT_GRACE_MS) {
      await this.expire(quiz, open, now);
      throw new BusinessRuleError('Time is up for this attempt', 'QUIZ_TIME_UP', { attemptId: open.id, deadline: deadline.toISOString() });
    }
    const { results, score, maxScore } = gradeQuiz(quiz.questions, input.answers);
    const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, [...new Set(input.answers[q.id] ?? [])]]));
    const attempt = await this.repo.finishAttempt(open.id, { submittedAt: now, answers, results, score, maxScore, timedOut: false });
    attempts = await this.repo.attempts(quiz.id, viewer.id);
    const view = this.studentView(quiz, attempts);
    return { ...view, result: view.attempts.find((a) => a.id === attempt.id)! };
  }

  /** A student's published quizzes across their ACTIVE batches, with status and best score. */
  async mine(viewer: Viewer) {
    const quizzes = await this.repo.publishedForStudent(viewer.id);
    const attempts = await this.repo.attemptsOf(viewer.id, quizzes.map((q) => q.id));
    return {
      items: quizzes.map(({ batch, ...q }) => ({
        ...this.summary(q),
        batch: { id: batch.id, code: batch.code, course: batch.course },
        mine: this.progress(q, attempts.filter((a) => a.quizId === q.id)),
      })),
    };
  }

  // ───────── helpers ─────────

  private summary(q: QuizRecord) {
    const { questions, ...rest } = q;
    return { ...rest, questionCount: questions.length, totalPoints: totalPoints(questions) };
  }

  private deadline(quiz: QuizRecord, attempt: AttemptRecord): Date | null {
    const limit = quiz.timeLimitMin ? new Date(attempt.startedAt.getTime() + quiz.timeLimitMin * 60_000) : null;
    if (limit && quiz.dueAt) return limit < quiz.dueAt ? limit : quiz.dueAt;
    return limit ?? quiz.dueAt;
  }

  /** Answers may be shown once the due date has passed or every attempt is spent (open attempts don't count). */
  private reveals(quiz: QuizRecord, attempts: AttemptRecord[]) {
    const now = this.clock.now();
    return (!!quiz.dueAt && now > quiz.dueAt) || attempts.filter((a) => a.submittedAt).length >= quiz.maxAttempts;
  }

  private progress(quiz: QuizRecord, attempts: AttemptRecord[]) {
    const now = this.clock.now();
    const submitted = attempts.filter((a) => a.submittedAt);
    const open = attempts.find((a) => !a.submittedAt && !this.isExpired(quiz, a, now));
    const best = submitted.reduce<AttemptRecord | null>((b, a) => (!b || (a.score ?? 0) > (b.score ?? 0) ? a : b), null);
    const closed = !!quiz.dueAt && now > quiz.dueAt;
    // Every attempt counts against the limit, the open one included.
    const attemptsLeft = Math.max(0, quiz.maxAttempts - attempts.length);
    const status: StudentQuizStatus = open ? 'IN_PROGRESS' : submitted.length ? 'SUBMITTED' : closed ? 'MISSED' : 'OPEN';
    return {
      status,
      attemptsUsed: submitted.length,
      attemptsLeft,
      canStart: !closed && (!!open || attemptsLeft > 0),
      bestScore: best?.score ?? null,
      bestPercent: best ? percentOf(best.score, best.maxScore) : null,
      maxScore: totalPoints(quiz.questions),
    };
  }

  private studentView(quiz: QuizRecord, attempts: AttemptRecord[]) {
    const now = this.clock.now();
    const reveal = this.reveals(quiz, attempts);
    const open = attempts.find((a) => !a.submittedAt && !this.isExpired(quiz, a, now));
    const { questions, ...rest } = quiz;
    return {
      quiz: { ...rest, questions: questions.map(publicQuestion), questionCount: questions.length, totalPoints: totalPoints(questions) },
      progress: this.progress(quiz, attempts),
      reveal,
      openAttempt: open ? { id: open.id, number: open.number, startedAt: open.startedAt, deadline: this.deadline(quiz, open) } : null,
      attempts: attempts
        .filter((a) => a.submittedAt)
        .map((a) => ({
          id: a.id,
          number: a.number,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          score: a.score,
          maxScore: a.maxScore,
          percent: percentOf(a.score, a.maxScore),
          timedOut: a.timedOut,
          // Per-question correctness would give the answers away (true/false especially), so it waits for `reveal`.
          ...(reveal && {
            questions: quiz.questions.map((q) => {
              const r = a.results.find((x) => x.questionId === q.id);
              return { questionId: q.id, selected: a.answers[q.id] ?? [], correct: r?.correct ?? false, earned: r?.earned ?? 0, points: q.points, correctOptionIds: answerKey(q) };
            }),
          }),
        })),
      ...(reveal && { answerKey: Object.fromEntries(quiz.questions.map((q) => [q.id, answerKey(q)])) }),
    };
  }

  private isExpired(quiz: QuizRecord, a: AttemptRecord, now: Date) {
    const d = this.deadline(quiz, a);
    return !!d && now.getTime() > d.getTime() + SUBMIT_GRACE_MS;
  }

  /** Open attempts whose time ran out are closed with 0 (they count as used). */
  private async closeExpired(quiz: QuizRecord, attempts: AttemptRecord[]) {
    const now = this.clock.now();
    const stale = attempts.filter((a) => !a.submittedAt && this.isExpired(quiz, a, now));
    if (!stale.length) return attempts;
    for (const a of stale) await this.expire(quiz, a, now);
    return this.repo.attempts(quiz.id, attempts[0]!.userId);
  }

  private expire(quiz: QuizRecord, a: AttemptRecord, now: Date) {
    const results = quiz.questions.map((q) => ({ questionId: q.id, correct: false, earned: 0, points: q.points }));
    return this.repo.finishAttempt(a.id, { submittedAt: now, answers: a.answers, results, score: 0, maxScore: totalPoints(quiz.questions), timedOut: true });
  }

  private async openAttempt(quiz: QuizRecord, attempts: AttemptRecord[], userId: string) {
    const now = this.clock.now();
    if (quiz.dueAt && now > quiz.dueAt) throw new BusinessRuleError('This quiz is closed', 'QUIZ_CLOSED');
    if (attempts.length >= quiz.maxAttempts) throw new BusinessRuleError('No attempts left', 'NO_ATTEMPTS_LEFT', { maxAttempts: quiz.maxAttempts });
    return this.repo.createAttempt({ quizId: quiz.id, userId, number: attempts.length + 1, startedAt: now });
  }

  private async quiz(id: string) {
    const quiz = await this.repo.find(id);
    if (!quiz) throw new NotFoundError('Quiz', id);
    return quiz;
  }

  private async staffQuiz(batchId: string, quizId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, ['admin', 'teacher']);
    const quiz = await this.quiz(quizId);
    if (quiz.batchId !== batchId) throw new NotFoundError('Quiz', quizId);
    return quiz;
  }

  private async studentQuiz(quizId: string, viewer: Viewer) {
    const quiz = await this.quiz(quizId);
    await this.access.require(quiz.batchId, viewer, ['student']);
    if (quiz.status !== 'PUBLISHED') throw new NotFoundError('Quiz', quizId);
    return quiz;
  }

  private async assertModule(batchId: string, moduleId: string | null | undefined) {
    if (!moduleId) return;
    const batch = await this.repo.batch(batchId);
    if (!batch || !(await this.repo.moduleInCourse(moduleId, batch.courseId))) {
      throw new BusinessRuleError('That module is not part of this batch’s course', 'MODULE_NOT_IN_COURSE');
    }
  }
}
