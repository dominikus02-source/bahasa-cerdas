import { getUser } from "@/lib/supabase/server";
import { getBcHints } from "@/lib/ai-bc/context";
import AiBcModule from "@/components/ai-bc/AiBcModule";
import type { BcRole } from "@/components/ai-bc/ai-bc-types";

/**
 * AI BC — Teman Belajarmu (Student Shell / Arena).
 *
 * Peran ditentukan dari sesi (server-side) — murid selalu melihat
 * persona murid; guru/founder yang singgah di Arena mendapat persona guru.
 * Layout Arena (unified shell) yang menyediakan navigasi global.
 */
export default async function ArenaAiPage() {
  const user = await getUser();
  const role: BcRole =
    user && (user.role === "GURU" || user.role === "ADMIN" || user.isFounder)
      ? "teacher"
      : "student";
  const hints = user ? await getBcHints(user).catch(() => []) : [];
  const userName = user ? user.nickname || user.fullName || "" : "";

  return <AiBcModule role={role} userName={userName} hints={hints} />;
}
