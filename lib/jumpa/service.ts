/**
 * JUMPA — use case yang menyentuh DB (Prisma). Aturan izin ada di
 * permissions.ts (murni); file ini hanya mengumpulkan fakta lalu
 * menyerahkan keputusan ke sana.
 */
import { Prisma, type JumpaRoom } from "@prisma/client";
import { db } from "@/lib/db";
import { capsFor, JUMPA_MURID_MAX_ACTIVE_ROOMS, roomEndsAt, type JumpaKind } from "./caps";
import { generateLivekitRoomName, generateRoomCode, hashInviteToken, INVITE_TOKEN_RE } from "./code";
import {
  canCreateRoom,
  effectiveRole,
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

export type CreateRoomResult =
  | { ok: true; room: Pick<JumpaRoom, "id" | "code" | "title">; reused: boolean }
  | { ok: false; status: number; code: string; message: string };

/** @deprecated Fase 1 — pakai createRoom({ kind: "KELAS", groupId }). */
export type CreateKelasRoomResult = CreateRoomResult;

export interface CreateRoomRequest {
  kind: JumpaKind;
  groupId?: string | null;
  communityId?: string | null;
  title?: string | null;
}

/** Judul bebas dari pengguna: satu baris, tanpa tag, maks 80 karakter. */
export function cleanTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.replace(/<\/?[a-z][^>]*>/gi, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return t || null;
}

const REUSE_WINDOW_MS = 3 * 60 * 60_000;

export async function createRoom(user: JumpaUserLike, req: CreateRoomRequest): Promise<CreateRoomResult> {
  const actor = await loadActor(user);
  const [group, groupMember, community, communityMember] = await Promise.all([
    req.groupId
      ? db.group.findUnique({ where: { id: req.groupId }, select: { id: true, name: true, teacherId: true, isActive: true } })
      : Promise.resolve(null),
    req.groupId
      ? db.groupMember.findUnique({ where: { groupId_userId: { groupId: req.groupId, userId: user.id } }, select: { id: true } })
      : Promise.resolve(null),
    req.kind === "GURU" && req.communityId
      ? db.community.findUnique({ where: { id: req.communityId }, select: { id: true, name: true, status: true } })
      : Promise.resolve(null),
    req.kind === "GURU" && req.communityId
      ? db.communityMember.findUnique({ where: { communityId_userId: { communityId: req.communityId, userId: user.id } }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (req.kind === "GURU" && req.communityId && !community) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Komunitas tidak ditemukan." };
  }

  const decision = canCreateRoom({
    actor,
    kind: req.kind,
    group: group ? { ownedByActor: group.teacherId === user.id, isActive: group.isActive, actorIsMember: Boolean(groupMember) } : null,
    community: community ? { actorIsMember: Boolean(communityMember), approved: community.status === "APPROVED" } : null,
  });
  if (!decision.ok) {
    const missing = (decision.code === "NOT_GROUP_OWNER" || decision.code === "NOT_GROUP_MEMBER") && !group && Boolean(req.groupId);
    return { ok: false, status: missing ? 404 : 403, code: decision.code, message: decision.message };
  }

  const now = Date.now();
  // Klik ganda / buka ulang: pakai lagi ruang aktif yang sama milik pembuat.
  const existing = await db.jumpaRoom.findFirst({
    where: {
      createdById: user.id,
      kind: req.kind,
      status: { in: ["SCHEDULED", "LIVE"] },
      groupId: req.kind === "GURU" ? null : (group?.id ?? null),
      communityId: req.kind === "GURU" ? (community?.id ?? null) : null,
      createdAt: { gt: new Date(now - REUSE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, title: true, startedAt: true, maxDurationMin: true },
  });
  if (existing) {
    const endsAt = roomEndsAt(existing.startedAt, existing.maxDurationMin);
    if (!endsAt || endsAt.getTime() > now + 5 * 60_000) {
      return { ok: true, room: { id: existing.id, code: existing.code, title: existing.title }, reused: true };
    }
  }

  if (req.kind === "MURID") {
    const active = await db.jumpaRoom.count({ where: { createdById: user.id, kind: "MURID", status: { in: ["SCHEDULED", "LIVE"] } } });
    if (active >= JUMPA_MURID_MAX_ACTIVE_ROOMS) {
      return { ok: false, status: 409, code: "TOO_MANY_ROOMS", message: "Kamu masih punya ruang belajar yang aktif. Akhiri dulu ruang itu." };
    }
  }

  const caps = capsFor(req.kind);
  const custom = cleanTitle(req.title);
  const title = (
    req.kind === "KELAS"
      ? custom ?? `JUMPA ${group!.name}`
      : req.kind === "GURU"
        ? custom ?? (community ? `Ruang ${community.name}` : "Ruang Guru")
        : `Belajar bareng · ${custom ?? group!.name}`
  ).slice(0, 120);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const room = await db.jumpaRoom.create({
        data: {
          code: generateRoomCode(),
          livekitRoomName: generateLivekitRoomName(),
          title,
          kind: req.kind,
          mode: req.kind === "KELAS" ? "CLASS" : "MEETING",
          createdById: user.id,
          creatorRole: user.isFounder ? "GURU" : user.role,
          groupId: req.kind === "GURU" ? null : group!.id,
          communityId: req.kind === "GURU" ? (community?.id ?? null) : null,
          maxParticipants: caps.maxParticipants,
          maxDurationMin: caps.maxDurationMin,
          events: {
            create: { actorId: user.id, action: "ROOM_CREATED", metadata: { kind: req.kind, groupId: group?.id ?? null, communityId: community?.id ?? null } },
          },
        },
        select: { id: true, code: true, title: true },
      });
      return { ok: true, room, reused: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { ok: false, status: 500, code: "CODE_COLLISION", message: "Gagal membuat ruang. Coba lagi." };
}

/** Fase 1 — tetap tersedia untuk tombol KelasKu. */
export function createKelasRoom(user: JumpaUserLike, groupId: string): Promise<CreateRoomResult> {
  return createRoom(user, { kind: "KELAS", groupId });
}

export interface RoomView {
  code: string;
  title: string;
  kind: JumpaRoom["kind"];
  mode: JumpaRoom["mode"];
  status: JumpaRoom["status"];
  isLocked: boolean;
  chatEnabled: boolean;
  allowMuridScreenShare: boolean;
  groupName: string | null;
  communityName: string | null;
  hostName: string | null;
  maxParticipants: number;
  maxDurationMin: number;
  endsAt: string | null;
}

export interface RoomContext {
  room: JumpaRoom;
  view: RoomView;
  actor: JumpaActor;
  effective: JumpaEffectiveRole | null;
  groupTeacherId: string | null;
  participant: { roomRole: JumpaRoomRole; removedAt: Date | null } | null;
  decision: Decision<{ roomRole: JumpaRoomRole; accessVia: JumpaAccessVia; effective: JumpaEffectiveRole }>;
}

/** Muat ruang + fakta relasi user, lalu evaluasi izin join. null = tidak ada. */
export async function loadRoomContext(
  code: string,
  user: JumpaUserLike,
  activeOthers = 0,
  now = new Date(),
  linkToken?: string | null,
): Promise<RoomContext | null> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return null;

  const [actor, group, member, participant, host, invites, community] = await Promise.all([
    loadActor(user),
    room.groupId
      ? db.group.findUnique({ where: { id: room.groupId }, select: { name: true, teacherId: true, isActive: true } })
      : Promise.resolve(null),
    room.groupId
      ? db.groupMember.findUnique({ where: { groupId_userId: { groupId: room.groupId, userId: user.id } }, select: { id: true } })
      : Promise.resolve(null),
    db.jumpaParticipant.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      select: { removedAt: true, roomRole: true },
    }),
    db.user.findUnique({ where: { id: room.createdById }, select: { fullName: true, nickname: true } }),
    db.jumpaInvite.findMany({
      where: { roomId: room.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { kind: true, groupId: true, communityId: true, userId: true, tokenHash: true },
      take: 200,
    }),
    room.communityId ? db.community.findUnique({ where: { id: room.communityId }, select: { name: true } }) : Promise.resolve(null),
  ]);

  const invitedGroupIds = invites.filter((i) => i.kind === "GROUP" && i.groupId).map((i) => i.groupId!);
  const communityIds = [
    ...(room.communityId ? [room.communityId] : []),
    ...invites.filter((i) => i.kind === "COMMUNITY" && i.communityId).map((i) => i.communityId!),
  ];
  const [invitedGroupMember, communityMember] = await Promise.all([
    invitedGroupIds.length
      ? db.groupMember.findFirst({ where: { userId: user.id, groupId: { in: invitedGroupIds }, group: { isActive: true } }, select: { id: true } })
      : Promise.resolve(null),
    communityIds.length
      ? db.communityMember.findFirst({
          where: { userId: user.id, communityId: { in: communityIds }, community: { status: "APPROVED" } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  const linkHash = linkToken && INVITE_TOKEN_RE.test(linkToken) ? hashInviteToken(linkToken) : null;

  const relation: JoinRelation = {
    isCreator: room.createdById === user.id,
    isGroupOwner: Boolean(group && group.teacherId === user.id),
    isGroupMember: Boolean(member),
    groupActive: Boolean(group?.isActive),
    isExistingParticipant: Boolean(participant && !participant.removedAt),
    isRemoved: Boolean(participant?.removedAt),
    isInvitedGroupMember: Boolean(invitedGroupMember),
    isUserInvited: invites.some((i) => i.kind === "USER" && i.userId === user.id),
    isCommunityMember: Boolean(communityMember),
    hasValidLink: Boolean(linkHash && invites.some((i) => i.kind === "LINK" && i.tokenHash === linkHash)),
    storedRoomRole: participant?.roomRole ?? null,
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

  const endsAt = roomEndsAt(room.startedAt, room.maxDurationMin);
  return {
    room,
    decision,
    actor,
    effective: effectiveRole(actor),
    groupTeacherId: group?.teacherId ?? null,
    participant: participant ? { roomRole: participant.roomRole, removedAt: participant.removedAt } : null,
    view: {
      code: room.code,
      title: room.title,
      kind: room.kind,
      mode: room.mode,
      status: room.status,
      isLocked: room.isLocked,
      chatEnabled: room.chatEnabled,
      allowMuridScreenShare: room.allowMuridScreenShare,
      groupName: group?.name ?? null,
      communityName: community?.name ?? null,
      hostName: host ? host.nickname || host.fullName : null,
      maxParticipants: room.maxParticipants,
      maxDurationMin: room.maxDurationMin,
      endsAt: endsAt ? endsAt.toISOString() : null,
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
}): Promise<{ startedAt: Date | null }> {
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
  const fresh = await db.jumpaRoom.findUnique({ where: { id: params.room.id }, select: { startedAt: true } });
  return { startedAt: fresh?.startedAt ?? null };
}

export async function recordJoinDenied(roomId: string, userId: string, code: string): Promise<void> {
  try {
    await db.jumpaEvent.create({ data: { roomId, actorId: userId, action: "JOIN_DENIED", metadata: { code } } });
  } catch {
    // Audit best-effort: penolakan tetap berlaku walau log gagal.
  }
}

/** Nama tampilan banyak user sekaligus (untuk obrolan / log). */
export async function displayNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds)].slice(0, 500);
  if (ids.length === 0) return new Map();
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, nickname: true, fullName: true } });
  return new Map(users.map((u) => [u.id, (u.nickname || u.fullName || "Pengguna BC").slice(0, 60)]));
}

/** Peran efektif user lain (untuk sasaran moderasi/undangan). */
export async function effectiveRoleOf(userId: string): Promise<{ effective: JumpaEffectiveRole | null; isJunior: boolean } | null> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isFounder: true } });
  if (!u) return null;
  const actor = await loadActor({ id: u.id, role: u.role, isFounder: u.isFounder });
  return { effective: effectiveRole(actor), isJunior: actor.isJunior };
}

// ═══════════════════════ Fase 2: beranda /jumpa ═══════════════════════

export interface RoomListItem {
  code: string;
  title: string;
  kind: JumpaRoom["kind"];
  status: JumpaRoom["status"];
  place: string | null;
  mine: boolean;
  startedAt: string | null;
}

export interface JumpaHomeData {
  effective: JumpaEffectiveRole | null;
  isJunior: boolean;
  rooms: RoomListItem[];
  groups: Array<{ id: string; name: string }>;
  communities: Array<{ id: string; name: string }>;
  canSeePanel: boolean;
}

/** Ruang aktif yang relevan untuk user + pilihan untuk membuat ruang. */
export async function loadJumpaHome(user: JumpaUserLike): Promise<JumpaHomeData> {
  const actor = await loadActor(user);
  const effective = effectiveRole(actor);
  const since = new Date(Date.now() - 24 * 3_600_000);

  const [ownedGroups, memberGroups, communities] = await Promise.all([
    effective === "GURU"
      ? db.group.findMany({ where: { teacherId: user.id, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 })
      : Promise.resolve([]),
    db.groupMember.findMany({ where: { userId: user.id, group: { isActive: true } }, select: { group: { select: { id: true, name: true } } }, take: 100 }),
    effective === "GURU"
      ? db.communityMember.findMany({ where: { userId: user.id, community: { status: "APPROVED" } }, select: { community: { select: { id: true, name: true } } }, take: 100 })
      : Promise.resolve([]),
  ]);
  const groupIds = [...ownedGroups.map((g) => g.id), ...memberGroups.map((m) => m.group.id)];
  const communityIds = communities.map((c) => c.community.id);

  const visibleKinds: Array<JumpaRoom["kind"]> =
    effective === "GURU" ? ["KELAS", "GURU", "MURID"] : actor.isJunior ? ["KELAS"] : ["KELAS", "MURID"];

  const rooms = effective
    ? await db.jumpaRoom.findMany({
        where: {
          status: { in: ["SCHEDULED", "LIVE"] },
          createdAt: { gt: since },
          kind: { in: visibleKinds },
          OR: [
            { createdById: user.id },
            ...(groupIds.length ? [{ groupId: { in: groupIds }, kind: { in: ["KELAS", "MURID"] as Array<JumpaRoom["kind"]> } }] : []),
            ...(effective === "GURU" && communityIds.length ? [{ communityId: { in: communityIds } }] : []),
            { invites: { some: { kind: "USER", userId: user.id, revokedAt: null } } },
            ...(groupIds.length ? [{ invites: { some: { kind: "GROUP", groupId: { in: groupIds }, revokedAt: null } } }] : []),
          ],
          // Guru tidak perlu melihat ruang MURID kelas lain; hanya kelas miliknya.
          ...(effective === "GURU" ? { NOT: { kind: "MURID", groupId: { notIn: ownedGroups.map((g) => g.id) } } } : {}),
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 30,
        select: { code: true, title: true, kind: true, status: true, createdById: true, startedAt: true, groupId: true, communityId: true },
      })
    : [];

  const groupName = new Map([...ownedGroups, ...memberGroups.map((m) => m.group)].map((g) => [g.id, g.name]));
  const commName = new Map(communities.map((c) => [c.community.id, c.community.name]));

  return {
    effective,
    isJunior: actor.isJunior,
    rooms: rooms.map((r) => ({
      code: r.code,
      title: r.title,
      kind: r.kind,
      status: r.status,
      place: (r.groupId && groupName.get(r.groupId)) || (r.communityId && commName.get(r.communityId)) || null,
      mine: r.createdById === user.id,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
    })),
    groups: effective === "GURU" ? ownedGroups : actor.isJunior ? [] : memberGroups.map((m) => m.group),
    communities: communities.map((c) => c.community),
    canSeePanel: user.role === "ADMIN" || user.isFounder || effective === "GURU",
  };
}
