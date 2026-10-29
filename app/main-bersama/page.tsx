import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { isUmum, UMUM_HOME } from "@/lib/auth/roles";
import { ComingSoon } from "@/components/umum/ComingSoon";

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
  // UMUM: Main Bersama mode mandiri (bank soal, tanpa kelas/guru) belum
  // dibangun — tampilkan status pengembangan, jangan lempar ke area murid.
  if (user && isUmum(user.role)) {
    return (
      <ComingSoon
        title="Main Bersama"
        icon={Users}
        description="Mode main bersama untuk pengguna umum sedang kami siapkan."
        backHref={UMUM_HOME}
        backLabel="Kembali ke dasbor"
      />
    );
  }
  redirect(user ? "/murid/beranda" : "/login?redirect=/guru/game/main-bersama");
}
