/**
 * The free preview lesson of a recorded course: the teacher's choice while it is still one of the course's lessons, otherwise
 * the first lesson in curriculum order (module order, then lesson order). Null when the course has no lessons.
 */
export function effectivePreviewLessonId(
  previewLessonId: string | null,
  modules: ReadonlyArray<{ id: string; order: number }>,
  lessons: ReadonlyArray<{ id: string; moduleId: string; order: number }>,
): string | null {
  if (previewLessonId && lessons.some((l) => l.id === previewLessonId)) return previewLessonId;
  const moduleRank = new Map([...modules].map((m, i) => [m.id, { order: m.order, i }]));
  const rank = (id: string) => moduleRank.get(id) ?? { order: Number.MAX_SAFE_INTEGER, i: Number.MAX_SAFE_INTEGER };
  const first = [...lessons]
    .filter((l) => moduleRank.has(l.moduleId))
    .sort((a, b) => rank(a.moduleId).order - rank(b.moduleId).order || rank(a.moduleId).i - rank(b.moduleId).i || a.order - b.order)[0];
  return first?.id ?? null;
}
