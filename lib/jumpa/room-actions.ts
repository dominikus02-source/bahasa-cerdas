/**
 * JUMPA Fase 2 — kontrol host, obrolan, laporan, undangan (DB + LiveKit).
 *
 * Setiap aksi: muat konteks → keputusan murni di permissions.ts → tulis DB
 * (sumber kebenaran) → baru siarkan/eksekusi di LiveKit dengan kunci API
 * server. Klien tidak pernah memegang izin admin LiveKit.
 */
import type { JumpaRoom, JumpaRoomRole } from "@prisma/client";
import { db } from "@/lib/db";
import { linkInviteExpiry } from "./caps";
import { sanitizeChatContent, toChatView, type ChatView } from "./chat";
import { generateInviteToken, hashInviteToken } from "./code";
import { attendanceOnLeave, isAttending } from "./lifecycle";
import {
  deleteLivekitRoom,
  listLivekitIdentities,
  muteParticipantSource,
  removeLivekitParticipant,
  sendServerSignal,
  updateLivekitParticipant,
} from "./livekit";
import {
  canDeleteChat,
  canInvite,
  canModerate,
  canViewRoomLogs,
  effectiveRole,
  JUMPA_REPORT_CATEGORIES,
  publishSourcesFor,
  reportRecipients,
  TARGETED_ACTIONS,
  type JumpaEffectiveRole,
  type JumpaInviteKind,
  type JumpaModerationAction,
  type JumpaReportCategory,
  type ModerationActor,
} from "./permissions";
import { displayNames, effectiveRoleOf, loadActor, type JumpaUserLike } from "./service";
import { JUMPA_TOPICS } from "./signals";
import { buildParticipantPermission } from "./token";
import { deliverRoomNotice } from "./notify-server";

export type ActionResult<T = Record<string, unknown>> =
  | ({ ok: true } & T)
  | { ok: false; status: number; code: string; message: string };

const fail = (status: number, code: string, message: string) => ({ ok: false as const, status, code, message });
const NOT_FOUND = fail(404, "NOT_FOUND", "Ruang tidak ditemukan.");
const NOT_IN_ROOM = fail(403, "NOT_IN_ROOM", "Kamu belum bergabung di ruang ini.");

async function logEvent(roomId: string, actorId: string | null, action: string, metadata?: Record<string, unknown>) {
  try {
    await db.jumpaEvent.create({ data: { roomId, actorId, action, metadata: (metadata ?? undefined) as never } });
  } catch {
    // Audit best-effort.
  }
}

interface ActorInRoom {
  room: JumpaRoom;
  actor: ModerationActor;
}

/** Peserta aktif (pernah dapat token, belum dikeluarkan) + peran efektifnya. */
async function actorInRoom(user: JumpaUserLike, room: JumpaRoom): Promise<ActorInRoom | null> {
  const [actor, participant] = await Promise.all([
    loadActor(user),
    db.jumpaParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId: user.id } }, select: { roomRole: true, removedAt: true } }),
  ]);
  const effective = effectiveRole(actor);
  if (!effective) return null;
  // Alur jadwal: pembuat ruang terjadwal boleh mengundang/membagikan sebelum
  // pernah masuk (belum ada baris peserta) — tetap sebagai HOST.
  if (!participant && room.createdById === user.id) return { room, actor: { userId: user.id, roomRole: "HOST", effective } };
  if (!participant || participant.removedAt) return null;
  return { room, actor: { userId: user.id, roomRole: participant.roomRole, effective } };
}

function patchMetadataRole(raw: string, roomRole: JumpaRoomRole): string {
  try {
    const m = JSON.parse(raw) as Record<string, unknown>;
    return JSON.stringify({ ...m, roomRole });
  } catch {
    return raw;
  }
}

// ═══════════════════════════════ Akhiri ruang ═════════════════════════════

export type EndReason = "HOST" | "TIME_LIMIT" | "EMPTY" | "STALE";

/**
 * Akhiri ruang untuk semua (dipakai host & cron sweep). Idempoten:
 * hanya transisi pertama yang menyiarkan/menutup LiveKit.
 */
