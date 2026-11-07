import { randomUUID } from 'node:crypto';
import type { QuizQuestionInput, QuizQuestionType } from '@azza/shared';

export interface StoredOption {
  id: string;
  textEn: string;
  textAr: string | null;
  correct: boolean;
}

export interface StoredQuestion {
  id: string;
  type: QuizQuestionType;
  promptEn: string;
  promptAr: string | null;
  points: number;
  options: StoredOption[];
}

export interface QuestionResult {
  questionId: string;
  /** Full marks on this question. */
  correct: boolean;
  earned: number;
  points: number;
}

export type Answers = Record<string, string[]>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Grading rules.
 * - SINGLE and TRUE_FALSE: full points when exactly the one correct option is selected, else 0.
 * - MULTIPLE (partial credit): earned = points × max(0, (right − wrong) ÷ correctOptions), where `right` is the number of
 *   correct options selected and `wrong` the number of incorrect ones. Each wrong pick cancels a right one, so ticking
 *   every box never pays; the floor is 0. A question counts as `correct` only with full points.
 * Unknown option ids are ignored, duplicates count once. Earned points are rounded to 2 decimals.
 */
export function gradeQuestion(q: StoredQuestion, selected: readonly string[] = []): QuestionResult {
  const known = new Set(q.options.map((o) => o.id));
  const picks = [...new Set(selected)].filter((id) => known.has(id));
  const correctIds = new Set(q.options.filter((o) => o.correct).map((o) => o.id));
  let earned = 0;
  if (q.type === 'MULTIPLE') {
    const right = picks.filter((id) => correctIds.has(id)).length;
    const wrong = picks.length - right;
    earned = correctIds.size ? round2(q.points * Math.max(0, (right - wrong) / correctIds.size)) : 0;
  } else {
    earned = picks.length === 1 && correctIds.has(picks[0]!) ? q.points : 0;
  }
  return { questionId: q.id, correct: earned === q.points, earned, points: q.points };
}

export function gradeQuiz(questions: readonly StoredQuestion[], answers: Answers) {
  const results = questions.map((q) => gradeQuestion(q, answers[q.id]));
  return {
    results,
    score: round2(results.reduce((s, r) => s + r.earned, 0)),
    maxScore: questions.reduce((s, q) => s + q.points, 0),
  };
}

export const percentOf = (score: number | null, maxScore: number) => (score === null || maxScore <= 0 ? 0 : Math.round((score / maxScore) * 100));

const shortId = () => randomUUID().replace(/-/g, '').slice(0, 10);

/** Input → stored questions: keeps valid unique ids (so edits keep their identity) and assigns the rest. */
export function normalizeQuestions(input: readonly QuizQuestionInput[]): StoredQuestion[] {
  const seen = new Set<string>();
  const fresh = (id: string | undefined, used: Set<string>) => {
    const next = id && !used.has(id) ? id : shortId();
    used.add(next);
    return next;
  };
  return input.map((q) => {
    const optionIds = new Set<string>();
    return {
      id: fresh(q.id, seen),
      type: q.type,
      promptEn: q.promptEn,
      promptAr: q.promptAr || null,
      points: q.points,
      options: q.options.map((o) => ({ id: fresh(o.id, optionIds), textEn: o.textEn, textAr: o.textAr || null, correct: o.correct })),
    };
  });
}

/** What a student may see of a question: never the `correct` flags. */
export function publicQuestion(q: StoredQuestion) {
  return { ...q, options: q.options.map(({ correct: _c, ...o }) => o) };
}

export const answerKey = (q: StoredQuestion) => q.options.filter((o) => o.correct).map((o) => o.id);
