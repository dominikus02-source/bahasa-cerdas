"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Zap, PenLine, UserCircle } from "lucide-react";

const PRIMARY = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/murid/belajar", label: "Belajar", icon: BookOpen },
  { href: "/arena", label: "Arena", icon: Zap },
  { href: "/murid/karya", label: "Karya", icon: PenLine },
  { href: "/murid/profile", label: "Profil", icon: UserCircle },
];

type LegacyProps = {
  fullName?: string;
  role?: string;
  isFounder?: boolean;
  isPremium?: boolean;
};

export default function MuridMobileNav(_props: LegacyProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav className="bc-mobile-nav md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-100/80 bg-white/94 backdrop-blur-xl safe-area-bottom dark:bg-slate-900/94 dark:border-slate-800" aria-label="Navigasi utama murid">
      <div className="grid grid-cols-5 items-end px-1.5 pt-1.5 pb-2">
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={label}
              className={`relative min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150 ${
                active ? "text-violet-600 dark:text-violet-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}>
              <span className="grid place-items-center shrink-0 w-7 h-7"><Icon size={20} strokeWidth={2} /></span>
              <span className="h-5 max-w-full px-0.5 flex items-center justify-center text-[9.5px] leading-[1.05] font-semibold text-center">{label}</span>
              {active ? <span className="absolute bottom-0 w-1 h-1 rounded-full bg-current" aria-hidden /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
