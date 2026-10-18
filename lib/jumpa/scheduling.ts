/**
 * JUMPA — alur penuh (DB): jadwal, ubah/batal jadwal, pengingat cron,
 * riwayat ruang, panel kelas, kartu beranda, ringkasan setelah rapat.
 * Aturan murni: schedule.ts (jadwal), permissions.ts (izin), notify.ts (teks).
 */
import type { JumpaRoom } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveJumpaTier } from "./entitlement";
import { isAttending } from "./lifecycle";
import { deliverRoomNotice, NOTICE_ROOM_SELECT } from "./notify-server";
import { canInvite, canViewRoomLogs, effectiveRole, type JumpaEffectiveRole } from "./permissions";
import { canManageSchedule, canSchedule, durationChoices, JUMPA_SCHEDULE_MAX_USERS, reminderDue, validateSchedule } from "./schedule";
import { cleanTitle, countRoomsOnDay, createRoom, effectiveRoleOf, loadActor, type JumpaUserLike } from "./service";
import { JUMPA_TIERS, limitsFor, startOfJakartaDay, type JumpaTier } from "./tiers";

type Fail = { ok: false; status: number; code: string; message: string; extra?: Record<string, unknown> };
const fail = (status: number, code: string, message: string, extra?: Record<string, unknown>): Fail => ({ ok: false, status, code, message, extra });

// ═══════════════════════════════ Jadwalkan ════════════════════════════════

export interface ScheduleRequest {
  kind: "KELAS" | "GURU";
  groupId?: string | null;
  communityId?: string | null;
  title?: string | null;
  date: string;
  time: string;
  durationMin: number;
  /** Kelas tambahan milik guru (ruang KELAS). */
  extraGroupIds?: string[];
  /** Orang tertentu (guru rekan, atau murid dari kelas guru). */
  userIds?: string[];
}

export type ScheduleResult =
  | { ok: true; code: string; title: string; scheduledAt: string; durationMin: number; invited: number }
  | Fail;

/** Hapus duplikat & batasi daftar id. */
function ids(list: string[] | undefined, max: number): string[] {
  return [...new Set((list ?? []).filter((x) => typeof x === "string" && x.length > 0 && x.length <= 64))].slice(0, max);
}

export async function scheduleRoom(user: JumpaUserLike, req: ScheduleRequest, now = new Date()): Promise<ScheduleResult> {
  const actor = await loadActor(user);
  const can = canSchedule(actor, req.kind);
  if (!can.ok) return fail(403, can.code, can.message);

  const userIds = ids(req.userIds, JUMPA_SCHEDULE_MAX_USERS).filter((id) => id !== user.id);
  const extraGroupIds = req.kind === "KELAS" ? ids(req.extraGroupIds, 10).filter((g) => g !== req.groupId) : [];
  const { tier } = await resolveJumpaTier(user.id);
  const v = validateSchedule({
    date: req.date,
    time: req.time,
    durationMin: req.durationMin,
    tier,
    kind: req.kind,
    hasAudience: req.kind === "KELAS" ? Boolean(req.groupId) : Boolean(req.communityId) || userIds.length > 0,
    now,
  });
  if (!v.ok) return fail(400, v.code, v.message);

  // Undangan divalidasi SEBELUM ruang dibuat (tidak ada ruang setengah jadi).
  const host = { userId: user.id, roomRole: "HOST" as const, effective: "GURU" as const };
  const groups = extraGroupIds.length
    ? await db.group.findMany({ where: { id: { in: extraGroupIds } }, select: { id: true, teacherId: true, isActive: true } })
    : [];
  for (const gid of extraGroupIds) {
    const g = groups.find((x) => x.id === gid);
    const d = canInvite({ actor: host, roomKind: req.kind, invite: { kind: "GROUP", ownsGroup: g?.teacherId === user.id, groupActive: Boolean(g?.isActive) } });
    if (!d.ok) return fail(403, d.code, d.message);
  }
  for (const uid of userIds) {
    const target = await effectiveRoleOf(uid);
    const inMyGroups = target?.effective === "MURID"
      ? Boolean(await db.groupMember.findFirst({ where: { userId: uid, group: { teacherId: user.id, isActive: true } }, select: { id: true } }))
      : false;
    const d = canInvite({ actor: host, roomKind: req.kind, invite: { kind: "USER", targetEffective: target?.effective ?? null, targetIsJunior: target?.isJunior, targetInActorGroups: inMyGroups } });
    if (!d.ok) return fail(403, d.code, d.message);
  }

  const created = await createRoom(user, {
    kind: req.kind,
    groupId: req.kind === "KELAS" ? req.groupId : null,
    communityId: req.kind === "GURU" ? req.communityId : null,
    title: cleanTitle(req.title),
    startsAt: v.startsAt,
    durationMin: v.durationMin,
  });
  if (!created.ok) {
    // Kuota dihitung per hari jadwal, bukan "hari ini".
    const message = created.code === "TIER_DAILY_LIMIT" && typeof created.extra?.limit === "number" ? `Kuota ${created.extra.limit} ruang di hari itu sudah habis. Pilih hari lain.` : created.message;
    return fail(created.status, created.code, message, created.extra);
  }

  const room = await db.jumpaRoom.findUniqueOrThrow({ where: { id: created.room.id }, select: NOTICE_ROOM_SELECT });
  const inviteRows = [
    ...extraGroupIds.map((groupId) => ({ roomId: room.id, kind: "GROUP", groupId, createdById: user.id })),
    ...userIds.map((userId) => ({ roomId: room.id, kind: "USER", userId, createdById: user.id })),
  ];
  if (inviteRows.length) await db.jumpaInvite.createMany({ data: inviteRows });
  await db.jumpaEvent.create({ data: { roomId: room.id, actorId: user.id, action: "ROOM_SCHEDULED", metadata: { scheduledAt: v.startsAt.toISOString(), durationMin: v.durationMin, groups: extraGroupIds.length, users: userIds.length } } });

  const sent = await deliverRoomNotice(room, "SCHEDULED", { now });
  return { ok: true, code: room.code, title: room.title, scheduledAt: v.startsAt.toISOString(), durationMin: v.durationMin, invited: sent.recipients };
}