export async function endRoomForAll(room: Pick<JumpaRoom, "id" | "livekitRoomName">, reason: EndReason, actorId: string | null, now = new Date()): Promise<boolean> {
  const updated = await db.jumpaRoom.updateMany({
    where: { id: room.id, status: { not: "ENDED" } },
    data: { status: "ENDED", endedAt: now, endReason: reason, endedById: actorId },
  });
  if (updated.count === 0) return false;
  await sendServerSignal(room.livekitRoomName, JUMPA_TOPICS.room, { t: "room.ended", reason });
  try {
    await deleteLivekitRoom(room.livekitRoomName);
  } catch (error) {
    // emptyTimeout LiveKit tetap menutup ruang; token baru sudah ditolak (status ENDED).
    console.error("JUMPA_DELETE_ROOM_FAILED", { error: error instanceof Error ? error.message : String(error) });
  }
  await closeAttendance(room.id, now);
  await logEvent(room.id, actorId, "ROOM_ENDED", { reason });
  return true;
}

/** Tutup sesi kehadiran yang masih terbuka (webhook leave bisa terlambat/hilang). */
export async function closeAttendance(roomId: string, at: Date): Promise<void> {
  const open = await db.jumpaParticipant.findMany({
    where: { roomId, lastJoinedAt: { not: null } },
    select: { id: true, lastJoinedAt: true, lastLeftAt: true, totalSeconds: true, joinCount: true },
  });
  for (const p of open.filter(isAttending)) {
    const next = attendanceOnLeave(p, at);
    await db.jumpaParticipant.update({ where: { id: p.id }, data: { lastLeftAt: next.lastLeftAt, totalSeconds: next.totalSeconds } });
  }
}

// ═══════════════════════════════ Moderasi ═════════════════════════════════

