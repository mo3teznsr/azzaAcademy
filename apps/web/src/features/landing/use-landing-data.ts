'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { coursesApi, type BatchSummary, type PersonRef } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { usePublicBatches } from '../catalog/use-catalog';

/** Open batches, soonest first. */
export function useOpenBatches() {
  const batches = usePublicBatches();
  const open = useMemo(
    () => (batches.data?.items ?? []).filter((b) => b.status === 'ENROLLING').sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
    [batches.data],
  );
  return { ...batches, open };
}

/**
 * The batch the story follows: the soonest open batch with a weekly schedule and a seat grid that
 * reads well (4–24 seats). Every number on the landing comes from it; null hides the numbers.
 */
export function useSpotlightBatch(): BatchSummary | null {
  const { open } = useOpenBatches();
  return useMemo(() => {
    const scheduled = open.filter((b) => b.schedule && b.schedule.weekdays.length > 0);
    return scheduled.find((b) => b.capacity >= 4 && b.capacity <= 24) ?? scheduled[0] ?? null;
  }, [open]);
}

/** Largest room among open batches (for "rooms of up to N"). */
export function useLargestRoom(): number | null {
  const { open } = useOpenBatches();
  return open.length ? Math.max(...open.map((b) => b.capacity)) : null;
}

export interface LandingTeacher extends PersonRef {
  headline: string | null;
  languages: BatchSummary['language'][];
  courses: Array<{ titleEn: string; titleAr: string | null }>;
}

/** Teachers of the public batches, enriched with their public profile when it loads. */
export function useLandingTeachers() {
  const batches = usePublicBatches();
  const base = useMemo(() => {
    const map = new Map<string, LandingTeacher>();
    for (const b of batches.data?.items ?? []) {
      const t = map.get(b.teacher.id) ?? { ...b.teacher, headline: null, languages: [], courses: [] };
      if (!t.languages.includes(b.language)) t.languages.push(b.language);
      if (!t.courses.some((c) => c.titleEn === b.course.titleEn)) t.courses.push({ titleEn: b.course.titleEn, titleAr: b.course.titleAr });
      map.set(b.teacher.id, t);
    }
    return [...map.values()].slice(0, 8);
  }, [batches.data]);

  const profiles = useQueries({
    queries: base.map((t) => ({ queryKey: qk.teacher(t.id), queryFn: () => coursesApi.teacher(t.id), retry: false, staleTime: 5 * 60_000 })),
  });

  const teachers = base.map((t, i) => {
    const p = profiles[i]?.data;
    if (!p) return t;
    return { ...t, image: p.image ?? t.image, headline: p.headline, languages: p.languages.length ? p.languages : t.languages };
  });
  return { teachers, isPending: batches.isPending, isError: batches.isError };
}
