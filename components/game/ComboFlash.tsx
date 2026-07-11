"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Full-screen celebratory flash when the combo hits a milestone (3, 5, 8, ...).
 * Purely decorative overlay; auto-dismisses. Pass the live combo count.
 */
const MILESTONES = [3, 5, 8, 12, 16, 20, 25, 30];

export default function ComboFlash({ combo }: { combo: number }) {
  const [show, setShow] = useState<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (combo > lastRef.current && MILESTONES.includes(combo)) {
      setShow(combo);
      const t = setTimeout(() => setShow(null), 950);
      lastRef.current = combo;
      return () => clearTimeout(t);
    }
    if (combo === 0) lastRef.current = 0;
  }, [combo]);

  return (
    <AnimatePresence>
      {show !== null && (
        <motion.div
          key={show}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center overflow-hidden"
        >
          {/* radial glow pulse */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0.85 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute w-80 h-80 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(251,146,60,0.55), rgba(251,146,60,0) 70%)" }}
          />

          {/* radial speed lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0, opacity: 0.7 }}
              animate={{ scaleX: 1, opacity: 0 }}
              transition={{ duration: 0.5, delay: i * 0.015, ease: "easeOut" }}
              className="absolute h-[3px] w-[120vw] origin-center"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)", transform: `rotate(${i * 36}deg)` }}
            />
          ))}

          {/* text */}
          <motion.div
            initial={{ scale: 0.3, rotate: -10, y: 10 }}
            animate={{ scale: [0.3, 1.3, 1], rotate: [-10, 3, 0], y: 0 }}
            transition={{ duration: 0.55, times: [0, 0.6, 1] }}
            className="relative text-center select-none"
          >
            <div className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-orange-500 drop-shadow-[0_2px_12px_rgba(251,146,60,0.6)]">
              COMBO
            </div>
            <div className="text-7xl font-black text-white leading-none -mt-1 drop-shadow-[0_2px_14px_rgba(255,255,255,0.35)]">
              ×{show}
              <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.5, repeat: 1 }} className="inline-block ml-1">🔥</motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
