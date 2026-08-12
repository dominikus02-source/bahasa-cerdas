"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const;

export function ThemeSettingsCard() {
  const { theme, setTheme } = useTheme();
  const active = theme ?? "system";

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Sun className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Tampilan</h2>
          <p className="text-xs text-muted-foreground">Preferensi tema antarmuka</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-1 flex gap-1">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const isActive = active === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={isActive}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground px-1">
          Tersimpan otomatis di perangkatmu. Sistem mengikuti preferensi terang/gelap perangkat.
        </p>
      </div>
    </section>
  );
}
