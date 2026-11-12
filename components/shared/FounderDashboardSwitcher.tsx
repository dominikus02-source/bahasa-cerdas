import Link from "next/link";
import { LayoutDashboard, GraduationCap, ShieldCheck, UsersRound, ChevronDown } from "lucide-react";
import { canUseFounderDashboardSwitcher } from "@/lib/auth/founder-access";

/** Server-rendered dashboard switcher; access visibility is bound to the founder allowlist. */
export function FounderDashboardSwitcher({
  user,
  compact = false,
}: {
  user: { email?: string | null; isFounder?: boolean | null };
  compact?: boolean;
}) {
  if (!canUseFounderDashboardSwitcher(user)) return null;

  const links = [
    { href: "/umum", label: "UMUM", Icon: LayoutDashboard },
    { href: "/guru/beranda", label: "GURU", Icon: GraduationCap },
    { href: "/murid/beranda", label: "MURID", Icon: UsersRound },
    { href: "/admin", label: "FOUNDER", Icon: ShieldCheck },
  ];

  return (
    <details className={compact ? "z-[100] shrink-0 sm:relative" : "relative z-[100] mb-4"} data-founder-dashboard-switcher>
      <summary aria-label="Pilih peran: FOUNDER" title="Pilih peran: FOUNDER" className={`inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 shadow-sm transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/60 ${compact ? "min-w-11 px-2 sm:px-3" : ""}`}>
        <ShieldCheck size={16} aria-hidden="true" className={compact ? "hidden sm:block" : ""} />
        <span>FOUNDER</span>
        <ChevronDown size={14} aria-hidden="true" className={compact ? "hidden md:block" : ""} />
      </summary>
      <nav aria-label="Pilihan peran Founder" className={`${compact ? "absolute inset-x-4 top-full sm:inset-x-auto sm:right-0" : "absolute left-0 right-auto top-full sm:left-auto sm:right-0"} z-[110] mt-2 max-h-[min(70vh,22rem)] min-w-52 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-bc-line bg-bc-surface p-1.5 shadow-xl`}>
        {links.map(({ href, label, Icon }) => (
          <Link key={href} href={href} prefetch={false} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-bc-text transition-colors hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bc-focus">
            <Icon size={17} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
