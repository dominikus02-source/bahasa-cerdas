import Link from "next/link";
import { GraduationCap, ShieldCheck, LayoutDashboard } from "lucide-react";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_INACTIVE,
  NAV_LINK_BASE,
  NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";

/** Blok peran di sidebar universal — sama persis pola Student Shell (Mode Guru / Akses Founder).
 *  Icon-only saat collapsed via .shell-label (CSS global). Authorization TETAP server-side.
 *  Ikon canonical 22px lucide; hover seragam (tanpa warna per-produk). */
export function RoleSections({
  role,
  isFounder,
}: {
  role: string;
  isFounder: boolean;
}) {
  if (role !== "GURU" && !isFounder) return null;

  return (
    <div className="border-t border-gray-100 dark:border-slate-800 pt-2 px-3 pb-1 space-y-1">
      {role === "GURU" && !isFounder && (
        <>
          <div className="shell-label text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 dark:text-slate-500">
            Mode Guru
          </div>
          <Link
            href="/guru/beranda"
            prefetch={false}
            aria-label="Dashboard Guru"
            title="Dashboard Guru"
            className={`${NAV_LINK_BASE} ${NAV_LINK_INACTIVE}`}
          >
            <GraduationCap className={`${NAV_ICON_CLASS} ${NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
            <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">
              Dashboard Guru
            </span>
          </Link>
        </>
      )}

      {isFounder && (
        <>
          <div className="shell-label text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 dark:text-slate-500">
            Akses Founder
          </div>
          <Link
            href="/guru/beranda"
            prefetch={false}
            aria-label="Dashboard Guru"
            title="Dashboard Guru"
            className={`${NAV_LINK_BASE} ${NAV_LINK_INACTIVE}`}
          >
            <LayoutDashboard className={`${NAV_ICON_CLASS} ${NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
            <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">
              Dasbor Guru
            </span>
          </Link>
          <Link
            href="/admin"
            prefetch={false}
            aria-label="Panel Admin"
            title="Panel Admin"
            className={`${NAV_LINK_BASE} ${NAV_LINK_INACTIVE}`}
          >
            <ShieldCheck className={`${NAV_ICON_CLASS} ${NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
            <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">
              Panel Admin
            </span>
          </Link>
        </>
      )}
    </div>
  );
}