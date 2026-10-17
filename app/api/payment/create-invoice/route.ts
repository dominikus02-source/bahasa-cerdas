import { NextResponse } from "next/server";

/**
 * Endpoint legacy ditutup; seluruh transaksi Guru PRO dan Murid Premium
 * wajib memakai /api/billing/checkout (validasi role, kupon, DB-first).
 * HTTP 410 mencegah invoice tercecer lewat klien lama.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "LEGACY_CHECKOUT_CLOSED",
      message: "Alur pembayaran diperbarui. Buka halaman Berlangganan dan coba lagi.",
    },
    { status: 410 }
  );
}
