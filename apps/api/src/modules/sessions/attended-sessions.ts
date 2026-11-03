import type { AttendanceMark } from '@azza/shared';

/**
 * Pure attendance rule shared by certificates and reports (same as the roster): a student attended a session
 * when they joined the LiveKit room at least once, unless a teacher/admin correction (AttendanceMark) says
 * otherwise — `ABSENT` removes it, any other mark adds it.
 */
export function attendedSessionIds(joinedSessionIds: Iterable<string>, marks: { sessionId: string; mark: AttendanceMark }[]): Set<string> {
  const attended = new Set(joinedSessionIds);
  for (const m of marks) {
    if (m.mark === 'ABSENT') attended.delete(m.sessionId);
    else attended.add(m.sessionId);
  }
  return attended;
}

/** Groups join-log rows and marks by student, then applies `attendedSessionIds` per student. */
export function attendanceByUser(
  joins: { userId: string; sessionId: string }[],
  marks: { userId: string; sessionId: string; mark: AttendanceMark }[],
): Map<string, Set<string>> {
  const joined = new Map<string, string[]>();
  for (const j of joins) joined.set(j.userId, [...(joined.get(j.userId) ?? []), j.sessionId]);
  const marked = new Map<string, { sessionId: string; mark: AttendanceMark }[]>();
  for (const m of marks) marked.set(m.userId, [...(marked.get(m.userId) ?? []), m]);
  const out = new Map<string, Set<string>>();
  for (const userId of new Set([...joined.keys(), ...marked.keys()])) {
    out.set(userId, attendedSessionIds(joined.get(userId) ?? [], marked.get(userId) ?? []));
  }
  return out;
}
