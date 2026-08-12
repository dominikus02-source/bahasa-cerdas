"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const KEY = "bc.shell.collapsed";

function apply(collapsed: boolean) {
  document.documentElement.setAttribute("data-shell-collapsed", collapsed ? "1" : "0");
}

/**
 * Tombol ciutkan/bentangkan sidebar Student Shell (desktop md+).
 * State dipersist ke localStorage — tahan reload & navigasi.
 * Mobile tidak terpengaruh (sidebar desktop disembunyikan, drawer dipakai).
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
      aria-label={collapsed ? "Bentangkan sidebar" : "Ciutkan sidebar"}
      title={collapsed ? "Bentangkan sidebar" : "Ciutkan sidebar"}
      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors shrink-0"
    >
      {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
    </button>
  );
}