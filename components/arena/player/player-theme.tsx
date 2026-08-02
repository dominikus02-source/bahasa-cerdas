"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** Pembungkus tema Player (royal blue / gold / dark navy). */
export function PlayerTheme({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="px-theme min-h-screen">
      {children}
    </motion.div>
  );
}
