/**
 * JUMPA — use case yang menyentuh DB (Prisma). Aturan izin ada di
 * permissions.ts (murni); file ini hanya mengumpulkan fakta lalu
 * menyerahkan keputusan ke sana.
 */
import { Prisma, type JumpaRoom } from "@prisma/client";
import { db } from "@/lib/db";
import { capsFor } from "./caps";
import { generateLivekitRoomName, generateRoomCode } from "./code";
import {
  canCreateRoom,
  evaluateJoin,
  type JumpaActor,
  type JoinRelation,
  type Decision,
  type JumpaRoomRole,
  type JumpaAccessVia,
  type JumpaEffectiveRole,
} from "./permissions";

export interface JumpaUserLike {
  id: string;
  role: "GURU" | "MURID" | "ADMIN";
  isFounder: boolean;
}

export async function loadActor(user: JumpaUserLike): Promise<JumpaActor> {
  const junior = await db.arenaJuniorAkun.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return { role: user.role, isFounder: user.isFounder, isJunior: Boolean(junior) };
}

export type CreateKelasRoomResult =
  | { ok: true; room: Pick<JumpaRoom, "id" | "code" | "title"> }
  | { ok: false; status: number; code: string; message: string };

export async function createKelasRoom(
  user: JumpaUserLike,
  groupId: string,
): Promise<CreateKelasRoomResult> {
  const actor = await loadActor(user);
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, teacherId: true, isActive: true },
  });
  const decision = canCreateRoom({
    actor,
    kind: "KELAS",
    group: group ? { ownedByActor: group.teacherId === user.id, isActive: group.isActive } : null,
  });
  if (!decision.ok) {
    return { ok: false, status: decision.code === "NOT_GROUP_OWNER" && !group ? 404 : 403, code: decision.code, message: decision.message };
  }
  const caps = capsFor("KELAS");
  const title = `JUMPA ${group!.name}`.slice(0, 120);

  // Kode acak; ulangi bila (sangat jarang) bentrok unique.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const room = await db.jumpaRoom.create({
        data: {
          code: generateRoomCode(),
          livekitRoomName: generateLivekitRoomName(),
          title,
          kind: "KELAS",
          mode: "CLASS",
          createdById: user.id,
          creatorRole: user.isFounder ? "GURU" : user.role,
          groupId: group!.id,
          maxParticipants: caps.maxParticipants,
          maxDurationMin: caps.maxDurationMin,
          events: { create: { actorId: user.id, action: "ROOM_CREATED", metadata: { groupId: group!.id } } },
        },
        select: { id: true, code: true, title: true },
      });
      return { ok: true, room };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { ok: false, status: 500, code: "CODE_COLLISION", message: "Gagal membuat ruang. Coba lagi." };
}

export interface RoomView {
  code: string;
  title: string;
  kind: JumpaRoom["kind"];
  mode: JumpaRoom["mode"];
  status: JumpaRoom["status"];
  isLocked: boolean;
  groupName: string | null;
  hostName: string | null;
  maxParticipants: number;
  maxDurationMin: number;
}

export interface RoomContext {
  room: JumpaRoom;
  view: RoomView;
  decision: Decision<{ roomRole: JumpaRoomRole; accessVia: JumpaAccessVia; effective: JumpaEffectiveRole }>;
}

/** Muat ruang + fakta relasi user, lalu evaluasi izin join. null = tidak ada. */
export async function loadRoomContext(
  code: string,
  user: JumpaUserLike,
  activeOthers = 0,
  now = new Date(),
): Promise<RoomContext | null> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return null;

  const [actor, group, member, participant, host] = await Promise.all([
    loadActor(user),
    room.groupId
      ? db.group.findUnique({ where: { id: room.groupId }, select: { name: true, teacherId: true, isActive: true } })
      : Promise.resolve(null),
    room.groupId
      ? db.groupMember.findUnique({ where: { groupId_userId: { groupId: room.groupId, userId: user.id } }, select: { id: true } })
      : Promise.resolve(null),
    db.jumpaParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId: user.id } }, select: { removedAt: true } }),
    db.user.findUnique({ where: { id: room.createdById }, select: { fullName: true, nickname: true } }),
  ]);

  const relation: JoinRelation = {
    isCreator: room.createdById === user.id,
    isGroupOwner: Boolean(group && group.teacherId === user.id),
    isGroupMember: Boolean(member),
    groupActive: Boolean(group?.isActive),
    isExistingParticipant: Boolean(participant && !participant.removedAt),
    isRemoved: Boolean(participant?.removedAt),
  };

  const decision = evaluateJoin({
    actor,
    room: {
      kind: room.kind,
      status: room.status,
      isLocked: room.isLocked,
      startedAt: room.startedAt,
      maxDurationMin: room.maxDurationMin,
      maxParticipants: room.maxParticipants,
    },
    relation,
    activeOthers,
    now,
  });

  return {
    room,
    decision,
    view: {
      code: room.code,
      title: room.title,
      kind: room.kind,
      mode: room.mode,
      status: room.status,
      isLocked: room.isLocked,
      groupName: group?.name ?? null,
      hostName: host ? host.nickname || host.fullName : null,
      maxParticipants: room.maxParticipants,
      maxDurationMin: room.maxDurationMin,
    },
  };
}

/** Catat akses yang diberikan: upsert peserta, tandai ruang LIVE. */
export async function recordJoinGranted(params: {
  room: JumpaRoom;
  userId: string;
  roomRole: JumpaRoomRole;
  accessVia: JumpaAccessVia;
  now?: Date;
}): Promise<void> {
  const now = params.now ?? new Date();
  await db.$transaction([
    db.jumpaParticipant.upsert({
      where: { roomId_userId: { roomId: params.room.id, userId: params.userId } },
      create: { roomId: params.room.id, userId: params.userId, roomRole: params.roomRole, accessVia: params.accessVia },
      update: { lastTokenAt: now, roomRole: params.roomRole },
    }),
    db.jumpaRoom.updateMany({
      where: { id: params.room.id, status: "SCHEDULED" },
      data: { status: "LIVE", startedAt: now },
    }),
    db.jumpaEvent.create({
      data: { roomId: params.room.id, actorId: params.userId, action: "JOIN_GRANTED", metadata: { roomRole: params.roomRole, accessVia: params.accessVia } },
    }),
  ]);
}

export async function recordJoinDenied(roomId: string, userId: string, code: string): Promise<void> {
  try {
    await db.jumpaEvent.create({ data: { roomId, actorId: userId, action: "JOIN_DENIED", metadata: { code } } });
  } catch {
    // Audit best-effort: penolakan tetap berlaku walau log gagal.
  }
}
