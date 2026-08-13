import { getUser } from "@/lib/supabase/server";
import { getBcHints } from "@/lib/ai-bc/context";
import AiBcModule from "@/components/ai-bc/AiBcModule";

/**
 * AI BC — Teman Belajarmu (Student Shell / Arena).
 *
 * Rule 6 (role-safe): /arena/ai SELALU persona murid — "Teman Belajarmu".
 * Guru/founder/ADMIN yang singgah di Arena tetap mendapat pengalaman murid
 * (data konteks hanya data belajar + saran awal murid), karena Arena adalah
 * permukaan murid; permukaan guru ada di /guru/ai-bc ("Teman Guru").
 * Peran tetap ditentukan server-side dari sesi — klien tidak pernah
 * mengirim/memilih peran.
 */
export default async function ArenaAiPage() {
  const user = await getUser();
  // roleOverride="student": hints murid dipaksa, walau user-nya guru.
  const hints = user ? await getBcHints(user, "student").catch(() => []) : [];
  const userName = user ? user.nickname || user.fullName || "" : "";

  return <AiBcModule role="student" userName={userName} hints={hints} />;
}
