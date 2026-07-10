"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#a78bfa", "#f0abfc", "#fbbf24", "#34d399", "#60a5fa", "#f87171", "#fde047"];

/**
 * Particle burst. Increment `trigger` to fire a new burst from (x%, y%).
 * Purely decorative, non-interactive.
 */
export default function Burst({
  trigger,
  x = 50,
  y = 50,
  count = 16,
}: {
  trigger: number;
  x?: number;
  y?: number;
  count?: number;
}) {
  const parts = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 55 + Math.random() * 95;
      return {
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist - 20, // slight upward bias, then it drifts
        c: COLORS[i % COLORS.length],
        s: 5 + Math.random() * 5,
        delay: Math.random() * 0.06,
        dur: 0.65 + Math.random() * 0.4,
        rot: (Math.random() - 0.5) * 240,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!trigger) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {parts.map((p, i) => (
        <motion.span
          key={`${trigger}-${i}`}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy + 40, opacity: 0, scale: 0.4, rotate: p.rot }}
          transition={{ duration: p.dur, ease: "easeOut", delay: p.delay }}
          className="absolute rounded-[2px]"
          style={{ left: `${x}%`, top: `${y}%`, width: p.s, height: p.s, background: p.c }}
        />
      ))}
    </div>
  );
}
