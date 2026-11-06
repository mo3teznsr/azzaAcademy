'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { coursesApi, type Course, type SavedCourse } from '@/lib/api';
import { useAuth } from '@/lib/auth/use-auth';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

/** The signed-in user's saved courses; courses carry no "saved" flag, so cards look it up here. */
export function useSavedCourses() {
  const { isSignedIn } = useAuth();
  const q = useQuery({ queryKey: qk.saved, queryFn: coursesApi.saved, enabled: isSignedIn });
  const ids = useMemo(() => new Set((q.data ?? []).map((c) => c.id)), [q.data]);
  return { ...q, ids, enabled: isSignedIn };
}

/** Optimistic save / unsave; rolls back and toasts on failure. */
export function useToggleSaved() {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: ({ course, save }: { course: Course; save: boolean }) => (save ? coursesApi.save(course.id) : coursesApi.unsave(course.id)),
    onMutate: async ({ course, save }) => {
      await qc.cancelQueries({ queryKey: qk.saved });
      const prev = qc.getQueryData<SavedCourse[]>(qk.saved);
      qc.setQueryData<SavedCourse[]>(qk.saved, (list = []) =>
        save ? [{ ...course, savedAt: new Date().toISOString() }, ...list.filter((c) => c.id !== course.id)] : list.filter((c) => c.id !== course.id),
      );
      return { prev };
    },
    onSuccess: (_, { save }) => toast.success(save ? t.saved.added : t.saved.removed),
    onError: (e: Error, _, ctx) => {
      qc.setQueryData(qk.saved, ctx?.prev);
      toast.error(e.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.saved }),
  });
}

/** Heart toggle; renders nothing for signed-out visitors. `labelled` shows "Save / Saved" next to the heart. */
export function SaveToggle({ course, className, labelled }: { course: Course; className?: string; labelled?: boolean }) {
  const { t, fill, pick } = useI18n();
  const saved = useSavedCourses();
  const toggle = useToggleSaved();
  if (!saved.enabled) return null;
  const on = saved.ids.has(course.id);
  const title = pick(course.titleEn, course.titleAr).text;
  return (
    <Button
      type="button"
      variant="outline"
      size={labelled ? 'default' : 'icon'}
      aria-pressed={on}
      aria-label={labelled ? undefined : fill(on ? t.course.unsaveAria : t.course.saveAria, { title })}
      disabled={toggle.isPending || saved.isPending}
      onClick={() => toggle.mutate({ course, save: !on })}
      className={cn(on && 'text-onair-fg', className)}
    >
      <Heart className={cn(on && 'fill-current')} aria-hidden />
      {labelled && (on ? t.course.saved : t.course.save)}
    </Button>
  );
}
