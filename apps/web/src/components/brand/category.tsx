'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Camera,
  ChartLine,
  Code,
  Dumbbell,
  FlaskConical,
  Globe,
  GraduationCap,
  HeartPulse,
  Languages,
  Megaphone,
  Music,
  Palette,
  PenTool,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { categoriesApi, type CategoryRef } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

/** Public category list (active only, with published-course counts); cached for the session. */
export function useCategories() {
  return useQuery({ queryKey: qk.categories(), queryFn: () => categoriesApi.list(), staleTime: 10 * 60_000 });
}

/**
 * Localised category name for anything carrying a category slug. Prefers the embedded `categoryRef`;
 * batch / profile payloads only carry the slug, so those resolve through the cached public list.
 */
export function useCategoryLabel() {
  const { pick } = useI18n();
  const list = useCategories();
  return useCallback(
    (c: { category: string; categoryRef?: CategoryRef | null }) => {
      const ref = c.categoryRef ?? list.data?.find((x) => x.slug === c.category);
      return ref ? pick(ref.nameEn, ref.nameAr).text : c.category;
    },
    [list.data, pick],
  );
}

/**
 * A curated set of lucide icons for category chips. Admins type any lucide name; names outside this
 * set render no icon rather than pulling the whole icon library into the bundle.
 */
const ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  brain: Brain,
  briefcase: Briefcase,
  calculator: Calculator,
  camera: Camera,
  'chart-line': ChartLine,
  code: Code,
  dumbbell: Dumbbell,
  'flask-conical': FlaskConical,
  globe: Globe,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  languages: Languages,
  megaphone: Megaphone,
  music: Music,
  palette: Palette,
  'pen-tool': PenTool,
  sprout: Sprout,
};

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = name ? ICONS[name] : undefined;
  return Icon ? <Icon className={className ?? 'size-4'} aria-hidden /> : null;
}
