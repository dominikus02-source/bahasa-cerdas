import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isUmum, UMUM_HOME } from "@/lib/auth/roles";
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
  // UMUM: JUMPA siap (keputusan pendiri 2026-10-26) — tampilkan beranda
  // JUMPA yang asli (tanpa status pengembangan), kembali ke dasbor /umum.
  // Izin ruang tetap ditegakkan server (lib/jumpa/permissions.ts).
  const data = await loadJumpaHome(user);
  return <JumpaHome data={data} displayName={user.nickname || user.fullName} dashboardHref={isUmum(user.role) ? UMUM_HOME : dashboardForUser(user.role, user.isFounder)} />;
}