export async function moderate(
  user: JumpaUserLike,
  code: string,
  action: JumpaModerationAction,
  targetUserId: string | null,
): Promise<ActionResult<{ room: { isLocked: boolean; chatEnabled: boolean; allowMuridScreenShare: boolean; status: string } }>> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return NOT_FOUND;
  if (room.status === "ENDED") return fail(410, "ROOM_ENDED", "Ruang ini sudah berakhir.");
  const me = await actorInRoom(user, room);
  if (!me) return NOT_IN_ROOM;

  let target: { userId: string; roomRole: JumpaRoomRole; effective: JumpaEffectiveRole } | null = null;
  if (TARGETED_ACTIONS.includes(action)) {
    if (!targetUserId) return fail(400, "BAD_TARGET", "Peserta sasaran wajib dipilih.");
    const [tp, te] = await Promise.all([
      db.jumpaParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId: targetUserId } }, select: { roomRole: true, removedAt: true } }),
      effectiveRoleOf(targetUserId),
    ]);
    if (!tp || tp.removedAt || !te?.effective) return fail(404, "BAD_TARGET", "Peserta tidak ditemukan di ruang ini.");
    target = { userId: targetUserId, roomRole: tp.roomRole, effective: te.effective };
  }

  const decision = canModerate({ actor: me.actor, action, roomKind: room.kind, target });
  if (!decision.ok) return fail(403, decision.code, decision.message);

  const lk = room.livekitRoomName;
  let next = { isLocked: room.isLocked, chatEnabled: room.chatEnabled, allowMuridScreenShare: room.allowMuridScreenShare, status: room.status as string };

  try {
    switch (action) {
      case "MUTE_AUDIO":
      case "MUTE_VIDEO":
      case "STOP_SCREEN": {
        const source = action === "MUTE_AUDIO" ? "microphone" : action === "MUTE_VIDEO" ? "camera" : "screen_share";
        await muteParticipantSource(lk, target!.userId, source);
        await sendServerSignal(lk, JUMPA_TOPICS.moderation, { t: "mod.muted", source }, [target!.userId]);
        break;
      }
      case "REMOVE": {
        await db.jumpaParticipant.update({
          where: { roomId_userId: { roomId: room.id, userId: target!.userId } },
          data: { removedAt: new Date(), removedById: user.id },
        });
        await sendServerSignal(lk, JUMPA_TOPICS.moderation, { t: "mod.removed" }, [target!.userId]);
        await removeLivekitParticipant(lk, target!.userId);
        break;
      }
      case "LOCK":
      case "UNLOCK": {
        const isLocked = action === "LOCK";
        await db.jumpaRoom.update({ where: { id: room.id }, data: { isLocked } });
        next = { ...next, isLocked };
        await sendServerSignal(lk, JUMPA_TOPICS.room, { t: "room.locked", locked: isLocked });
        break;
      }
      case "END": {
        await endRoomForAll(room, "HOST", user.id);
        next = { ...next, status: "ENDED" };
        break;
      }
      case "TOGGLE_CHAT": {
        const chatEnabled = !room.chatEnabled;
        await db.jumpaRoom.update({ where: { id: room.id }, data: { chatEnabled } });
        next = { ...next, chatEnabled };
        await sendServerSignal(lk, JUMPA_TOPICS.room, { t: "room.chat", enabled: chatEnabled });
        break;
      }
      case "ALLOW_MURID_SCREEN":
      case "DISALLOW_MURID_SCREEN": {
        const allow = action === "ALLOW_MURID_SCREEN";
        await db.jumpaRoom.update({ where: { id: room.id }, data: { allowMuridScreenShare: allow } });
        next = { ...next, allowMuridScreenShare: allow };
        // Terapkan ke murid yang sedang tersambung (izin atomik di LiveKit).
        const connected = await listLivekitIdentities(lk);
        for (const p of connected) {
          let meta: { bcRole?: string; roomRole?: JumpaRoomRole } = {};
          try {
            meta = JSON.parse(p.metadata || "{}");
          } catch {
            continue;
          }
          if (meta.bcRole !== "MURID") continue;
          const sources = publishSourcesFor(meta.roomRole ?? "MEMBER", "MURID", { kind: room.kind, allowMuridScreenShare: allow });
          await updateLivekitParticipant(lk, p.identity, { permission: buildParticipantPermission(sources) });
        }
        await sendServerSignal(lk, JUMPA_TOPICS.room, { t: "room.screen", allowMurid: allow });
        break;
      }
      case "SET_COHOST":
      case "UNSET_COHOST": {
        const roomRole: JumpaRoomRole = action === "SET_COHOST" ? "COHOST" : "MEMBER";
        await db.jumpaParticipant.update({ where: { roomId_userId: { roomId: room.id, userId: target!.userId } }, data: { roomRole } });
        const connected = (await listLivekitIdentities(lk)).find((p) => p.identity === target!.userId);
        if (connected) await updateLivekitParticipant(lk, target!.userId, { metadata: patchMetadataRole(connected.metadata, roomRole) });
        await sendServerSignal(lk, JUMPA_TOPICS.room, { t: "room.role", userId: target!.userId, roomRole });
        break;
      }
      case "DELETE_CHAT":
        return fail(400, "BAD_ACTION", "Gunakan endpoint hapus pesan.");
    }
  } catch (error) {
    console.error("JUMPA_MODERATION_FAILED", { action, error: error instanceof Error ? error.message : String(error) });
    return fail(503, "MEDIA_UNAVAILABLE", "Server video sedang tidak bisa dihubungi. Coba lagi sebentar.");
  }

  if (action !== "END") await logEvent(room.id, user.id, `MOD_${action}`, target ? { targetUserId: target.userId } : undefined);
  return { ok: true, room: next };
}

// ═══════════════════════════════ Obrolan ══════════════════════════════════

export async function listChat(user: JumpaUserLike, code: string): Promise<ActionResult<{ messages: ChatView[]; chatEnabled: boolean }>> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return NOT_FOUND;
  const me = await actorInRoom(user, room);
  if (!me) return NOT_IN_ROOM;
  const rows = await db.jumpaChatMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, userId: true, content: true, createdAt: true, deletedAt: true },
  });
  const names = await displayNames(rows.map((r) => r.userId));
  return {
    ok: true,
    chatEnabled: room.chatEnabled,
    messages: rows.reverse().map((r) => toChatView(r, names.get(r.userId) ?? "Pengguna BC")),
  };
}

