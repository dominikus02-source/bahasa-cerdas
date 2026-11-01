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
    { href: "/umum", label: "Dasbor Umum", Icon: LayoutDashboard },
    { href: "/guru/beranda", label: "Dasbor Guru", Icon: GraduationCap },
    { href: "/murid/beranda", label: "Dasbor Murid", Icon: UsersRound },
    { href: "/admin", label: "Panel Admin", Icon: ShieldCheck },
  ];

  return (
    <details className={compact ? "relative z-[100]" : "relative z-[100] mb-4"} data-founder-dashboard-switcher>
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 shadow-sm transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/60">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>Pindah Dasbor Founder</span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <nav aria-label="Pilihan dasbor founder" className="absolute right-0 top-full z-[110] mt-2 max-h-[min(70vh,22rem)] min-w-52 overflow-y-auto overscroll-contain rounded-xl border border-bc-line bg-bc-surface p-1.5 shadow-xl">
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
