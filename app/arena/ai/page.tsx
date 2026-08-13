import { getUser } from "@/lib/supabase/server";
import { getBcHints } from "@/lib/ai-bc/context";
import { STUDENT_PERSONA } from "@/src/ai/bc/personas";
import AiBcArenaWorkspace from "@/components/ai-bc/AiBcArenaWorkspace";

/**
 * AI BC — Teman Belajarmu (Student Shell / Arena).
 *
 * AI BC 2.1 — permukaan murid kini workspace percakapan layar-penuh
 * (AiBcArenaWorkspace) DI DALAM Unified App Shell: shell + header global
 * disediakan app/arena/layout.tsx (komponen tidak membawa navigasi kedua).
 * Shell layout memperlakukan /arena/ai seperti Obrolan (full-width,
 * tanpa banner boost) supaya workspace penuh viewport.
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

  return (
    <AiBcArenaWorkspace
      userName={userName}
      personaTitle={STUDENT_PERSONA.title}
      greeting={STUDENT_PERSONA.greeting}
      hints={hints}
    />
  );
}
