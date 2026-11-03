/**
 * Pure rule for `GET /me/waitlist`: a student's place in a batch's queue is their 1-based rank among the
 * WAITLISTED enrollments by `createdAt` (ties broken by id, so the order is stable) — the same order the
 * promotion job uses when a seat frees up. `null` when the student is not in the queue.
 */
export function waitlistPosition(
  waiting: { id: string; createdAt: Date }[],
  enrollmentId: string,
): { position: number; total: number } | null {
  const queue = [...waiting].sort((a, b) => +a.createdAt - +b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const index = queue.findIndex((e) => e.id === enrollmentId);
  return index === -1 ? null : { position: index + 1, total: queue.length };
}
