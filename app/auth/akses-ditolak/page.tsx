import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { LogoutButton } from "./logout-button";

export const metadata: Metadata = {
  title: "Akses ditolak — BahasaCerdas",
  robots: { index: false, follow: false },
};

/**
 * AKSES DITOLAK — halaman TERMINAL untuk akun dengan peran tak dikenal.
 *
 * Tujuan dashboardForRole() untuk peran di luar allowlist (lib/auth/roles.ts).
 * SENGAJA statis: tidak memanggil getUser()/redirect, sehingga layout mana
 * pun yang mengarahkan ke sini tidak bisa membentuk loop redirect.
 * Peran tak dikenal = default-deny (tidak dianggap guru maupun murid).
 */
export default function AksesDitolakPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-bc-card border border-bc-line bg-bc-surface p-6 shadow-bc-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-bc-icon bg-bc-tint text-bc-violet">
          <ShieldAlert size={24} aria-hidden />
        </div>
        <h1 className="text-bc-h2 text-bc-text">Akses belum tersedia</h1>
        <p className="mt-2 text-bc-small text-muted-foreground">
          Peran akunmu belum dikenali sehingga dasbor tidak bisa dibuka. Silakan
          hubungi tim BahasaCerdas atau keluar lalu masuk dengan akun lain.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <LogoutButton />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-bc-ctl border border-bc-line px-4 py-2 text-sm font-semibold text-bc-text"
          >
            Ke beranda publik
          </Link>
        </div>
      </div>
    </main>
  );
}
