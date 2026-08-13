"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const KEY = "bc.shell.collapsed";

function apply(collapsed: boolean) {
  document.documentElement.setAttribute("data-shell-collapsed", collapsed ? "1" : "0");
}

/**
 * Tombol ciutkan/bentangkan sidebar Student Shell (desktop md+).
 * SELALU terlihat (dipasang di footer sidebar, bukan bergantung hover):
 * expanded → ChevronLeft; collapsed → ChevronRight.
 * State dipersist di localStorage "bc.shell.collapsed" (reload tetap
 * collapsed/expanded sesuai state). Mobile tidak terpengaruh.
 */
export function ShellSidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    const c = saved === "1";
    setCollapsed(c);
    apply(c);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      apply(next);
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* storage tidak tersedia — state tetap berlaku per sesi */
      }
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
      title={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
      className="w-8 h-8 shrink-0 rounded-lg bg-gray-200/80 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
    >
      {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
    </button>
  );
}