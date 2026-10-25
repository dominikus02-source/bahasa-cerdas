import { redirect } from "next/navigation";
import { Video } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { isUmum, UMUM_HOME } from "@/lib/auth/roles";
import { ComingSoon } from "@/components/umum/ComingSoon";
import { dashboardForUser } from "@/lib/auth/redirect";
import { loadJumpaHome } from "@/lib/jumpa/service";
import JumpaHome from "@/components/jumpa/JumpaHome";

export const dynamic = "force-dynamic";

// Fase 2: beranda JUMPA — ruang aktif + mulai ruang guru / belajar bareng.
export default async function JumpaIndex() {
  const user = await getUser();
  if (!user) redirect("/login?next=/jumpa");
  // Admin non-founder tidak ikut ruang — langsung ke panel pantau.
  if (user.role === "ADMIN" && !user.isFounder) redirect("/jumpa/pantau");
  // UMUM: semua jenis ruang JUMPA saat ini terikat kelas (KELAS/MURID) atau
  // guru (GURU). Ruang mandiri untuk UMUM menyusul — sampai itu ada, tampilkan
  // status pengembangan alih-alih beranda kosong.
  if (isUmum(user.role)) {
    return (
      <ComingSoon
        title="JUMPA"
        icon={Video}
        description="Ruang video JUMPA untuk pengguna umum sedang kami siapkan."
        backHref={UMUM_HOME}
        backLabel="Kembali ke dasbor"
      />
    );
  }
  const data = await loadJumpaHome(user);
  return <JumpaHome data={data} displayName={user.nickname || user.fullName} dashboardHref={dashboardForUser(user.role, user.isFounder)} />;
}
