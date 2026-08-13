import type { ReactNode } from "react";

/**
 * UNIFIED APP SHELL — kerangka layout universal BahasaCerdas.
 * SATU shell, BANYAK produk: Student/Murid, Arena, Obrolan, Guru, Admin.
 *
 * Struktur (konsisten dengan Student Shell — app/(dashboard)/murid/layout.tsx):
 *   [aside.shell-aside (collapsible 256px ↔ 64px)] [div.shell-main]
 *       └─ sidebar (brand/user/nav/role/footer)        ├─ header sticky (BackHome, theme, bell, logout)
 *                                                      └─ main (content canvas — container diatur via mainClassName)
 *
 * - Collapse/expand global: ShellSidebarToggle memakai data-shell-collapsed + localStorage "bc.shell.collapsed"
 *   (CSS .shell-label/.shell-link di app/globals.css, media md+). Reversibel, ChevronRight selalu visible.
 * - `main` memakai <main> agar selector :has(.game-fullscreen) main (arena.css) tetap berlaku.
 * - Tidak ada navbar kedua di sini: produk menaruh IDENTITAS di `header`, konten di `children`.
 */
export function ShellLayout({
  rootClassName = "",
  sidebar,
  header,
  mainClassName = "flex-1 px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-8",
  children,
  bottomNav,
  drawer,
}: {
  rootClassName?: string;
  sidebar?: ReactNode;
  header?: ReactNode;
  mainClassName?: string;
  children: ReactNode;
  bottomNav?: ReactNode;
  drawer?: ReactNode;
}) {
  return (
    <div className={`flex min-h-screen ${rootClassName}`}>
      {sidebar && (
        <aside className="shell-aside fixed inset-y-0 left-0 z-40 hidden md:flex w-64 flex-col bg-white/90 backdrop-blur-xl border-r border-gray-100 dark:bg-slate-900/80 dark:border-slate-800 shadow-sm">
          {sidebar}
        </aside>
      )}
      <div className={`shell-main flex-1 min-w-0 flex flex-col ${sidebar ? "md:ml-64" : ""}`}>
        {header}
        <main className={mainClassName}>{children}</main>
      </div>
      {drawer}
      {bottomNav}
    </div>
  );
}