/** Ubah jam/durasi jadwal (pembuat, sebelum mulai). Penerima dapat "Jadwal JUMPA berubah". */
export async function rescheduleRoom(user: JumpaUserLike, code: string, input: { date: string; time: string; durationMin: number }, now = new Date()): Promise<ScheduleResult> {
  const room = await db.jumpaRoom.findUnique({ where: { code } });
  if (!room) return fail(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  const m = canManageSchedule({ actorId: user.id, createdById: room.createdById, status: room.status });
  if (!m.ok) return fail(403, m.code, m.message);
  if (room.kind === "MURID") return fail(400, "KIND_NOT_SCHEDULABLE", "Ruang belajar bareng tidak bisa dijadwalkan.");
  const { tier } = await resolveJumpaTier(user.id);
  const v = validateSchedule({ ...input, tier, kind: room.kind, hasAudience: true, now });
  if (!v.ok) return fail(400, v.code, v.message);
  // Pindah ke hari lain: cek kuota hari tujuan (ruang ini sendiri tidak dihitung dua kali).
  const sameDay = room.scheduledAt && startOfJakartaDay(room.scheduledAt).getTime() === startOfJakartaDay(v.startsAt).getTime();
  const perDay = JUMPA_TIERS[tier].roomsPerDay;
  if (!sameDay && perDay !== null && (await countRoomsOnDay(user.id, startOfJakartaDay(v.startsAt))) >= perDay) {
    return fail(429, "TIER_DAILY_LIMIT", `Kuota ${perDay} ruang di hari itu sudah habis. Pilih hari lain.`);
  }
  const updated = await db.jumpaRoom.update({
    where: { id: room.id },
    data: { scheduledAt: v.startsAt, maxDurationMin: Math.min(v.durationMin, limitsFor(tier, room.kind).maxDurationMin) },
    select: NOTICE_ROOM_SELECT,
  });
  await db.jumpaEvent.create({ data: { roomId: room.id, actorId: user.id, action: "ROOM_RESCHEDULED", metadata: { from: room.scheduledAt?.toISOString() ?? null, to: v.startsAt.toISOString(), durationMin: v.durationMin } } });
  const sent = await deliverRoomNotice(updated, "RESCHEDULED", { variant: v.startsAt, now });
  return { ok: true, code: updated.code, title: updated.title, scheduledAt: v.startsAt.toISOString(), durationMin: v.durationMin, invited: sent.recipients };
}

/** Batalkan jadwal (pembuat, sebelum mulai). Ruang menjadi ENDED/CANCELLED. */
export async function cancelSchedule(user: JumpaUserLike, code: string, now = new Date()): Promise<{ ok: true; notified: number } | Fail> {
  const room = await db.jumpaRoom.findUnique({ where: { code }, select: { ...NOTICE_ROOM_SELECT, status: true } });
  if (!room) return fail(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  const m = canManageSchedule({ actorId: user.id, createdById: room.createdById, status: room.status });
  if (!m.ok) return fail(403, m.code, m.message);
  const done = await db.jumpaRoom.updateMany({ where: { id: room.id, status: "SCHEDULED" }, data: { status: "ENDED", endReason: "CANCELLED", endedAt: now, endedById: user.id } });
  if (done.count === 0) return fail(409, "KIND_NOT_SCHEDULABLE", "JUMPA ini sudah dimulai atau selesai.");
  await db.jumpaEvent.create({ data: { roomId: room.id, actorId: user.id, action: "ROOM_CANCELLED" } });
  const sent = room.scheduledAt ? await deliverRoomNotice(room, "CANCELLED", { now }) : { recipients: 0 };
  return { ok: true, notified: sent.recipients };
}

// ═══════════════════════════════ Pengingat (cron) ═════════════════════════

export interface ReminderResult { checked: number; sent: number; recipients: number }

/** Tiap menit: ruang terjadwal yang mulai ≤ 10 menit lagi → pengingat (sekali per jam mulai). */
export async function runJumpaReminders(now = new Date()): Promise<ReminderResult> {
  const rooms = await db.jumpaRoom.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gt: now, lte: new Date(now.getTime() + 10 * 60_000) } },
    select: NOTICE_ROOM_SELECT,
    take: 200,
  });
  const result: ReminderResult = { checked: rooms.length, sent: 0, recipients: 0 };
  for (const room of rooms) {
    if (!room.scheduledAt || !reminderDue(room.scheduledAt, now)) continue;
    const r = await deliverRoomNotice(room, "REMINDER", { variant: room.scheduledAt, includeCreator: true, now });
    if (r.status === "sent") { result.sent++; result.recipients += r.recipients; }
  }
  return result;
}