export async function sendChat(user: JumpaUserLike, code: string, rawContent: unknown): Promise<ActionResult<{ message: ChatView }>> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return NOT_FOUND;
  if (room.status !== "LIVE") return fail(410, "ROOM_ENDED", "Ruang ini sudah berakhir.");
  const me = await actorInRoom(user, room);
  if (!me) return NOT_IN_ROOM;
  const isGuruHost = me.actor.effective === "GURU" && me.actor.roomRole !== "MEMBER";
  if (!room.chatEnabled && !isGuruHost) return fail(423, "CHAT_DISABLED", "Obrolan sedang dimatikan oleh pemandu.");

  const v = sanitizeChatContent(rawContent);
  if (!v.ok) return fail(400, v.code, v.message);

  // Simpan dulu (sumber kebenaran & bahan laporan), baru siarkan.
  const row = await db.jumpaChatMessage.create({
    data: { roomId: room.id, userId: user.id, content: v.content },
    select: { id: true, userId: true, content: true, createdAt: true, deletedAt: true },
  });
  const names = await displayNames([user.id]);
  const message = toChatView(row, names.get(user.id) ?? "Pengguna BC");
  await sendServerSignal(room.livekitRoomName, JUMPA_TOPICS.chat, { t: "chat.new", message });
  return { ok: true, message };
}

export async function deleteChat(user: JumpaUserLike, messageId: string): Promise<ActionResult> {
  const msg = await db.jumpaChatMessage.findUnique({ where: { id: messageId }, include: { room: true } });
  if (!msg) return fail(404, "NOT_FOUND", "Pesan tidak ditemukan.");
  if (msg.deletedAt) return { ok: true };
  const me = await actorInRoom(user, msg.room);
  if (!me) return NOT_IN_ROOM;
  const decision = canDeleteChat({ actor: me.actor, messageUserId: msg.userId, roomKind: msg.room.kind });
  if (!decision.ok) return fail(403, decision.code, decision.message);
  await db.jumpaChatMessage.update({ where: { id: msg.id }, data: { deletedAt: new Date(), deletedById: user.id } });
  await sendServerSignal(msg.room.livekitRoomName, JUMPA_TOPICS.chat, { t: "chat.deleted", id: msg.id });
  if (msg.userId !== user.id) await logEvent(msg.roomId, user.id, "CHAT_DELETED", { messageId: msg.id, authorId: msg.userId });
  return { ok: true };
}

// ═══════════════════════════════ Laporan ══════════════════════════════════

