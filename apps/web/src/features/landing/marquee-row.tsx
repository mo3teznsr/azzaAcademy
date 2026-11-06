'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity, wrap } from 'motion/react';

/**
 * One looping row (adapted from the cinematic-website starter): scroll velocity speeds it up and
 * scroll direction flips it. Renders `children` twice; the copy is aria-hidden and inert.
 * The caller decides reduced motion (`paused`), so the row then sits still.
 */
export function MarqueeRow({
  children,
  base = -3,
  paused,
  className = '',
  list,
}: {
  children: (copy: boolean) => ReactNode;
  base?: number;
  paused: boolean;
  className?: string;
  /** Render each copy as a <ul> labelled `list` (children are then <li>). */
  list?: string;
}) {
  const Copy = list ? 'ul' : 'div';
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [-1500, 0, 1500], [-4, 0, 4], { clamp: false });
  const dirRef = useRef(1);
  const tx = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (paused) return;
    const f = factor.get();
    if (f < -0.05) dirRef.current = -1;
    else if (f > 0.05) dirRef.current = 1;
    let move = dirRef.current * base * (delta / 1000);
    move += dirRef.current * move * Math.abs(f);
    x.set(x.get() + move);
  });

  return (
    // The loop math runs left-to-right; RTL callers pass a mirrored `base`.
    <div className="flex overflow-hidden whitespace-nowrap" dir="ltr">
      <motion.div className={`flex shrink-0 ${className}`} style={{ x: tx }}>
        <Copy className="flex shrink-0 items-center" aria-label={list}>
          {children(false)}
        </Copy>
        <Copy className="flex shrink-0 items-center" aria-hidden inert>
          {children(true)}
        </Copy>
      </motion.div>
    </div>
  );
}