// ═══════════════════════════════ Cari orang (formulir jadwal) ═════════════

export async function searchPeople(user: JumpaUserLike, kind: "KELAS" | "GURU", q: string): Promise<Array<{ id: string; name: string; role: "GURU" | "MURID" }>> {
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const nameMatch = { OR: [{ fullName: { contains: term, mode: "insensitive" as const } }, { nickname: { contains: term, mode: "insensitive" as const } }] };
  const rows = await db.user.findMany({
    where: {
      id: { not: user.id },
      AND: [
        nameMatch,
        kind === "KELAS"
          ? { OR: [{ role: "GURU" }, { role: "MURID", groupMemberships: { some: { group: { teacherId: user.id, isActive: true } } }, arenaJuniorAkun: null }] }
          : { role: "GURU" },
      ],
    },
    select: { id: true, fullName: true, nickname: true, role: true },
    take: 10,
  });
  return rows.map((r) => ({ id: r.id, name: r.nickname || r.fullName || "Pengguna BC", role: r.role === "MURID" ? "MURID" : "GURU" }));
}

// ═══════════════════════════════ Data formulir jadwal ═════════════════════

export interface ScheduleFormData {
  tier: JumpaTier;
  groups: Array<{ id: string; name: string }>;
  communities: Array<{ id: string; name: string }>;
  durations: { KELAS: number[]; GURU: number[] };
  limits: { KELAS: number; GURU: number };
}

