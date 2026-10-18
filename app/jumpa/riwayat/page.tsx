import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { dashboardForUser } from "@/lib/auth/redirect";
import { loadRoomHistory } from "@/lib/jumpa/scheduling";
import RoomHistory from "@/components/jumpa/RoomHistory";

export const dynamic = "force-dynamic";

/** /jumpa/riwayat — JUMPA mendatang, berlangsung, dan selesai (60 hari) untuk guru & murid. */
export default async function JumpaRiwayatPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/jumpa/riwayat");
  if (user.role === "ADMIN" && !user.isFounder) redirect("/jumpa/pantau");
  const data = await loadRoomHistory(user);
  return <RoomHistory data={data} canSchedule={data.effective === "GURU"} backHref={dashboardForUser(user.role, user.isFounder)} />;
}
