import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBcHints } from "@/lib/ai-bc/context";
import { TEACHER_PERSONA } from "@/src/ai/bc/personas";
import AiBcGuruWorkspace from "@/components/ai-bc/AiBcGuruWorkspace";

/**
 * AI BC 2.2 — Teman Guru (Guru Shell).
 *
 * Permukaan guru kini FULLSCREEN CONVERSATION WORKSPACE (AiBcGuruWorkspace)
 * DI DALAM Unified App Shell — setara kualitas dengan workspace murid 2.1:
 * komposer langsung terlihat, Zelby reading/thinking, streaming SSE,
 * saran prompt guru, dark/light. Sidebar global + header global disediakan
 * shell — halaman hanya menghadirkan workspace konten (tanpa navigasi kedua).
 *
 * Persona guru (Teman Guru) selalu dari sesi server-side; murid tidak pernah
 * masuk permukaan ini. Modul lama (AiBcModule) tetap utuh di repo untuk
 * kompatibilitas permukaan lain.
 */
export default async function GuruAiBcPage() {
  const user = await getUser();
  if (!user || (user.role !== "GURU" && !user.isFounder)) {
    redirect("/arena/ai");
  }

  const hints = await getBcHints(user).catch(() => []);
  const userName = user.nickname || user.fullName || "";

  return (
    <AiBcGuruWorkspace
      userName={userName}
      personaTitle={TEACHER_PERSONA.title}
      greeting={TEACHER_PERSONA.greeting}
      hints={hints}
    />
  );
}