export async function loadScheduleForm(user: JumpaUserLike): Promise<ScheduleFormData | null> {
  const actor = await loadActor(user);
  if (effectiveRole(actor) !== "GURU") return null;
  const [{ tier }, groups, comms] = await Promise.all([
    resolveJumpaTier(user.id),
    db.group.findMany({ where: { teacherId: user.id, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 }),
    db.communityMember.findMany({ where: { userId: user.id, community: { status: "APPROVED" } }, select: { community: { select: { id: true, name: true } } }, take: 100 }),
  ]);
  return {
    tier,
    groups,
    communities: comms.map((c) => c.community),
    durations: { KELAS: durationChoices(tier, "KELAS"), GURU: durationChoices(tier, "GURU") },
    limits: { KELAS: limitsFor(tier, "KELAS").maxDurationMin, GURU: limitsFor(tier, "GURU").maxDurationMin },
  };
}

// ═══════════════════════════════ Riwayat ══════════════════════════════════

export interface HistoryItem {
  code: string;
  title: string;
  kind: JumpaRoom["kind"];
  status: JumpaRoom["status"];
  place: string | null;
  mine: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  durationMin: number;
  attended: number;
  present: number;
}

export interface HistoryData {
  effective: JumpaEffectiveRole | null;
  upcoming: HistoryItem[];
  live: HistoryItem[];
  past: HistoryItem[];
}

/** Ruang yang relevan untuk user (dibuat, kelas/komunitas, undangan, pernah ikut). */
async function relevantRoomWhere(user: JumpaUserLike) {
  const actor = await loadActor(user);
  const effective = effectiveRole(actor);
  const [owned, member, comms] = await Promise.all([
    effective === "GURU" ? db.group.findMany({ where: { teacherId: user.id }, select: { id: true, name: true }, take: 200 }) : Promise.resolve([]),
    db.groupMember.findMany({ where: { userId: user.id }, select: { group: { select: { id: true, name: true } } }, take: 200 }),
    effective === "GURU" ? db.communityMember.findMany({ where: { userId: user.id }, select: { community: { select: { id: true, name: true } } }, take: 200 }) : Promise.resolve([]),
  ]);
  const groupIds = [...owned.map((g) => g.id), ...member.map((m) => m.group.id)];
  const communityIds = comms.map((c) => c.community.id);
  const kinds: Array<JumpaRoom["kind"]> = effective === "GURU" ? ["KELAS", "GURU", "MURID"] : actor.isJunior ? ["KELAS"] : ["KELAS", "MURID"];
  const where = {
    kind: { in: kinds },
    OR: [
      { createdById: user.id },
      { participants: { some: { userId: user.id } } },
      ...(groupIds.length ? [{ groupId: { in: groupIds }, kind: { in: ["KELAS", "MURID"] as Array<JumpaRoom["kind"]> } }] : []),
      ...(communityIds.length ? [{ communityId: { in: communityIds } }] : []),
      { invites: { some: { kind: "USER", userId: user.id, revokedAt: null } } },
      ...(groupIds.length ? [{ invites: { some: { kind: "GROUP", groupId: { in: groupIds }, revokedAt: null } } }] : []),
    ],
    // Guru hanya melihat ruang MURID dari kelas miliknya.
    ...(effective === "GURU" ? { NOT: { kind: "MURID" as const, groupId: { notIn: owned.map((g) => g.id) } } } : {}),
  };
  const names = new Map<string, string>([...owned, ...member.map((m) => m.group), ...comms.map((c) => c.community)].map((x) => [x.id, x.name]));
  return { where, effective, names };
}

const HISTORY_SELECT = {
  id: true, code: true, title: true, kind: true, status: true, createdById: true, groupId: true, communityId: true,
  scheduledAt: true, startedAt: true, endedAt: true, endReason: true, maxDurationMin: true, createdAt: true,
  participants: { where: { removedAt: null }, select: { joinCount: true, lastJoinedAt: true, lastLeftAt: true, totalSeconds: true } },
} as const;

type HistoryRow = Awaited<ReturnType<typeof db.jumpaRoom.findMany<{ select: typeof HISTORY_SELECT }>>>[number];

function toItem(r: HistoryRow, userId: string, names: Map<string, string>): HistoryItem {
  return {
    code: r.code,
    title: r.title,
    kind: r.kind,
    status: r.status,
    place: (r.groupId && names.get(r.groupId)) || (r.communityId && names.get(r.communityId)) || null,
    mine: r.createdById === userId,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    startedAt: r.startedAt?.toISOString() ?? null,
    endedAt: r.endedAt?.toISOString() ?? null,
    endReason: r.endReason,
    durationMin: r.maxDurationMin,
    attended: r.participants.filter((p) => p.joinCount > 0 || p.totalSeconds > 0).length,
    present: r.participants.filter(isAttending).length,
  };
}

export async function loadRoomHistory(user: JumpaUserLike, now = new Date()): Promise<HistoryData> {
  const { where, effective, names } = await relevantRoomWhere(user);
  if (!effective) return { effective, upcoming: [], live: [], past: [] };
  const since = new Date(now.getTime() - 60 * 86_400_000);
  const [open, past] = await Promise.all([
    db.jumpaRoom.findMany({ where: { ...where, status: { in: ["SCHEDULED", "LIVE"] } }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }], take: 40, select: HISTORY_SELECT }),
    db.jumpaRoom.findMany({ where: { ...where, status: "ENDED", OR: undefined, AND: [{ OR: where.OR }, { OR: [{ endedAt: { gt: since } }, { endedAt: null, createdAt: { gt: since } }] }] }, orderBy: { endedAt: "desc" }, take: 40, select: HISTORY_SELECT }),
  ]);
  const items = open.map((r) => toItem(r, user.id, names));
  return {
    effective,
    live: items.filter((i) => i.status === "LIVE"),
    upcoming: items.filter((i) => i.status === "SCHEDULED"),
    past: past.map((r) => toItem(r, user.id, names)),
  };
}

