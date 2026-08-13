export type NavigationContext = "student" | "guru" | "admin";

export type RoleDestinationId = "dashboard-guru" | "panel-admin";

export interface RoleNavItem {
  id: RoleDestinationId;
  section: "guru" | "founder";
  href: string;
  label: string;
  ariaLabel: string;
  title: string;
}

/** Konteks produk dari pathname — SATU sumber kebenaran navigasi peran.
 *  Student context = /murid/*, /arena/*, /arena/chat/*. GURU yang menjelajah
 *  Arena/Obrolan tetap berada di student experience → Dashboard Guru tampil. */
export function getNavigationContext(pathname: string): NavigationContext {
  if (pathname.startsWith("/guru")) return "guru";
  if (pathname.startsWith("/admin")) return "admin";
  return "student";
}

/** Aturan canonical role-switch (Phase 5.2.1):
 *  destination ke konteks produk SAAT INI disembunyikan (tidak redundant),
 *  destination cross-context tetap ditampilkan.
 *  - GURU non-founder: Dashboard Guru hanya di context student.
 *  - Founder: Dasbor Guru DITAMPILKAN kecuali di /guru/*, Panel Admin hanya
 *    di luar /admin/*. MURID selalu kosong. */
export function getRoleNavItems({
  role,
  isFounder,
  pathname,
}: {
  role: string;
  isFounder: boolean;
  pathname: string;
}): RoleNavItem[] {
  const context = getNavigationContext(pathname);
  const items: RoleNavItem[] = [];

  if ((role === "GURU" || isFounder) && context !== "guru") {
    items.push({
      id: "dashboard-guru",
      section: isFounder ? "founder" : "guru",
      href: "/guru/beranda",
      label: isFounder ? "Dasbor Guru" : "Dashboard Guru",
      ariaLabel: "Dashboard Guru",
      title: "Dashboard Guru",
    });
  }
  if (isFounder && context !== "admin") {
    items.push({
      id: "panel-admin",
      section: "founder",
      href: "/admin",
      label: "Panel Admin",
      ariaLabel: "Panel Admin",
      title: "Panel Admin",
    });
  }
  return items;
}