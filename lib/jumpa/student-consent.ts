import { db } from "@/lib/db";
import { hasStudentConsentAccess } from "@/lib/auth/student-consent-access";
import { requiresStudentVerification } from "@/lib/auth/student-provisioning";
import { removeLivekitParticipant } from "./livekit";
import { screenIdentityOrNull, screenOwnerOf } from "./screen-identity";

export async function removeRevokedStudentFromJumpa(studentAuthId: string) {
  if (!requiresStudentVerification("MURID")) return;
  const student = await db.user.findUnique({
    where: { supabaseId: studentAuthId },
    select: { id: true, role: true },
  });
  if (student?.role !== "MURID") return;

  // Include issued tokens even when an attendance webhook has yet to arrive.
  const participants = await db.jumpaParticipant.findMany({
    where: { userId: student.id, room: { status: "LIVE" } },
    select: { room: { select: { livekitRoomName: true } } },
  });
  const screen = screenIdentityOrNull(student.id);
  const results = await Promise.allSettled(participants.flatMap(({ room }) => [
    removeLivekitParticipant(room.livekitRoomName, student.id),
    ...(screen ? [removeLivekitParticipant(room.livekitRoomName, screen)] : []),
  ]));
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("JUMPA_CONSENT_DISCONNECT_FAILED");
  }
}

export async function rejectRevokedJumpaJoin(roomName: string, identity: string): Promise<boolean> {
  if (!requiresStudentVerification("MURID")) return false;
  const userId = screenOwnerOf(identity) ?? identity;
  const student = await db.user.findUnique({ where: { id: userId }, select: { role: true, supabaseId: true } });
  if (!student || await hasStudentConsentAccess(student.role, student.supabaseId)) return false;
  await removeLivekitParticipant(roomName, identity);
  return true;
}
