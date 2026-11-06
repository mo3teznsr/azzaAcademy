'use client';

import { Suspense, useRef } from 'react';
import { useInView } from 'motion/react';
import { LoadingGrid } from '@/components/brand/states';
import { useI18n } from '@/lib/i18n/provider';
import { Catalog, FeaturedRail } from '../catalog/catalog-page';
import { Kicker } from './seat';
import { Wrap } from './wrap';

/** 7 · The catalog (the working product): featured rail above, then filters and cards that rise in with a stagger. */
export function CatalogMoment() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  return (
    <Wrap className="flex flex-col gap-16 py-[clamp(4rem,8vw,7rem)]">
      <Kicker className="text-muted-foreground">{t.landing.catalogKicker}</Kicker>
      <FeaturedRail />
      <div ref={ref} className="landing-stagger" data-state={inView ? 'in' : 'out'}>
        {/* The catalog reads its filters from the URL, so it renders below a Suspense boundary. */}
        <Suspense fallback={<LoadingGrid count={6} height={380} />}>
          <Catalog />
        </Suspense>
      </div>
    </Wrap>
  );
}
