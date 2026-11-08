'use client';

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { batchesApi, learningApi, meApi, type Assignment, type Enrollment, type Material } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export function useEnrollments() {
  return useQuery({ queryKey: qk.enrollments, queryFn: meApi.enrollments });
}

export const isActive = (e: Enrollment) => e.status === 'ACTIVE';

export function useActiveEnrollments() {
  const q = useEnrollments();
  const active = useMemo(() => (q.data ?? []).filter(isActive), [q.data]);
  return { ...q, active };
}

export function useMySchedule(from: Date, to: Date) {
  const f = from.toISOString();
  const t = to.toISOString();
  return useQuery({
    queryKey: qk.schedule(f, t),
    queryFn: () => meApi.schedule(f, t),
    select: (items) => [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  });
}

/** Lesson progress for every course I'm actively enrolled in ("Continue learning"). */
export function useLearningProgress() {
  return useQuery({ queryKey: qk.learningProgress, queryFn: learningApi.myLearningProgress });
}

export function useRecordings() {
  return useQuery({ queryKey: qk.recordings, queryFn: meApi.recordings });
}

/** Assignments across my active batches (per-batch endpoint from the contract). */
export function useMyAssignments() {
  const enr = useActiveEnrollments();
  const results = useQueries({
    queries: enr.active.map((e) => ({ queryKey: qk.assignments(e.batchId), queryFn: () => batchesApi.assignments(e.batchId) })),
  });
  const isPending = enr.isPending || results.some((r) => r.isPending);
  const error = enr.error ?? results.find((r) => r.error)?.error ?? null;
  const data = useMemo(() => {
    const list: Array<Assignment & { enrollment: Enrollment }> = [];
    results.forEach((r, i) => {
      const e = enr.active[i];
      if (e && r.data) for (const a of r.data) list.push({ ...a, enrollment: e });
    });
    return list.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, [results, enr.active]);
  return {
    data,
    isPending,
    isError: !!error,
    error,
    refetch: async () => {
      await Promise.all([enr.refetch(), ...results.map((r) => r.refetch())]);
    },
  };
}

export function useMyMaterials() {
  const enr = useActiveEnrollments();
  const results = useQueries({
    queries: enr.active.map((e) => ({ queryKey: qk.materials(e.batchId), queryFn: () => batchesApi.materials(e.batchId) })),
  });
  const isPending = enr.isPending || results.some((r) => r.isPending);
  const error = enr.error ?? results.find((r) => r.error)?.error ?? null;
  const data = useMemo(() => {
    const list: Array<Material & { enrollment: Enrollment }> = [];
    results.forEach((r, i) => {
      const e = enr.active[i];
      if (e && r.data) for (const m of r.data) list.push({ ...m, enrollment: e });
    });
    return list;
  }, [results, enr.active]);
  return { data, isPending, isError: !!error, error, refetch: async () => void (await Promise.all(results.map((r) => r.refetch()))) };
}
