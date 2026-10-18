import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { dashboardForUser } from "@/lib/auth/redirect";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { isPantauViewer, loadPantauDetail, loadPantauOverview } from "@/lib/jumpa/pantau";
import { PantauOverview, PantauRoom } from "@/components/jumpa/PantauView";

export const dynamic = "force-dynamic";

/**
 * /jumpa/pantau — panel minimal log & laporan JUMPA.
 * Admin/founder: semua ruang. Guru: ruang buatannya & ruang di kelasnya.
 * Murid: tidak ada akses (404).
 */
export default async function JumpaPantauPage({ searchParams }: { searchParams: Promise<{ ruang?: string | string[] }> }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/jumpa/pantau");
  if (!isPantauViewer(user)) notFound();

  const sp = await searchParams;
  const code = typeof sp.ruang === "string" ? sp.ruang : null;
  if (code) {
    if (!isValidRoomCode(code)) notFound();
    const detail = await loadPantauDetail(user, code);
    if (!detail) notFound();
    return <PantauRoom d={detail} />;
  }
  const data = await loadPantauOverview(user);
  const backHref = user.role === "ADMIN" && !user.isFounder ? dashboardForUser(user.role, user.isFounder) : "/jumpa";
  return <PantauOverview rooms={data.rooms} reports={data.reports} backHref={backHref} />;
}
