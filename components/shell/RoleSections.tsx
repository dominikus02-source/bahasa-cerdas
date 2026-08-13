import Link from "next/link";
import { GraduationCap, ShieldCheck, LayoutDashboard } from "lucide-react";

/** Blok peran di sidebar universal — sama persis pola Student Shell (Mode Guru / Akses Founder).
 *  Icon-only saat collapsed via .shell-label (CSS global). Authorization TETAP server-side. */
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
            className="shell-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 hover:text-violet-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white"
          >
            <GraduationCap className="w-5 h-5 shrink-0" strokeWidth={1.8} />
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
            className="shell-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" strokeWidth={1.8} />
            <span className="shell-label font-medium group-hover:text-emerald-700 dark:group-hover:text-white">
              Dasbor Guru
            </span>
          </Link>
          <Link
            href="/admin"
            prefetch={false}
            aria-label="Panel Admin"
            title="Panel Admin"
            className="shell-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:text-red-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white"
          >
            <ShieldCheck className="w-5 h-5 shrink-0" strokeWidth={1.8} />
            <span className="shell-label font-medium group-hover:text-red-700 dark:group-hover:text-white">
              Panel Admin
            </span>
          </Link>
        </>
      )}
    </div>
  );
}