export async function createReport(
  user: JumpaUserLike,
  code: string,
  input: { category?: unknown; description?: unknown; reportedUserId?: unknown },
): Promise<ActionResult<{ reportId: string }>> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return NOT_FOUND;
  // Pelapor cukup pernah tercatat sebagai peserta — termasuk yang
  // dikeluarkan (anak yang dikeluarkan tetap harus bisa melapor).
  const participant = await db.jumpaParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId: user.id } }, select: { id: true } });
  if (!participant) return NOT_IN_ROOM;

  const category = typeof input.category === "string" && input.category in JUMPA_REPORT_CATEGORIES ? (input.category as JumpaReportCategory) : null;
  if (!category) return fail(400, "BAD_CATEGORY", "Pilih alasan laporan.");
  const description = typeof input.description === "string" ? input.description.replace(/<\/?[a-z][^>]*>/gi, "").trim().slice(0, 1000) || null : null;
  let reportedUserId: string | null = null;
  if (typeof input.reportedUserId === "string" && input.reportedUserId && input.reportedUserId !== user.id) {
    const p = await db.jumpaParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId: input.reportedUserId } }, select: { userId: true } });
    reportedUserId = p?.userId ?? null;
  }

  // Cuplikan 50 pesan terakhir (termasuk yang sudah dihapus) — disimpan
  // di laporan supaya bukti tidak hilang walau retensi obrolan berjalan.
  const recent = await db.jumpaChatMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, userId: true, content: true, createdAt: true, deletedAt: true },
  });
  const names = await displayNames(recent.map((m) => m.userId));
  const chatSnapshot = recent.reverse().map((m) => ({
    id: m.id,
    userId: m.userId,
    name: names.get(m.userId) ?? "Pengguna BC",
    content: m.content,
    deleted: Boolean(m.deletedAt),
    at: m.createdAt.toISOString(),
  }));

  const report = await db.jumpaReport.create({
    data: { roomId: room.id, reporterId: user.id, reportedUserId, category, description, chatSnapshot },
    select: { id: true },
  });
  await logEvent(room.id, user.id, "REPORT_CREATED", { reportId: report.id, category });

  try {
    const [group, admins, creator] = await Promise.all([
      room.groupId ? db.group.findUnique({ where: { id: room.groupId }, select: { teacherId: true } }) : Promise.resolve(null),
      db.user.findMany({ where: { OR: [{ role: "ADMIN" }, { isFounder: true }] }, select: { id: true }, take: 25 }),
      effectiveRoleOf(room.createdById),
    ]);
    const recipients = reportRecipients({
      groupTeacherId: group?.teacherId ?? null,
      creatorId: room.createdById,
      creatorEffective: creator?.effective ?? "MURID",
      adminIds: admins.map((a) => a.id),
      reporterId: user.id,
    });
    // Pemandu guru ruang ini selalu ikut diberi tahu (selain guru kelas & admin).
    if (creator?.effective === "GURU" && room.createdById !== user.id && !recipients.includes(room.createdById)) recipients.push(room.createdById);
    if (recipients.length) {
      // In-app + Web Push lewat sistem notifikasi platform (sekali per laporan).
      await deliverRoomNotice(
        { id: room.id, code: room.code, title: room.title, kind: room.kind, groupId: room.groupId, communityId: room.communityId, createdById: room.createdById, scheduledAt: room.scheduledAt, notifyClass: true },
        "REPORT", // penerima eksplisit (guru/admin) — tidak terpengaruh "Beri tahu kelas"
        { variant: report.id, recipients, category: JUMPA_REPORT_CATEGORIES[category] },
      );
    }
  } catch (error) {
    // Laporan sudah tersimpan & terlihat di panel; notifikasi best-effort.
    console.error("JUMPA_REPORT_NOTIFY_FAILED", { error: error instanceof Error ? error.message : String(error) });
  }
  return { ok: true, reportId: report.id };
}

export async function reviewReport(user: JumpaUserLike, reportId: string, status: "REVIEWED" | "DISMISSED" | "OPEN"): Promise<ActionResult> {
  const report = await db.jumpaReport.findUnique({ where: { id: reportId }, include: { room: { select: { createdById: true, groupId: true } } } });
  if (!report) return fail(404, "NOT_FOUND", "Laporan tidak ditemukan.");
  const group = report.room.groupId ? await db.group.findUnique({ where: { id: report.room.groupId }, select: { teacherId: true } }) : null;
  if (!canViewRoomLogs({ userId: user.id, role: user.role, isFounder: user.isFounder }, { createdById: report.room.createdById, groupTeacherId: group?.teacherId ?? null })) {
    return fail(403, "NOT_ALLOWED", "Kamu tidak punya izin untuk laporan ini.");
  }
  await db.jumpaReport.update({
    where: { id: reportId },
    data: status === "OPEN" ? { status, reviewedById: null, reviewedAt: null } : { status, reviewedById: user.id, reviewedAt: new Date() },
  });
  await logEvent(report.roomId, user.id, "REPORT_STATUS", { reportId, status });
  return { ok: true };
}

// ═══════════════════════════════ Undangan ═════════════════════════════════

export interface InviteCandidates {
  groups: Array<{ id: string; name: string; members: number; invited: boolean }>;
  communities: Array<{ id: string; name: string; members: number; invited: boolean }>;
  canLink: boolean;
  canInviteUsers: boolean;
}

async function hostActor(user: JumpaUserLike, code: string): Promise<ActionResult<ActorInRoom>> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return NOT_FOUND;
  if (room.status === "ENDED") return fail(410, "ROOM_ENDED", "Ruang ini sudah berakhir.");
  const me = await actorInRoom(user, room);
  if (!me) return NOT_IN_ROOM;
  return { ok: true, ...me };
}

