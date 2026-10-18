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
    <nav className="bc-mobile-nav md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-bc-line bg-bc-surface/[.97] shadow-[0_-10px_28px_-18px_var(--clr-line-strong)] safe-area-bottom" aria-label="Navigasi utama murid">
      <div className="grid grid-cols-5 items-end px-1.5 pt-1.5 pb-2">
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={label}
              className={`relative min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-bc-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus ${
                active ? "text-bc-violet" : "text-bc-text-3 hover:text-bc-text"
              }`}>
              <span className={`grid place-items-center shrink-0 w-12 h-7 rounded-full transition-colors duration-150 ${active ? "bg-bc-violet-soft" : ""}`}><Icon size={20} strokeWidth={active ? 2.4 : 2} /></span>
              <span className={`h-5 max-w-full px-0.5 flex items-center justify-center text-[10.5px] leading-[1.05] text-center ${active ? "font-bold" : "font-semibold"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
