"use client";

import type { ReactNode } from "react";
import { NavigationPromisesContext, PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

/**
 * Fixture QA saja: menyimulasikan pathname agar komponen asli yang memakai
 * usePathname() (mis. TeacherHomeShortcut, nav bawah) dirender seperti di
 * rute sebenarnya. Tidak dipakai di luar app/qa-fixture.
 */
export function QaPathname({ pathname, children }: { pathname: string; children: ReactNode }) {
  // Next 16 dev membaca pathname dari NavigationPromisesContext lebih dulu.
  return (
    <NavigationPromisesContext.Provider value={null}>
      <PathnameContext.Provider value={pathname}>{children}</PathnameContext.Provider>
    </NavigationPromisesContext.Provider>
  );
}
