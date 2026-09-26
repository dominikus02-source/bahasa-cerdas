"use client";

import { redirect } from "next/navigation";

/**
 * Legacy route.
 * Satu sumber kebenaran untuk daftar tugas murid sekarang /arena/tugas.
 * Route lama tetap hidup agar bookmark/deep-link lama tidak rusak.
 */
export default function MuridTugaskuLegacyRedirect() {
  redirect("/arena/tugas");
}
