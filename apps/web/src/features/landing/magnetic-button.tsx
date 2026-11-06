'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalm } from './hooks';

const MotionLink = motion.create(Link);

/** Magnetic pill link (adapted from the cinematic-website starter): drifts toward the mouse; still for touch and reduced motion. */
export function MagneticLink({ href, children, className, strength = 0.3 }: { href: string; children: ReactNode; className?: string; strength?: number }) {
  const calm = useCalm();
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  const onMove = (e: React.PointerEvent) => {
    if (calm || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <MotionLink
      ref={ref}
      href={href}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      className={cn(
        'group relative inline-flex min-h-16 items-center gap-3 rounded-full bg-green px-8 text-lg font-bold text-ink-deep no-underline transition-[background-color,scale] duration-300 hover:bg-mint active:scale-[0.97] md:min-h-20 md:px-10 md:text-xl',
        className,
      )}
    >
      <span>{children}</span>
      <span aria-hidden className="relative grid size-7 place-items-center overflow-hidden">
        <ArrowUpRight className="size-6 transition-transform duration-500 ease-(--ease-out-expo) group-hover:translate-x-6 group-hover:-translate-y-6 rtl:-scale-x-100 rtl:group-hover:-translate-x-6" />
        <ArrowUpRight className="absolute size-6 -translate-x-6 translate-y-6 transition-transform duration-500 ease-(--ease-out-expo) group-hover:translate-x-0 group-hover:translate-y-0 rtl:translate-x-6 rtl:-scale-x-100" />
      </span>
    </MotionLink>
  );
}
