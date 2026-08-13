"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, STUDENT_NAV } from "@/components/shell/nav-config";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_ACTIVE,
  NAV_ICON_INACTIVE,
  NAV_LINK_BASE,
  NAV_LINK_ACTIVE,
  NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";

/** Sidebar nav universal untuk produk student (Murid/Arena/Obrolan) — pola render identik dengan Student Shell.
 *  Mengikuti canonical icon system (tokens di icon-tokens.ts): ikon 22px, stroke 2, aktif violet. */
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
            className={`${NAV_LINK_BASE} ${active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
          >
            <Icon
              className={`${NAV_ICON_CLASS} ${active ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`}
              strokeWidth={NAV_ICON_STROKE}
            />
            <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
