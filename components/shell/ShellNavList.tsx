"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, STUDENT_NAV } from "@/components/shell/nav-config";

/** Sidebar nav universal untuk produk student (Murid/Arena/Obrolan) — pola render identik dengan Student Shell. */
export function ShellNavList() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
      {STUDENT_NAV.map((item) => {
        const active = isNavActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className={`shell-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 ${
              active
                ? "bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 font-semibold dark:from-violet-500/20 dark:to-purple-500/10 dark:text-violet-300"
                : "text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 hover:text-violet-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white"
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
            <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}