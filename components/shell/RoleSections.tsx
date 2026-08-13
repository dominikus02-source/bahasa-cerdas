"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_INACTIVE,
  NAV_LINK_BASE,
  NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";
import { getRoleNavItems, type RoleNavItem } from "@/components/shell/navigation-context";

/** Blok peran di sidebar universal — sama persis pola Student Shell (Mode Guru / Akses Founder).
 *  Icon-only saat collapsed via .shell-label (CSS global). Authorization TETAP server-side.
 *  Ikon canonical 22px lucide; hover seragam (tanpa warna per-produk).
 *  Fase 5.2.1: item cross-context dihitung oleh getRoleNavItems() (navigation-context.ts) —
 *  destination ke konteks saat ini disembunyikan (GURU di /guru/* tidak lihat Dashboard Guru,
 *  founder di /admin/* tidak lihat Panel Admin). Desktop & mobile pakai aturan yang sama. */
const SECTION_META: Record<RoleNavItem["section"], { header: string }> = {
  guru: { header: "Mode Guru" },
  founder: { header: "Akses Founder" },
};

const ICONS: Record<RoleNavItem["id"], typeof GraduationCap> = {
  "dashboard-guru": GraduationCap,
  "panel-admin": ShieldCheck,
};

export function RoleSections({
  role,
  isFounder,
}: {
  role: string;
  isFounder: boolean;
}) {
  const pathname = usePathname() ?? "";
  const items = getRoleNavItems({ role, isFounder, pathname });
  if (items.length === 0) return null;

  const groups: { section: RoleNavItem["section"]; items: RoleNavItem[] }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.section === item.section);
    if (group) group.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  }

  return (
    <div className="border-t border-gray-100 dark:border-slate-800 pt-2 px-3 pb-1 space-y-1">
      {groups.map(({ section, items: groupItems }) => (
        <div key={section}>
          <div className="shell-label text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 dark:text-slate-500">
            {SECTION_META[section].header}
          </div>
          {groupItems.map((item) => {
            const Icon = ICONS[item.id];
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                aria-label={item.ariaLabel}
                title={item.title}
                className={`${NAV_LINK_BASE} ${NAV_LINK_INACTIVE}`}
              >
                <Icon className={`${NAV_ICON_CLASS} ${NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}