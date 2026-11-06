'use client';

import { useEffect } from 'react';
import { MotionConfig, motion, useMotionValue, useSpring } from 'motion/react';
import { useI18n } from '@/lib/i18n/provider';
import { CatalogMoment } from './catalog-moment';
import { Certificate } from './certificate';
import { Finale } from './finale';
import { Hero } from './hero';
import { useCalm, useFinePointer } from './hooks';
import { House } from './house';
import { Recordings } from './recordings';
import { Room } from './room';
import { Starting } from './starting';
import { Teach } from './teach';
import { Teachers } from './teachers';
import { Week } from './week';
import { Words } from './words';
import './landing.css';

/**
 * The landing (docs/LANDING.md): one learner's week as a programme, the catalog in the middle.
 * Moment map: 1 Hero · 2 House · 3 Week · 4 Words (#how) · 5 Room · 6 Recordings · 7 Catalog (#catalog)
 * · 8 Starting (#starting) · 9 Teachers · 10 Certificate · 11 Teach · 12 FAQ, pricing (#pricing), final CTA.
 */
export function LandingPage() {
  const { t } = useI18n();
  return (
    <MotionConfig reducedMotion="user">
      {/* overflow-x: clip keeps bleeding motion from scrolling sideways without breaking sticky. */}
      <div className="-mt-4 overflow-x-clip">
        <Hero />
        <House />
        <Week />
        <Words />
        <Room />
        <Recordings />
        <CatalogMoment />
        <Starting />
        <Teachers />
        <Certificate />
        <Teach />
        <Finale />
        <span className="sr-only">{t.meta.description}</span>
      </div>
      <SeatCursor />
    </MotionConfig>
  );
}

/** A small lit seat that trails the mouse on this page only (the real cursor stays). */
function SeatCursor() {
  const fine = useFinePointer();
  const calm = useCalm();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 260, damping: 26, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 260, damping: 26, mass: 0.5 });
  const on = fine && !calm;
  useEffect(() => {
    if (!on) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX + 14);
      y.set(e.clientY + 14);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [on, x, y]);
  if (!on) return null;
  return <motion.span aria-hidden className="pointer-events-none fixed left-0 top-0 z-40 size-2.5 rounded-[3px] bg-green" style={{ x: sx, y: sy }} />;
}
