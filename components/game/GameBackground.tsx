"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * Reusable animated 2D game backdrop — drifting gradient orbs, floating bokeh,
 * and a slow parallax grid. Themeable per game for a cohesive "modern 2D game"
 * look. Sits behind content (absolute inset-0, non-interactive). The host root
 * should be `relative` and its own opaque background removed/transparent.
 */

type Theme = "violet" | "emerald" | "teal" | "sunset" | "night";

const THEMES: Record<Theme, { base: string; orbs: string[]; grid: string; light: boolean }> = {
  violet: { base: "radial-gradient(130% 90% at 50% -10%, #2E1065 0%, #1A0B3B 45%, #0B0718 100%)", orbs: ["#8b5cf6", "#d946ef", "#6366f1"], grid: "rgba(255,255,255,0.05)", light: false },
  emerald: { base: "radial-gradient(130% 90% at 50% -10%, #064e3b 0%, #05241d 45%, #04140f 100%)", orbs: ["#10b981", "#34d399", "#22d3ee"], grid: "rgba(255,255,255,0.05)", light: false },
  teal: { base: "radial-gradient(130% 90% at 50% -10%, #0f3d3a 0%, #0a2320 45%, #05100f 100%)", orbs: ["#14b8a6", "#2dd4bf", "#38bdf8"], grid: "rgba(255,255,255,0.05)", light: false },
  sunset: { base: "radial-gradient(130% 90% at 50% -10%, #4c1d95 0%, #831843 55%, #1a0b18 100%)", orbs: ["#fb7185", "#f59e0b", "#c084fc"], grid: "rgba(255,255,255,0.05)", light: false },
  night: { base: "radial-gradient(130% 90% at 50% -10%, #0f172a 0%, #0b1120 50%, #060910 100%)", orbs: ["#6366f1", "#38bdf8", "#a78bfa"], grid: "rgba(255,255,255,0.04)", light: false },
};

// Softer palette rendered on top of a light page background.
const LIGHT_ORBS: Record<string, string[]> = {
  violet: ["#c4b5fd", "#f0abfc", "#a5b4fc"],
  emerald: ["#6ee7b7", "#5eead4", "#7dd3fc"],
};

export default function GameBackground({
  theme = "violet",
  light = false,
  lightAccent = "violet",
}: {
  theme?: Theme;
  light?: boolean;
  lightAccent?: "violet" | "emerald";
}) {
  const t = THEMES[theme];
  const orbColors = light ? LIGHT_ORBS[lightAccent] : t.orbs;

  const bokeh = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        left: `${(i * 37) % 100}%`,
        size: 4 + ((i * 7) % 10),
        delay: (i % 7) * 0.7,
        dur: 9 + (i % 6) * 2,
        color: orbColors[i % orbColors.length],
        drift: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 8),
      })),
    [orbColors]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" style={light ? undefined : { background: t.base }}>
      {/* drifting gradient orbs */}
      {orbColors.map((c, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: light ? 280 : 340,
            height: light ? 280 : 340,
            background: c,
            opacity: light ? 0.35 : 0.28,
            left: `${[8, 62, 34][i % 3]}%`,
            top: `${[2, 30, 58][i % 3]}%`,
          }}
          animate={{ x: [0, 40, -30, 0], y: [0, -30, 25, 0], scale: [1, 1.12, 0.95, 1] }}
          transition={{ duration: 16 + i * 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* parallax grid */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(100% 70% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(100% 70% at 50% 0%, #000 40%, transparent 100%)",
        }}
        animate={{ backgroundPositionY: ["0px", "44px"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* floating bokeh particles */}
      {bokeh.map((b, i) => (
        <motion.span
          key={`b${i}`}
          className="absolute rounded-full"
          style={{ left: b.left, bottom: -20, width: b.size, height: b.size, background: b.color, opacity: light ? 0.5 : 0.6 }}
          animate={{ y: [0, -600], x: [0, b.drift, 0], opacity: [0, light ? 0.5 : 0.6, 0] }}
          transition={{ duration: b.dur, repeat: Infinity, delay: b.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