export async function inviteCandidates(user: JumpaUserLike, code: string): Promise<ActionResult<InviteCandidates>> {
  const h = await hostActor(user, code);
  if (!h.ok) return h;
  const { room, actor } = h;
  const base = canInvite({ actor, roomKind: room.kind, invite: { kind: "USER", targetEffective: "GURU" } });
  if (!base.ok) return fail(403, base.code, base.message);
  const existing = await db.jumpaInvite.findMany({ where: { roomId: room.id, revokedAt: null }, select: { kind: true, groupId: true, communityId: true } });
  const invitedGroups = new Set(existing.filter((i) => i.kind === "GROUP").map((i) => i.groupId));
  const invitedComms = new Set(existing.filter((i) => i.kind === "COMMUNITY").map((i) => i.communityId));

  const [groups, communities] = await Promise.all([
    room.kind === "KELAS"
      ? db.group.findMany({
          where: { teacherId: user.id, isActive: true, id: room.groupId ? { not: room.groupId } : undefined },
          select: { id: true, name: true, _count: { select: { members: true } } },
          orderBy: { name: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    room.kind === "GURU"
      ? db.communityMember.findMany({
          where: { userId: user.id, community: { status: "APPROVED" } },
          select: { community: { select: { id: true, name: true, _count: { select: { members: true } } } } },
          take: 50,
        })
      : Promise.resolve([]),
  ]);
  return {
    ok: true,
    groups: groups.map((g) => ({ id: g.id, name: g.name, members: g._count.members, invited: invitedGroups.has(g.id) })),
    communities: communities
      .map((c) => c.community)
      .filter((c) => c.id !== room.communityId)
      .map((c) => ({ id: c.id, name: c.name, members: c._count.members, invited: invitedComms.has(c.id) })),
    canLink: room.kind === "GURU",
    canInviteUsers: true,
  };
}

/** Cari guru (ruang GURU/KELAS) atau murid di kelas host (ruang KELAS). */
export async function searchInvitees(user: JumpaUserLike, code: string, q: string): Promise<ActionResult<{ users: Array<{ id: string; name: string; role: "GURU" | "MURID" }> }>> {
  const h = await hostActor(user, code);
  if (!h.ok) return h;
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return { ok: true, users: [] };
  const allowMurid = h.room.kind === "KELAS";
  const nameMatch = { OR: [{ fullName: { contains: term, mode: "insensitive" as const } }, { nickname: { contains: term, mode: "insensitive" as const } }] };
  const rows = await db.user.findMany({
    where: {
      id: { not: user.id },
      AND: [
        nameMatch,
        allowMurid
          ? { OR: [{ role: "GURU" }, { role: "MURID", groupMemberships: { some: { group: { teacherId: user.id, isActive: true } } }, arenaJuniorAkun: null }] }
          : { role: "GURU" },
      ],
    },
    select: { id: true, fullName: true, nickname: true, role: true },
    take: 10,
  });
  return {
    ok: true,
    users: rows.map((r) => ({ id: r.id, name: r.nickname || r.fullName || "Pengguna BC", role: r.role === "MURID" ? "MURID" : "GURU" })),
  };
}

export async function createInvite(
  user: JumpaUserLike,
  code: string,
  input: { kind: JumpaInviteKind; groupId?: string; communityId?: string; userId?: string },
): Promise<ActionResult<{ inviteId: string; path?: string; notified: number }>> {
  const h = await hostActor(user, code);
  if (!h.ok) return h;
  const { room, actor } = h;
  const now = new Date();

  let notifyIds: string[] = [];
  let data: { kind: JumpaInviteKind; groupId?: string; communityId?: string; userId?: string; tokenHash?: string; expiresAt?: Date } = { kind: input.kind };
  let path: string | undefined;

  if (input.kind === "GROUP") {
    if (!input.groupId) return fail(400, "BAD_TARGET", "Pilih kelas.");
    const group = await db.group.findUnique({ where: { id: input.groupId }, select: { id: true, teacherId: true, isActive: true } });
    if (!group) return fail(404, "BAD_TARGET", "Kelas tidak ditemukan.");
    const d = canInvite({ actor, roomKind: room.kind, invite: { kind: "GROUP", ownsGroup: group.teacherId === user.id, groupActive: group.isActive } });
    if (!d.ok) return fail(403, d.code, d.message);
    data = { kind: "GROUP", groupId: group.id };
    const members = await db.groupMember.findMany({ where: { groupId: group.id, user: { arenaJuniorAkun: null } }, select: { userId: true }, take: 300 });
    notifyIds = members.map((m) => m.userId);
  } else if (input.kind === "COMMUNITY") {
    if (!input.communityId) return fail(400, "BAD_TARGET", "Pilih komunitas.");
    const [community, membership] = await Promise.all([
      db.community.findUnique({ where: { id: input.communityId }, select: { id: true, status: true } }),
      db.communityMember.findUnique({ where: { communityId_userId: { communityId: input.communityId, userId: user.id } }, select: { id: true } }),
    ]);
    if (!community) return fail(404, "BAD_TARGET", "Komunitas tidak ditemukan.");
    const d = canInvite({ actor, roomKind: room.kind, invite: { kind: "COMMUNITY", isCommunityMember: Boolean(membership), communityApproved: community.status === "APPROVED" } });
    if (!d.ok) return fail(403, d.code, d.message);
    data = { kind: "COMMUNITY", communityId: community.id };
    const members = await db.communityMember.findMany({ where: { communityId: community.id, user: { role: "GURU" } }, select: { userId: true }, take: 300 });
    notifyIds = members.map((m) => m.userId);
  } else if (input.kind === "USER") {
    if (!input.userId || input.userId === user.id) return fail(400, "BAD_TARGET", "Pilih orang yang diundang.");
    const target = await effectiveRoleOf(input.userId);
    if (!target) return fail(404, "BAD_TARGET", "Pengguna tidak ditemukan.");
    const inMyGroups = target.effective === "MURID"
      ? Boolean(await db.groupMember.findFirst({ where: { userId: input.userId, group: { teacherId: user.id, isActive: true } }, select: { id: true } }))
      : false;
    const d = canInvite({ actor, roomKind: room.kind, invite: { kind: "USER", targetEffective: target.effective, targetIsJunior: target.isJunior, targetInActorGroups: inMyGroups } });
    if (!d.ok) return fail(403, d.code, d.message);
    data = { kind: "USER", userId: input.userId };
    notifyIds = [input.userId];
  } else if (input.kind === "LINK") {
    const d = canInvite({ actor, roomKind: room.kind, invite: { kind: "LINK" } });
    if (!d.ok) return fail(403, d.code, d.message);
    const token = generateInviteToken();
    data = { kind: "LINK", tokenHash: hashInviteToken(token), expiresAt: linkInviteExpiry(now, room.scheduledAt) };
    path = `/jumpa/${room.code}?u=${token}`;
  } else {
    return fail(400, "BAD_TARGET", "Jenis undangan tidak dikenal.");
  }

  // Undangan sama yang masih aktif → pakai lagi (tanpa notifikasi ulang).
  if (data.kind !== "LINK") {
    const dup = await db.jumpaInvite.findFirst({
      where: { roomId: room.id, kind: data.kind, groupId: data.groupId ?? null, communityId: data.communityId ?? null, userId: data.userId ?? null, revokedAt: null },
      select: { id: true },
    });
    if (dup) return { ok: true, inviteId: dup.id, notified: 0 };
  }

  const invite = await db.jumpaInvite.create({ data: { roomId: room.id, createdById: user.id, ...data }, select: { id: true } });
  await logEvent(room.id, user.id, "INVITE_CREATED", { kind: data.kind, groupId: data.groupId, communityId: data.communityId, userId: data.userId });

  const recipients = notifyIds.filter((id) => id !== user.id);
  if (recipients.length) {
    try {
      const names = await displayNames([user.id]);
      await db.notifikasi.createMany({
        data: recipients.map((userId) => ({
          userId,
          title: "Undangan JUMPA",
          body: `${names.get(user.id) ?? "Guru"} mengajakmu bergabung: ${room.title}`,
          type: "info",
          data: { link: `/jumpa/${room.code}` },
        })),
      });
    } catch (error) {
      console.error("JUMPA_INVITE_NOTIFY_FAILED", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { ok: true, inviteId: invite.id, path, notified: recipients.length };
}