// ═══════════════════════════════ Panel kelas ══════════════════════════════

export interface GroupJumpaData {
  role: "GURU" | "MURID";
  groupName: string;
  live: HistoryItem | null;
  upcoming: HistoryItem[];
  last: HistoryItem | null;
}

export async function loadGroupJumpa(user: JumpaUserLike, groupId: string, now = new Date()): Promise<GroupJumpaData | null> {
  const group = await db.group.findUnique({ where: { id: groupId }, select: { id: true, name: true, teacherId: true, isActive: true } });
  if (!group) return null;
  const isTeacher = group.teacherId === user.id;
  const member = isTeacher ? null : await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: user.id } }, select: { id: true } });
  if (!isTeacher && !member) return null;
  const role = isTeacher ? "GURU" : "MURID";
  const names = new Map([[group.id, group.name]]);
  const base = { groupId, kind: "KELAS" as const };
  const [open, last] = await Promise.all([
    db.jumpaRoom.findMany({
      where: { ...base, status: { in: ["SCHEDULED", "LIVE"] }, OR: [{ scheduledAt: null, createdAt: { gt: new Date(now.getTime() - 24 * 3_600_000) } }, { scheduledAt: { gt: new Date(now.getTime() - 24 * 3_600_000) } }] },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
      take: 6,
      select: HISTORY_SELECT,
    }),
    db.jumpaRoom.findFirst({ where: { ...base, status: "ENDED", startedAt: { not: null } }, orderBy: { endedAt: "desc" }, select: HISTORY_SELECT }),
  ]);
  const items = open.map((r) => toItem(r, user.id, names));
  // Ruang instan yang belum dimulai bukan "jadwal" — sembunyikan dari murid.
  const upcoming = items.filter((i) => i.status === "SCHEDULED" && (i.scheduledAt || isTeacher));
  return {
    role,
    groupName: group.name,
    live: items.find((i) => i.status === "LIVE") ?? null,
    upcoming: upcoming.filter((i) => i.scheduledAt).slice(0, 3),
    last: last ? toItem(last, user.id, names) : null,
  };
}

// ═══════════════════════════════ Kartu beranda ═════════════════════════════

export interface BerandaJumpaData {
  live: HistoryItem[];
  next: HistoryItem | null;
}

export async function loadBerandaJumpa(user: JumpaUserLike, now = new Date()): Promise<BerandaJumpaData> {
  const { where, effective, names } = await relevantRoomWhere(user);
  if (!effective) return { live: [], next: null };
  const [live, next] = await Promise.all([
    db.jumpaRoom.findMany({ where: { ...where, status: "LIVE" }, orderBy: { startedAt: "desc" }, take: 3, select: HISTORY_SELECT }),
    db.jumpaRoom.findFirst({ where: { ...where, status: "SCHEDULED", scheduledAt: { gt: new Date(now.getTime() - 15 * 60_000) } }, orderBy: { scheduledAt: "asc" }, select: HISTORY_SELECT }),
  ]);
  return { live: live.map((r) => toItem(r, user.id, names)), next: next ? toItem(next, user.id, names) : null };
}

// ═══════════════════════════════ Ringkasan setelah rapat ══════════════════

