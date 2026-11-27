import { getUser } from "@/lib/supabase/server";
import { findQrCode, qrInfoPath, resolveQrDestination } from "@/lib/qr/resolve";

/**
 * Tautan pendek QR buku teks (Jelajah Kata SMP, Cakrawala Kata SMA):
 * `https://www.bahasacerdas.com/b/{KODE}` → 307 ke halaman tujuan.
 *
 * - Halaman publik (Video Belajar, Kamus, Main Bersama, NARA) → langsung.
 * - Belum masuk → /login?next=/b/{KODE}; setelah login kembali ke sini lalu
 *   dipilah menurut peran: murid → halaman murid, guru → halaman guru.
 * - Fitur yang belum ada → /b/{KODE}/info ("Segera hadir").
 * - Kode tidak dikenal → /b/{KODE}/info, yang menampilkan 404 ramah (bukan /login).
 *
 * Route Handler (bukan page) supaya pengalihan berupa 307 asli, tidak
 * menunggu streaming dari app/loading.tsx. Location relatif: tidak bergantung
 * pada origin internal server di belakang Caddy.
 *
 * Tabel kode: data/qr-codes.ts. Logika: lib/qr/resolve.ts.
 */
export const dynamic = "force-dynamic";

function redirectTo(href: string) {
  return new Response(null, {
    status: 307,
    headers: {
      Location: href,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const entry = findQrCode(kode);
  if (!entry) return redirectTo(qrInfoPath(encodeURIComponent(kode.slice(0, 80))));

  const user = await getUser();
  return redirectTo(resolveQrDestination(entry, user ? { role: user.role, isFounder: user.isFounder } : null).href);
}
