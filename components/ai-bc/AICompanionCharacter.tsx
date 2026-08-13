"use client";

import Image from "next/image";
import { gambarKarakter } from "@/lib/arena-junior/karakter";

/**
 * AICompanionCharacter — karakter resmi AI BC (Zelby).
 *
 * Sumber kebenaran aset: lib/arena-junior/karakter.ts (public/junior/karakter/).
 * idle  → zelby_reading.webp
 * thinking → zelby_thinking.webp
 *
 * Tidak boleh ada komponen karakter AI lain — semua entry point AI BC
 * memakai komponen ini.
 */

export type CompanionState = "idle" | "thinking";
export type CompanionSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<CompanionSize, string> = {
  sm: "w-10 h-10",
  md: "w-24 h-24",
  lg: "w-40 h-40",
};

const RENDER_SIZE: Record<CompanionSize, { width: number; height: number }> = {
  sm: { width: 80, height: 80 },
  md: { width: 160, height: 160 },
  lg: { width: 320, height: 320 },
};

interface AICompanionCharacterProps {
  state?: CompanionState;
  size?: CompanionSize;
  /** tombol (a11y) — mis. untuk memfokuskan input chat */
  interactive?: boolean;
  /** aria-label saat interactive */
  label?: string;
  onClick?: () => void;
  className?: string;
  priority?: boolean;
}

export default function AICompanionCharacter({
  state = "idle",
  size = "md",
  interactive = false,
  label,
  onClick,
  className = "",
  priority = false,
}: AICompanionCharacterProps) {
  const pose = state === "thinking" ? "thinking" : "reading";
  const src = gambarKarakter("zelby", pose);
  const render = RENDER_SIZE[size];

  const image = (
    <Image
      src={src}
      alt=""
      width={render.width}
      height={render.height}
      priority={priority}
      sizes={size === "lg" ? "160px" : size === "md" ? "96px" : "40px"}
      className={`${SIZE_CLASS[size]} object-contain select-none drop-shadow-sm`}
      draggable={false}
    />
  );

  if (interactive) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`shrink-0 rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 motion-reduce:transition-none motion-reduce:hover:scale-100 ${className}`}
      >
        {image}
      </button>
    );
  }

  return (
    <div aria-hidden="true" className={`shrink-0 ${className}`}>
      {image}
    </div>
  );
}