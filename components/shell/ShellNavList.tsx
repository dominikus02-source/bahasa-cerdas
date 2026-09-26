"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isNavActive,
  STUDENT_NAV,
  STUDENT_NAV_GROUPS,
} from "@/components/shell/nav-config";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_ACTIVE,
  NAV_ICON_INACTIVE,
  NAV_LINK_BASE,
  NAV_LINK_ACTIVE,
  NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";

/** Sidebar Murid: tujuan utama tetap terlihat; destinasi sekunder dikelompokkan agar IA desktop konsisten dengan mobile. */
export function ShellNavList() {
  const pathname = usePathname();

  const renderItem = (item: (typeof STUDENT_NAV)[number]) => {
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
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      <div className="space-y-1">
        {STUDENT_NAV.map(renderItem)}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
        {STUDENT_NAV_GROUPS.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <p className="shell-label px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map(renderItem)}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}
