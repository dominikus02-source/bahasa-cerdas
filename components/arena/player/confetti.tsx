"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#ffd24a", "#2b4bff", "#0f7bff", "#34e0b8", "#ffffff", "#f5a623", "#ff6b9d"];

/** Confetti ringan (tanpa dependency ekstra) — potongan melayang + jatuh. */
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 2.2 + Math.random() * 1.4;
        const size = 6 + Math.random() * 8;
        const rotate = Math.random() * 720 - 360;
        const drift = (Math.random() - 0.5) * 120;
        return { i, left, delay, duration, size, rotate, drift, color: COLORS[i % COLORS.length] };
      }),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="px-confetti-piece"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.5, backgroundColor: p.color }}
          initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "120vh", x: p.drift, opacity: [1, 1, 0.8], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
