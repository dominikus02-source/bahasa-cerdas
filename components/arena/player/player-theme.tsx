"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** Pembungkus tema Player — LIGHT/DARK adaptive (ARENA 2.0).
 *  .px-theme-adaptive: light mode = permukaan terang iOS-premium;
 *  dark mode = navy premium seperti semula (lihat player-theme.css). */
export function PlayerTheme({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="px-theme px-theme-adaptive min-h-screen">
      {children}
    </motion.div>
  );
}
