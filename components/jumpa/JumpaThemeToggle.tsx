"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/** Tombol tema terang/gelap JUMPA. Default mengikuti sistem (next-themes). */
export default function JumpaThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="jumpa-ghost !min-h-[40px] !w-10 !px-0"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Tema terang" : "Tema gelap"}
      title={dark ? "Tema terang" : "Tema gelap"}
    >
      {mounted ? (dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />) : <span className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
