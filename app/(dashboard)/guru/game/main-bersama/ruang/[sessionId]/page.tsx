import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { TeacherRoomClient } from "@/components/main-bersama/teacher/room-client";
import "@/components/main-bersama/main-bersama.css";

/**
 * Ruang guru Main Bersama (Tahap 7 §6/§13) — route final
 * `/guru/game/main-bersama/ruang/[sessionId]`.
 *
 * Auth + ownership: guard konvensi guru (getUser = Prisma User —
 * role langsung), lalu verifikasi sesi milik guru ini (teacherId =
 * user.id) sebelum menghidupkan client. PIN dibaca read-only dari DB
 * (TeacherSessionView sengaja tidak membawa PIN).
 */
export const metadata = {
  title: "Main Bersama — Ruang Guru",
  robots: { index: false, follow: false },
};

export default async function TeacherRoomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?redirect=/guru/game/main-bersama/ruang/${sessionId}`);
  if (user.role !== "GURU" && !user.isFounder) {
    redirect("/murid/beranda");
  }

  const session = await db.mainSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherId: true, pin: true, className: true },
  });
  if (!session || session.teacherId !== user.id) {
    redirect("/guru/game/main-bersama");
  }

  return (
    <div className="mb-scope-guru">
      <TeacherRoomClient
        sessionId={session.id}
        pin={session.pin}
        className={session.className}
      />
    </div>
  );
}
