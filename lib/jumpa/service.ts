/**
 * JUMPA — use case yang menyentuh DB (Prisma). Aturan izin ada di
 * permissions.ts (murni); file ini hanya mengumpulkan fakta lalu
 * menyerahkan keputusan ke sana.
 */
import { advisoryXactLock } from "@/lib/db/advisory-lock";
import { Prisma, type JumpaRoom } from "@prisma/client";
import { db } from "@/lib/db";
import { checkUmumCreateGuards, JUMPA_MURID_MAX_ACTIVE_ROOMS, roomEndsAt, umumConcurrentCap, type JumpaKind } from "./caps";
import { isRoleUmumEnabled } from "@/lib/auth/umum-flag";
import { resolveJumpaTier, tierForRoomKind } from "./entitlement";
import { checkDailyQuota, checkWebinarWeeklyQuota, cameraCapFor, limitsFor, startOfJakartaDay, startOfJakartaWeek, tierFromCreatedMetadata, umumTierDef, JUMPA_TIERS, JUMPA_UPGRADE_URL, type JumpaTier } from "./tiers";
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
  // UMUM hanya mendapat peran efektif JUMPA bila ENABLE_ROLE_UMUM menyala
  // (loadActor → umumEnabled); tanpa flag effectiveRole() → null dan ruang
  // UMUM tertutup bagi semua akun.
  role: "GURU" | "MURID" | "ADMIN" | "UMUM";
  isFounder: boolean;
}

export async function loadActor(user: JumpaUserLike): Promise<JumpaActor> {
  const junior = await db.arenaJuniorAkun.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return { role: user.role, isFounder: user.isFounder, isJunior: Boolean(junior), umumEnabled: isRoleUmumEnabled() };
}

export type CreateRoomResult =
  | { ok: true; room: Pick<JumpaRoom, "id" | "code" | "title">; reused: boolean; tier?: JumpaTier }
  | { ok: false; status: number; code: string; message: string; extra?: Record<string, unknown> };

/** @deprecated Fase 1 — pakai createRoom({ kind: "KELAS", groupId }). */
export type CreateKelasRoomResult = CreateRoomResult;

export interface CreateRoomRequest {
  kind: JumpaKind;
  groupId?: string | null;
  communityId?: string | null;
  title?: string | null;
  /** Alur jadwal: jam mulai (sudah divalidasi lib/jumpa/schedule.ts). */
  startsAt?: Date | null;
  /** Durasi pilihan guru (≤ batas paket). */
  durationMin?: number | null;
  /** "Beri tahu kelas" (default true). false = tanpa notifikasi kelas/komunitas. */
  notifyClass?: boolean | null;
  /** Webinar: hanya guru Premium, 1x per minggu, 200 peserta. */
  isWebinar?: boolean | null;
}

/**
 * Ruang KELAS+GURU yang dihitung untuk kuota hari WIB `dayStart`: ruang instan
 * menurut createdAt, ruang terjadwal menurut hari rapatnya. Jadwal yang
 * dibatalkan tidak dihitung.
 */
export function countRoomsOnDay(userId: string, dayStart: Date, kinds: Array<JumpaRoom["kind"]> = ["KELAS", "GURU"]): Promise<number> {
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  return db.jumpaRoom.count({
    where: {
      createdById: userId,
      kind: { in: kinds },
      // NOT {endReason} di Prisma ikut membuang NULL — tulis eksplisit.
      AND: [
        { OR: [{ endReason: null }, { endReason: { not: "CANCELLED" } }] },
        { OR: [{ scheduledAt: null, createdAt: { gte: dayStart, lt: dayEnd } }, { scheduledAt: { gte: dayStart, lt: dayEnd } }] },
      ],
    },
  });
}

