"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
] as const;

/**
 * Segmented control Tampilan (☀ Terang / 🌙 Gelap) untuk sidebar.
 * Memakai next-themes yang sama dengan ThemeSettingsCard — tanpa provider
 * baru, preferensi persist otomatis di localStorage.
 * Violet = aktif, netral = inaktif (tanpa amber).
 */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const active = theme === "dark" ? "dark" : "light";

  return (
    <div className="shell-appearance">
      <p className="shell-label text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5 dark:text-slate-500">
        Tampilan
      </p>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-1 flex gap-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={isActive}
              aria-label={`Tema ${label}`}
              title={`Tema ${label}`}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="shell-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}