/**
 * JUMPA Fase 2 — pekerjaan latar: sweep cron (auto-akhiri, peringatan,
 * retensi obrolan) dan webhook LiveKit (kehadiran).
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { roomEndsAt } from "./caps";
import { chatRetentionCutoff } from "./chat";
import { attendanceOnJoin, attendanceOnLeave, sweepActionFor, webhookDedupeKey } from "./lifecycle";
import { sendServerSignal } from "./livekit";
import { closeAttendance, endRoomForAll } from "./room-actions";
import { JUMPA_TOPICS } from "./signals";

export interface SweepResult {
  checked: number;
  ended: number;
  warned: number;
  stale: number;
  chatPurged: number;
}

export async function runJumpaSweep(now = new Date()): Promise<SweepResult> {
  const rooms = await db.jumpaRoom.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    select: { id: true, livekitRoomName: true, status: true, startedAt: true, createdAt: true, maxDurationMin: true, warnedAt: true },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  const result: SweepResult = { checked: rooms.length, ended: 0, warned: 0, stale: 0, chatPurged: 0 };

  for (const room of rooms) {
    const action = sweepActionFor(room, now);
    try {
      if (action === "END_TIME_LIMIT") {
        if (await endRoomForAll(room, "TIME_LIMIT", null, now)) result.ended++;
      } else if (action === "END_STALE") {
        if (await endRoomForAll(room, "STALE", null, now)) result.stale++;
      } else if (action === "WARN") {
        const claimed = await db.jumpaRoom.updateMany({ where: { id: room.id, warnedAt: null }, data: { warnedAt: now } });
        if (claimed.count > 0) {
          const endsAt = roomEndsAt(room.startedAt, room.maxDurationMin);
          if (endsAt) await sendServerSignal(room.livekitRoomName, JUMPA_TOPICS.room, { t: "room.warning", endsAt: endsAt.toISOString() });
          result.warned++;
        }
      }
    } catch (error) {
      console.error("JUMPA_SWEEP_ROOM_FAILED", { roomId: room.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Retensi obrolan: hapus permanen setelah N hari. Cuplikan di laporan tetap.
  const purged = await db.jumpaChatMessage.deleteMany({ where: { createdAt: { lt: chatRetentionCutoff(now) } } });
  result.chatPurged = purged.count;
  return result;
}

export interface JumpaWebhookEvent {
  event: string;
  id?: string;
  createdAt?: number;
  roomName?: string;
  identity?: string;
}

/** Proses satu event webhook. Idempoten via JumpaEvent.dedupeKey. */
export async function handleJumpaWebhook(evt: JumpaWebhookEvent, now = new Date()): Promise<"ok" | "ignored" | "duplicate"> {
  const relevant = ["participant_joined", "participant_left", "participant_connection_aborted", "room_finished"];
  if (!relevant.includes(evt.event) || !evt.roomName) return "ignored";
  const room = await db.jumpaRoom.findUnique({ where: { livekitRoomName: evt.roomName }, select: { id: true, status: true, livekitRoomName: true } });
  if (!room) return "ignored";

  const at = evt.createdAt ? new Date(evt.createdAt * 1000) : now;
  const dedupeKey = webhookDedupeKey(evt.id, evt.event, evt.roomName, evt.identity ?? "", evt.createdAt ?? Math.floor(now.getTime() / 1000));
  try {
    await db.jumpaEvent.create({
      data: { roomId: room.id, actorId: evt.identity ?? null, action: `LK_${evt.event.toUpperCase()}`, dedupeKey },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate";
    throw error;
  }

  if (evt.event === "room_finished") {
    await closeAttendance(room.id, at);
    // LiveKit menutup ruang kosong (emptyTimeout) — tandai berakhir juga di DB.
    if (room.status === "LIVE") await endRoomForAll(room, "EMPTY", null, at);
    return "ok";
  }

  if (!evt.identity) return "ok";
  const p = await db.jumpaParticipant.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: evt.identity } },
    select: { id: true, lastJoinedAt: true, lastLeftAt: true, totalSeconds: true, joinCount: true },
  });
  if (!p) return "ok"; // identitas di luar DB (mis. uji) — abaikan

  const next = evt.event === "participant_joined" ? attendanceOnJoin(p, at) : attendanceOnLeave(p, at);
  await db.jumpaParticipant.update({
    where: { id: p.id },
    data: { lastJoinedAt: next.lastJoinedAt, lastLeftAt: next.lastLeftAt, totalSeconds: next.totalSeconds, joinCount: next.joinCount },
  });
  return "ok";
}
