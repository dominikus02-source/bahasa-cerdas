import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

/**
 * Redirect route lama (Tahap 7) → route guru final (§6 §2 audit
 * routing: JANGAN punya dua teacher setup implementation).
 *
 * Guru/ADMIN → `/guru/game/main-bersama`; user lain → dashboard
 * sesuai konvensi (murid → /murid/beranda). Student route
 * `/main-bersama/join` dan `/main-bersama/layar` TIDAK tersentuh —
 * mereka masih route publik masing-masing.
 */
export default async function OldMainBersamaRootPage() {
  const user = await getUser();
  if (user && (user.role === "GURU" || user.isFounder)) {
    redirect("/guru/game/main-bersama");
  }
  redirect(user ? "/murid/beranda" : "/login?redirect=/guru/game/main-bersama");
}