/** Hitung webinar minggu ini (metadata.isWebinar = true). */
export function countWebinarsThisWeek(userId: string, weekStart: Date): Promise<number> {
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  return db.jumpaRoom.count({
    where: {
      createdById: userId,
      kind: { in: ["KELAS", "GURU"] },
      AND: [
        { OR: [{ endReason: null }, { endReason: { not: "CANCELLED" } }] },
        { OR: [{ scheduledAt: null, createdAt: { gte: weekStart, lt: weekEnd } }, { scheduledAt: { gte: weekStart, lt: weekEnd } }] },
      ],
      events: {
        some: {
          action: "ROOM_CREATED",
          metadata: { path: ["isWebinar"], equals: true },
        },
      },
    },
  });
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
  const isWebinar = Boolean(req.isWebinar);
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
  if (req.kind === "UMUM") return createUmumRoom(user, req);

  const now = Date.now();
  // Fase 3: paket dari pembuat ruang (langganan/trial BC yang sudah ada).
  // Ruang MURID memakai tier pembuat untuk batas 8/15.
  // Murid Premium → ruang MURID 15 orang; webinar & ruang guru tetap tierForPlan.
  const resolved = await resolveJumpaTier(user.id);
  const tier: JumpaTier = isWebinar ? resolved.tier : tierForRoomKind(resolved.plan, req.kind);
  const caps = limitsFor(tier, req.kind, isWebinar);

  if (isWebinar) {
    if (tier !== "PREMIUM") {
      return { ok: false, status: 403, code: "WEBINAR_PREMIUM_ONLY", message: "Webinar hanya untuk guru Premium.", extra: { upgradeUrl: JUMPA_UPGRADE_URL } };
    }
    const weekStart = startOfJakartaWeek(new Date(now));
    const webinarsThisWeek = await countWebinarsThisWeek(user.id, weekStart);
    const weekly = checkWebinarWeeklyQuota(tier, webinarsThisWeek);
    if (!weekly.ok) {
      return { ok: false, status: 429, code: weekly.code, message: weekly.message, extra: { limit: weekly.limit, upgradeUrl: JUMPA_UPGRADE_URL } };
    }
  }

  const scheduled = req.startsAt && req.kind !== "MURID" ? req.startsAt : null;
  // Klik ganda / buka ulang: pakai lagi ruang aktif yang sama milik pembuat.
  // Ruang terjadwal ikut dipakai bila jam mulainya ≤ 15 menit lagi (guru
  // menekan "Mulai JUMPA" di kelas = membuka jadwal hari itu). Jadwal baru
  // tidak pernah memakai ulang ruang.
  const existing = scheduled ? null : await db.jumpaRoom.findFirst({
    where: {
      createdById: user.id,
      kind: req.kind,
      status: { in: ["SCHEDULED", "LIVE"] },
      groupId: req.kind === "GURU" ? null : (group?.id ?? null),
      communityId: req.kind === "GURU" ? (community?.id ?? null) : null,
      // Webinar dan rapat biasa tidak boleh saling memakai ulang ruang.
      ...(isWebinar
        ? { events: { some: { action: "ROOM_CREATED", metadata: { path: ["isWebinar"], equals: true } } } }
        : { NOT: { events: { some: { action: "ROOM_CREATED", metadata: { path: ["isWebinar"], equals: true } } } } }),
      OR: [
        { scheduledAt: null, createdAt: { gt: new Date(now - REUSE_WINDOW_MS) } },
        { scheduledAt: { gt: new Date(now - REUSE_WINDOW_MS), lte: new Date(now + 15 * 60_000) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, title: true, startedAt: true, maxDurationMin: true, scheduledAt: true },
  });
  // Baru upgrade ke Premium? Ruang Gratis lama tidak dipakai ulang.
  // (Ruang terjadwal dengan durasi pilihan guru tetap dipakai.)
  if (existing && (existing.maxDurationMin >= caps.maxDurationMin || existing.scheduledAt)) {
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

  if (req.kind !== "MURID" && !isWebinar) {
    const createdToday = await countRoomsOnDay(user.id, startOfJakartaDay(scheduled ?? new Date(now)));
    const quota = checkDailyQuota(tier, req.kind, createdToday);
    if (!quota.ok) {
      return { ok: false, status: 429, code: quota.code, message: quota.message, extra: { limit: quota.limit, upgradeUrl: JUMPA_UPGRADE_URL } };
    }
  }

  const custom = cleanTitle(req.title);
  const title = (
    isWebinar
      ? custom ?? "Webinar"
      : req.kind === "KELAS"
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
          mode: isWebinar ? "WEBINAR" : req.kind === "KELAS" ? "CLASS" : "MEETING",
          createdById: user.id,
          creatorRole: user.isFounder ? "GURU" : user.role,
          groupId: req.kind === "GURU" ? null : group!.id,
          communityId: req.kind === "GURU" ? (community?.id ?? null) : null,
          maxParticipants: caps.maxParticipants,
          maxDurationMin: scheduled && req.durationMin ? Math.min(req.durationMin, caps.maxDurationMin) : caps.maxDurationMin,
          scheduledAt: scheduled,
          notifyClass: req.kind === "MURID" ? false : req.notifyClass !== false,
          events: {
            create: { actorId: user.id, action: "ROOM_CREATED", metadata: { kind: req.kind, groupId: group?.id ?? null, communityId: community?.id ?? null, scheduledAt: scheduled ? scheduled.toISOString() : null, notifyClass: req.kind === "MURID" ? false : req.notifyClass !== false, tier, isWebinar } },
          },
        },
        select: { id: true, code: true, title: true },
      });
      return { ok: true, room, reused: false, tier };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { ok: false, status: 500, code: "CODE_COLLISION", message: "Gagal membuat ruang. Coba lagi." };
}

// ═══════════════════════ Ruang UMUM (akun umum) ═══════════════════════

/** Ruang UMUM masih memakan slot: belum mulai (≤ 3 jam) atau belum lewat durasi. */
export function isUmumRoomActive(r: { startedAt: Date | null; createdAt: Date; maxDurationMin: number }, now: number): boolean {
  if (r.startedAt) return r.startedAt.getTime() + r.maxDurationMin * 60_000 > now;
  return r.createdAt.getTime() > now - REUSE_WINDOW_MS;
}

/** Kunci advisory supaya cek "1 ruang aktif" + batas global tidak balapan. */
const UMUM_CREATE_LOCK_KEY = 4_202_610_260;

/**
 * Buat ruang UMUM (sudah lolos canCreateRoom → akun UMUM + flag menyala).
 * Paket selalu Gratis UMUM (umumTierDef), tanpa kelas/komunitas/jadwal/webinar.
 * Pagar: pakai ulang ruang aktif sendiri → 1 ruang aktif per akun → kuota
 * harian → batas global env JUMPA_UMUM_MAX_CONCURRENT_ROOMS (default 50).
 */
async function createUmumRoom(user: JumpaUserLike, req: CreateRoomRequest): Promise<CreateRoomResult> {
  if (req.isWebinar) return { ok: false, status: 403, code: "WEBINAR_NOT_AVAILABLE", message: "Webinar belum tersedia untuk akun umum." };
  // Kait UMUM_PREMIUM: selama JUMPA_UMUM_PREMIUM_ENABLED = false, paket UMUM
  // selalu FREE (tidak membaca langganan → pembayaran tidak tersentuh).
  const tier: JumpaTier = "FREE";
  const caps = limitsFor(tier, "UMUM");
  const custom = cleanTitle(req.title);
  const title = (custom ?? "Ruang umum").slice(0, 120);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        await advisoryXactLock(tx, UMUM_CREATE_LOCK_KEY);
        const now = Date.now();
        const mine = await tx.jumpaRoom.findMany({
          where: { createdById: user.id, kind: "UMUM", status: { in: ["SCHEDULED", "LIVE"] } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, code: true, title: true, startedAt: true, createdAt: true, maxDurationMin: true },
        });
        const myActive = mine.filter((r) => isUmumRoomActive(r, now));
        // Klik ganda / buka ulang: ruang aktif sendiri yang masih punya waktu.
        const reuse = myActive.find((r) => {
          const endsAt = roomEndsAt(r.startedAt, r.maxDurationMin);
          return !endsAt || endsAt.getTime() > now + 5 * 60_000;
        });
        if (reuse) return { ok: true as const, room: { id: reuse.id, code: reuse.code, title: reuse.title }, reused: true };

        const createdToday = await tx.jumpaRoom.count({
          where: {
            createdById: user.id,
            kind: "UMUM",
            createdAt: { gte: startOfJakartaDay(new Date(now)), lt: new Date(startOfJakartaDay(new Date(now)).getTime() + 86_400_000) },
          },
        });
        const globalRows = await tx.jumpaRoom.findMany({
          where: { kind: "UMUM", status: { in: ["SCHEDULED", "LIVE"] }, createdAt: { gt: new Date(now - 24 * 3_600_000) } },
          select: { startedAt: true, createdAt: true, maxDurationMin: true },
          take: 20_000,
        });
        const guard = checkUmumCreateGuards({
          myActiveRooms: myActive.length,
          globalActiveRooms: globalRows.filter((r) => isUmumRoomActive(r, now)).length,
          globalCap: umumConcurrentCap(process.env.JUMPA_UMUM_MAX_CONCURRENT_ROOMS),
        });
        // Urutan: 1 ruang aktif → kuota harian → batas global.
        if (!guard.ok && guard.code === "TOO_MANY_ROOMS") return { ok: false as const, status: guard.status, code: guard.code, message: guard.message };
        const quota = checkDailyQuota(tier, "UMUM", createdToday);
        if (!quota.ok) return { ok: false as const, status: 429, code: quota.code, message: quota.message, extra: { limit: quota.limit } };
        if (!guard.ok) return { ok: false as const, status: guard.status, code: guard.code, message: guard.message };

        const room = await tx.jumpaRoom.create({
          data: {
            code: generateRoomCode(),
            livekitRoomName: generateLivekitRoomName(),
            title,
            kind: "UMUM",
            mode: "MEETING",
            createdById: user.id,
            creatorRole: "UMUM",
            groupId: null,
            communityId: null,
            maxParticipants: caps.maxParticipants,
            maxDurationMin: caps.maxDurationMin,
            scheduledAt: null,
            notifyClass: false,
            events: {
              create: { actorId: user.id, action: "ROOM_CREATED", metadata: { kind: "UMUM", groupId: null, communityId: null, scheduledAt: null, notifyClass: false, tier, isWebinar: false } },
            },
          },
          select: { id: true, code: true, title: true },
        });
        return { ok: true as const, room, reused: false, tier };
      });
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
  /** Fase 3: paket ruang (dari pembuat, saat dibuat). */
  tier: JumpaTier;
  /** Alur jadwal: jam mulai (ISO) bila terjadwal. */
  scheduledAt: string | null;
  endReason: string | null;
  groupId: string | null;
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

  const [actor, group, member, participant, host, invites, community, created] = await Promise.all([
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
    db.jumpaEvent.findFirst({ where: { roomId: room.id, action: "ROOM_CREATED" }, orderBy: { createdAt: "asc" }, select: { metadata: true } }),
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

  // Kompatibilitas: webinar yang sempat tersimpan sebagai MEETING tetap dikenali
  // dari metadata penciptaan, tanpa migrasi atau penulisan ulang data lama.
  const createdAsWebinar = Boolean(
    created?.metadata &&
    typeof created.metadata === "object" &&
    (created.metadata as { isWebinar?: unknown }).isWebinar === true
  );
  const effectiveMode = createdAsWebinar ? "WEBINAR" : room.mode;

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
      mode: effectiveMode,
      status: room.status,
      isLocked: room.isLocked,
      startedAt: room.startedAt,
      maxDurationMin: room.maxDurationMin,
      maxParticipants: room.maxParticipants,
      scheduledAt: room.scheduledAt,
      endReason: room.endReason,
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
      mode: effectiveMode,
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
      tier: tierFromCreatedMetadata(created?.metadata),
      scheduledAt: room.scheduledAt ? room.scheduledAt.toISOString() : null,
      endReason: room.endReason,
      groupId: room.groupId,
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
}): Promise<{ startedAt: Date | null; wentLive: boolean }> {
  const now = params.now ?? new Date();
  const [, live, resumed] = await db.$transaction([
    db.jumpaParticipant.upsert({
      where: { roomId_userId: { roomId: params.room.id, userId: params.userId } },
      create: { roomId: params.room.id, userId: params.userId, roomRole: params.roomRole, accessVia: params.accessVia },
      update: { lastTokenAt: now, roomRole: params.roomRole },
    }),
    db.jumpaRoom.updateMany({
      where: { id: params.room.id, status: "SCHEDULED" },
      data: { status: "LIVE", startedAt: now },
    }),
    // Ruang yang ditutup karena kosong dibuka lagi (evaluateJoin sudah memastikan
    // durasinya belum habis). startedAt tetap → batas waktu tidak bertambah.
    db.jumpaRoom.updateMany({
      where: { id: params.room.id, status: "ENDED", endReason: "EMPTY" },
      data: { status: "LIVE", endedAt: null, endReason: null, endedById: null },
    }),
    db.jumpaEvent.create({
      data: { roomId: params.room.id, actorId: params.userId, action: "JOIN_GRANTED", metadata: { roomRole: params.roomRole, accessVia: params.accessVia } },
    }),
  ]);
  const fresh = await db.jumpaRoom.findUnique({ where: { id: params.room.id }, select: { startedAt: true } });
  if (resumed.count > 0) {
    await db.jumpaEvent.create({ data: { roomId: params.room.id, actorId: params.userId, action: "ROOM_RESUMED" } }).catch(() => undefined);
  }
  return { startedAt: fresh?.startedAt ?? null, wentLive: live.count > 0 };
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

// ═════════════════════ Fase 2: beranda /jumpa ═══════════════════════

export interface RoomListItem {
  code: string;
  title: string;
  kind: JumpaRoom["kind"];
  mode: JumpaRoom["mode"];
  status: JumpaRoom["status"];
  place: string | null;
  mine: boolean;
  startedAt: string | null;
  /** Alur jadwal: jam mulai (ISO) bila terjadwal. */
  scheduledAt: string | null;
  /** Fase 3: yang sedang tersambung — hanya inisial (maks 4, tanpa nama lengkap) + jumlah. */
  present: { count: number; initials: string[] };
}

export interface JumpaHomeData {
  effective: JumpaEffectiveRole | null;
  isJunior: boolean;
  rooms: RoomListItem[];
  groups: Array<{ id: string; name: string }>;
  communities: Array<{ id: string; name: string }>;
  canSeePanel: boolean;
  /** Fase 3: paket guru + kuota ruang hari ini (null untuk murid). */
  plan: {
    tier: JumpaTier;
    trialing: boolean;
    roomsToday: number;
    roomsPerDay: number | null;
    kelas: { maxParticipants: number; maxDurationMin: number };
    guru: { maxParticipants: number; maxDurationMin: number };
    upgradeUrl: string;
  } | null;
  /** Akun ber-Role UMUM (apa pun status flag) — UI menyembunyikan ketentuan kelas. */
  umumAccount?: boolean;
  /** Ruang UMUM: batas paket Gratis UMUM + kuota hari ini (null selain akun UMUM). */
  umum?: {
    roomsToday: number;
    roomsPerDay: number | null;
    maxParticipants: number;
    maxDurationMin: number;
    maxCameraHeight: number;
  } | null;
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
    effective === "UMUM"
      ? Promise.resolve([])
      : db.groupMember.findMany({ where: { userId: user.id, group: { isActive: true } }, select: { group: { select: { id: true, name: true } } }, take: 100 }),
    effective === "GURU"
      ? db.communityMember.findMany({ where: { userId: user.id, community: { status: "APPROVED" } }, select: { community: { select: { id: true, name: true } } }, take: 100 })
      : Promise.resolve([]),
  ]);
  const groupIds = [...ownedGroups.map((g) => g.id), ...memberGroups.map((m) => m.group.id)];
  const communityIds = communities.map((c) => c.community.id);

  const visibleKinds: Array<JumpaRoom["kind"]> =
    effective === "UMUM" ? ["UMUM"] : effective === "GURU" ? ["KELAS", "GURU", "MURID"] : actor.isJunior ? ["KELAS"] : ["KELAS", "MURID"];

  const rooms = effective
    ? await db.jumpaRoom.findMany({
        where: {
          status: { in: ["SCHEDULED", "LIVE"] },
          // Instan: dibuat ≤ 24 jam lalu. Terjadwal: jam mulai ≤ 24 jam lalu s.d. 7 hari ke depan.
          AND: [{ OR: [{ scheduledAt: null, createdAt: { gt: since } }, { scheduledAt: { gt: since, lt: new Date(Date.now() + 7 * 86_400_000) } }] }],
          kind: { in: visibleKinds },
          OR: [
            { createdById: user.id },
            ...(groupIds.length ? [{ groupId: { in: groupIds }, kind: { in: ["KELAS", "MURID"] as Array<JumpaRoom["kind"]> } }] : []),
            ...(effective === "GURU" && communityIds.length ? [{ communityId: { in: communityIds } }] : []),
            { invites: { some: { kind: "USER", userId: user.id, revokedAt: null } } },
            // UMUM: ruang orang lain yang pernah dimasuki lewat tautan/kode.
            ...(effective === "UMUM" ? [{ participants: { some: { userId: user.id, removedAt: null } } }] : []),
            ...(groupIds.length ? [{ invites: { some: { kind: "GROUP", groupId: { in: groupIds }, revokedAt: null } } }] : []),
          ],
          // Guru tidak perlu melihat ruang MURID kelas lain; hanya kelas miliknya.
          ...(effective === "GURU" ? { NOT: { kind: "MURID", groupId: { notIn: ownedGroups.map((g) => g.id) } } } : {}),
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 30,
        select: {
          code: true, title: true, kind: true, mode: true, status: true, createdById: true, startedAt: true, scheduledAt: true, groupId: true, communityId: true,
          events: { where: { action: "ROOM_CREATED" }, orderBy: { createdAt: "asc" }, take: 1, select: { metadata: true } },
          participants: {
            where: { removedAt: null, lastJoinedAt: { not: null } },
            orderBy: { lastJoinedAt: "desc" },
            take: 60,
            select: { userId: true, lastJoinedAt: true, lastLeftAt: true },
          },
        },
      })
    : [];

  // Kehadiran dari webhook: tersambung = join terakhir setelah leave terakhir.
  const presentIds = new Map<string, string[]>();
  for (const r of rooms) {
    presentIds.set(r.code, r.participants.filter((p) => p.lastJoinedAt && (!p.lastLeftAt || p.lastLeftAt < p.lastJoinedAt)).map((p) => p.userId));
  }
  const firstIds = [...new Set([...presentIds.values()].flatMap((ids) => ids.slice(0, 4)))];
  const people = firstIds.length
    ? await db.user.findMany({ where: { id: { in: firstIds } }, select: { id: true, fullName: true, nickname: true } })
    : [];
  const toInitials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "P";
  const personInitials = new Map(people.map((u) => [u.id, toInitials(u.nickname || u.fullName || "Peserta")]));

  let plan: JumpaHomeData["plan"] = null;
  if (effective === "GURU") {
    const [t, roomsToday] = await Promise.all([
      resolveJumpaTier(user.id),
      countRoomsOnDay(user.id, startOfJakartaDay(new Date())),
    ]);
    plan = {
      tier: t.tier,
      trialing: t.trialing,
      roomsToday,
      roomsPerDay: JUMPA_TIERS[t.tier].roomsPerDay,
      kelas: limitsFor(t.tier, "KELAS"),
      guru: limitsFor(t.tier, "GURU"),
      upgradeUrl: JUMPA_UPGRADE_URL,
    };
  }

  let umum: JumpaHomeData["umum"] = null;
  if (effective === "UMUM") {
    const def = umumTierDef("FREE");
    umum = {
      roomsToday: await countRoomsOnDay(user.id, startOfJakartaDay(new Date()), ["UMUM"]),
      roomsPerDay: def.roomsPerDay,
      ...limitsFor("FREE", "UMUM"),
      maxCameraHeight: cameraCapFor("FREE", "UMUM"),
    };
  }

  const groupName = new Map([...ownedGroups, ...memberGroups.map((m) => m.group)].map((g) => [g.id, g.name]));
  const commName = new Map(communities.map((c) => [c.community.id, c.community.name]));

  return {
    effective,
    isJunior: actor.isJunior,
    rooms: rooms.map((r) => {
      const createdMetadata = r.events[0]?.metadata;
      const createdAsWebinar = Boolean(
        createdMetadata &&
        typeof createdMetadata === "object" &&
        !Array.isArray(createdMetadata) &&
        "isWebinar" in createdMetadata &&
        createdMetadata.isWebinar === true
      );
      return {
      code: r.code,
      title: r.title,
      kind: r.kind,
      mode: createdAsWebinar ? "WEBINAR" : r.mode,
      status: r.status,
      place: (r.groupId && groupName.get(r.groupId)) || (r.communityId && commName.get(r.communityId)) || null,
      mine: r.createdById === user.id,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
      present: (() => {
        const ids = presentIds.get(r.code) ?? [];
        return { count: ids.length, initials: ids.slice(0, 4).map((id) => personInitials.get(id) ?? "P") };
      })(),
      };
    }),
    groups: effective === "GURU" ? ownedGroups : actor.isJunior || effective === "UMUM" ? [] : memberGroups.map((m) => m.group),
    communities: communities.map((c) => c.community),
    canSeePanel: user.role === "ADMIN" || user.isFounder || effective === "GURU",
    plan,
    umum,
    umumAccount: user.role === "UMUM",
  };
}

