'use client';

import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { batchesApi, coursesApi, type BatchSummary } from '@/lib/api';
import type { CourseListParams } from '@/lib/api/courses';
import { qk } from '@/lib/query-keys';

export function useCatalogCourses(params: CourseListParams) {
  const p = { pageSize: 48, ...params };
  // Keep the previous results on screen while a filter change loads.
  return useQuery({ queryKey: qk.courses(p), queryFn: () => coursesApi.list(p), placeholderData: keepPreviousData });
}

/** Public batches (ENROLLING/FULL/RUNNING) grouped per course, sorted by start. */
export function usePublicBatches() {
  const p = { pageSize: 100 };
  const q = useQuery({ queryKey: qk.batches(p), queryFn: () => batchesApi.list(p) });
  const byCourse = useMemo(() => {
    const map = new Map<string, BatchSummary[]>();
    for (const b of q.data?.items ?? []) {
      const list = map.get(b.courseId) ?? [];
      list.push(b);
      map.set(b.courseId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
    return map;
  }, [q.data]);
  return { ...q, byCourse };
}

/** Public "live now" counter (refreshes every 30 s). */
export function useLiveNow() {
  return useQuery({ queryKey: qk.liveNow, queryFn: coursesApi.liveNow, refetchInterval: 30_000, retry: false });
}