export interface RoomSummary {
  code: string;
  title: string;
  kind: JumpaRoom["kind"];
  status: JumpaRoom["status"];
  endReason: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  attended: number;
  /** Tautan kembali: halaman kelas (guru/murid) atau beranda. */
  backHref: string;
  backLabel: string;
  /** Kehadiran per orang — hanya untuk guru pemilik/pembuat & admin. */
  attendance: Array<{ name: string; role: "GURU" | "MURID"; minutes: number; joins: number }> | null;
}

export async function loadRoomSummary(user: JumpaUserLike, code: string, now = new Date()): Promise<RoomSummary | null> {
  const room = await db.jumpaRoom.findUnique({ where: { code }, select: { ...HISTORY_SELECT, participants: { select: { userId: true, roomRole: true, joinCount: true, totalSeconds: true, lastJoinedAt: true, lastLeftAt: true, removedAt: true } } } });
  if (!room) return null;
  const group = room.groupId ? await db.group.findUnique({ where: { id: room.groupId }, select: { teacherId: true } }) : null;
  const isParticipant = room.participants.some((p) => p.userId === user.id);
  const canLogs = canViewRoomLogs({ userId: user.id, role: user.role, isFounder: user.isFounder }, { createdById: room.createdById, groupTeacherId: group?.teacherId ?? null });
  if (!isParticipant && !canLogs) return null;

  const end = room.endedAt ?? now;
  const durationSec = room.startedAt ? Math.max(0, Math.round((end.getTime() - room.startedAt.getTime()) / 1000)) : 0;
  const attendedRows = room.participants.filter((p) => p.joinCount > 0 || p.totalSeconds > 0 || isAttending(p));
  let attendance: RoomSummary["attendance"] = null;
  if (canLogs) {
    const people = await db.user.findMany({ where: { id: { in: attendedRows.map((p) => p.userId) } }, select: { id: true, fullName: true, nickname: true, role: true, isFounder: true } });
    const byId = new Map(people.map((u) => [u.id, u]));
    attendance = attendedRows
      .map((p) => {
        const u = byId.get(p.userId);
        const openSec = isAttending(p) && p.lastJoinedAt ? Math.max(0, (end.getTime() - p.lastJoinedAt.getTime()) / 1000) : 0;
        return {
          name: (u?.nickname || u?.fullName || "Pengguna BC").slice(0, 60),
          role: (u?.role === "GURU" || u?.isFounder ? "GURU" : "MURID") as "GURU" | "MURID",
          minutes: Math.round((p.totalSeconds + openSec) / 60),
          joins: Math.max(1, p.joinCount),
        };
      })
      .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "id"));
  }
  const isGuru = user.role === "GURU" || user.isFounder;
  const back = room.groupId
    ? isGuru && group?.teacherId === user.id
      ? { href: `/guru/kelasku?kelas=${room.groupId}`, label: "Kembali ke kelas" }
      : !isGuru
        ? { href: `/murid/kelasku/${room.groupId}`, label: "Kembali ke kelas" }
        : { href: "/guru/beranda", label: "Kembali ke beranda" }
    : { href: isGuru ? "/guru/beranda" : "/murid/beranda", label: "Kembali ke beranda" };
  return {
    code: room.code,
    title: room.title,
    kind: room.kind,
    status: room.status,
    endReason: room.endReason,
    scheduledAt: room.scheduledAt?.toISOString() ?? null,
    startedAt: room.startedAt?.toISOString() ?? null,
    endedAt: room.endedAt?.toISOString() ?? null,
    durationSec,
    attended: attendedRows.length,
    backHref: back.href,
    backLabel: back.label,
    attendance,
  };
}

/** Jadwal yang boleh diubah/dibatalkan user ini (pembuat, masih SCHEDULED). */
export async function loadEditableSchedule(user: JumpaUserLike, code: string) {
  const room = await db.jumpaRoom.findUnique({
    where: { code },
    select: { code: true, title: true, kind: true, status: true, createdById: true, scheduledAt: true, maxDurationMin: true, groupId: true },
  });
  if (!room || !room.scheduledAt || room.kind === "MURID") return null;
  if (!canManageSchedule({ actorId: user.id, createdById: room.createdById, status: room.status }).ok) return null;
  return {
    code: room.code,
    title: room.title,
    kind: room.kind as "KELAS" | "GURU",
    scheduledAt: room.scheduledAt.toISOString(),
    durationMin: room.maxDurationMin,
    groupId: room.groupId,
  };
}
