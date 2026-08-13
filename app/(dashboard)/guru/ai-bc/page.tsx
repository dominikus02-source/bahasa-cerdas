import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBcHints } from "@/lib/ai-bc/context";
import AiBcModule from "@/components/ai-bc/AiBcModule";

/**
 * AI BC — Teman Guru (Guru Shell).
 *
 * Khusus guru/founder. Layout guru yang menyediakan sidebar, header global,
 * dan navigasi; halaman ini hanya menghadirkan modul AI BC dengan persona
 * guru. Peran selalu dari sesi — tidak ada mode switch.
 */
export default async function GuruAiBcPage() {
  const user = await getUser();
  if (!user || (user.role !== "GURU" && !user.isFounder)) {
    redirect("/arena/ai");
  }

  const hints = await getBcHints(user).catch(() => []);
  const userName = user.nickname || user.fullName || "";

  return <AiBcModule role="teacher" userName={userName} hints={hints} />;
}
