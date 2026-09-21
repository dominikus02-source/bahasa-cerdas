import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ClassroomClient } from "@/components/main-bersama/teacher/classroom-client";
import "@/components/main-bersama/main-bersama.css";

/**
 * Layar Kelas Main Bersama (8B.1) — mode presentasi satu layar:
 * `/guru/game/main-bersama/kelas/[sessionId]`.
 *
 * Visual = projector/public-safe contract (TIDAK ada teacher-private
 * state); kontrol = command dock minimum (start/close/discuss/next +
 * overflow pause/resume/end). Auth + ownership sama dengan ruang guru.
 */
export const metadata = {
  title: "Main Bersama — Layar Kelas",
  robots: { index: false, follow: false },
};

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?redirect=/guru/game/main-bersama/kelas/${sessionId}`);
  if (user.role !== "GURU" && !user.isFounder) {
    redirect("/murid/beranda");
  }

  const session = await db.mainSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherId: true },
  });
  if (!session || session.teacherId !== user.id) {
    redirect("/guru/game/main-bersama");
  }

  return (
    <div className="mb-scope">
      <ClassroomClient sessionId={session.id} roomHref={`/guru/game/main-bersama/ruang/${session.id}`} />
    </div>
  );
}
