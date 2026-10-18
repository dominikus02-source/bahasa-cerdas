/**
 * JUMPA Fase 2 — data panel /jumpa/pantau (log ruang & laporan).
 * Cakupan: admin/founder semua ruang; guru ruang buatannya + ruang di
 * kelas miliknya (termasuk ruang MURID). permissions.ts → canViewRoomLogs.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canViewRoomLogs, JUMPA_REPORT_CATEGORIES, type JumpaReportCategory } from "./permissions";
import { displayNames, type JumpaUserLike } from "./service";

export interface PantauRoomRow {
  code: string;
  title: string;
  kind: string;
  status: string;
  createdAt: string;
  endReason: string | null;
  creatorName: string;
  groupName: string | null;
  participants: number;
  openReports: number;
}

export interface PantauReport {
  id: string;
  roomCode: string;
  roomTitle: string;
  category: string;
  categoryLabel: string;
  description: string | null;
  status: string;
  reporterName: string;
  reportedName: string | null;
  createdAt: string;
  snapshot: Array<{ name: string; content: string; deleted: boolean; at: string }>;
}

export interface PantauDetail {
  room: PantauRoomRow & { startedAt: string | null; endedAt: string | null; maxDurationMin: number };
  participants: Array<{ name: string; roomRole: string; accessVia: string; joinCount: number; totalSeconds: number; removed: boolean; firstAt: string }>;
  chat: Array<{ id: string; name: string; content: string; deleted: boolean; at: string }>;
  events: Array<{ action: string; actorName: string | null; at: string }>;
  reports: PantauReport[];
}

export function isPantauViewer(user: JumpaUserLike): boolean {
  return user.role === "ADMIN" || user.isFounder || user.role === "GURU";
}

async function scopeWhere(user: JumpaUserLike): Promise<Prisma.JumpaRoomWhereInput> {
  if (user.role === "ADMIN" || user.isFounder) return {};
  const groups = await db.group.findMany({ where: { teacherId: user.id }, select: { id: true }, take: 500 });
  return { OR: [{ createdById: user.id }, ...(groups.length ? [{ groupId: { in: groups.map((g) => g.id) } }] : [])] };
}

function toReport(
  r: { id: string; category: string; description: string | null; status: string; reporterId: string; reportedUserId: string | null; createdAt: Date; chatSnapshot: Prisma.JsonValue; room: { code: string; title: string } },
  names: Map<string, string>,
): PantauReport {
  const snap = Array.isArray(r.chatSnapshot) ? (r.chatSnapshot as Array<Record<string, unknown>>) : [];
  return {
    id: r.id,
    roomCode: r.room.code,
    roomTitle: r.room.title,
    category: r.category,
    categoryLabel: JUMPA_REPORT_CATEGORIES[r.category as JumpaReportCategory] ?? r.category,
    description: r.description,
    status: r.status,
    reporterName: names.get(r.reporterId) ?? "Pengguna BC",
    reportedName: r.reportedUserId ? (names.get(r.reportedUserId) ?? "Pengguna BC") : null,
    createdAt: r.createdAt.toISOString(),
    snapshot: snap.map((m) => ({ name: String(m.name ?? ""), content: String(m.content ?? ""), deleted: m.deleted === true, at: String(m.at ?? "") })),
  };
}

export async function loadPantauOverview(user: JumpaUserLike): Promise<{ rooms: PantauRoomRow[]; reports: PantauReport[] }> {
  const scope = await scopeWhere(user);
  const since = new Date(Date.now() - 30 * 24 * 3_600_000);
  const [rooms, reports] = await Promise.all([
    db.jumpaRoom.findMany({
      where: { AND: [scope, { createdAt: { gt: since } }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        code: true,
        title: true,
        kind: true,
        status: true,
        createdAt: true,
        endReason: true,
        createdById: true,
        groupId: true,
        _count: { select: { participants: true, reports: { where: { status: "OPEN" } } } },
      },
    }),
    db.jumpaReport.findMany({
      where: { status: "OPEN", room: scope },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { room: { select: { code: true, title: true } } },
    }),
  ]);
  const groupIds = [...new Set(rooms.map((r) => r.groupId).filter((g): g is string => Boolean(g)))];
  const groups = groupIds.length ? await db.group.findMany({ where: { id: { in: groupIds } }, select: { id: true, name: true } }) : [];
  const gName = new Map(groups.map((g) => [g.id, g.name]));
  const names = await displayNames([...rooms.map((r) => r.createdById), ...reports.flatMap((r) => [r.reporterId, r.reportedUserId ?? ""]).filter(Boolean)]);
  return {
    rooms: rooms.map((r) => ({
      code: r.code,
      title: r.title,
      kind: r.kind,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      endReason: r.endReason,
      creatorName: names.get(r.createdById) ?? "Pengguna BC",
      groupName: r.groupId ? (gName.get(r.groupId) ?? null) : null,
      participants: r._count.participants,
      openReports: r._count.reports,
    })),
    reports: reports.map((r) => toReport(r, names)),
  };
}

export async function loadPantauDetail(user: JumpaUserLike, code: string): Promise<PantauDetail | null> {
  const room = await db.jumpaRoom.findUnique({
    where: { code },
    include: {
      participants: { orderBy: { firstJoinedAt: "asc" }, take: 200 },
      messages: { orderBy: { createdAt: "asc" }, take: 500 },
      events: { orderBy: { createdAt: "desc" }, take: 200 },
      reports: { orderBy: { createdAt: "desc" }, take: 50, include: { room: { select: { code: true, title: true } } } },
    },
  });
  if (!room) return null;
  const group = room.groupId ? await db.group.findUnique({ where: { id: room.groupId }, select: { name: true, teacherId: true } }) : null;
  if (!canViewRoomLogs({ userId: user.id, role: user.role, isFounder: user.isFounder }, { createdById: room.createdById, groupTeacherId: group?.teacherId ?? null })) return null;

  const names = await displayNames([
    room.createdById,
    ...room.participants.map((p) => p.userId),
    ...room.messages.map((m) => m.userId),
    ...room.events.map((e) => e.actorId ?? "").filter(Boolean),
    ...room.reports.flatMap((r) => [r.reporterId, r.reportedUserId ?? ""]).filter(Boolean),
  ]);
  return {
    room: {
      code: room.code,
      title: room.title,
      kind: room.kind,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
      endReason: room.endReason,
      creatorName: names.get(room.createdById) ?? "Pengguna BC",
      groupName: group?.name ?? null,
      participants: room.participants.length,
      openReports: room.reports.filter((r) => r.status === "OPEN").length,
      startedAt: room.startedAt?.toISOString() ?? null,
      endedAt: room.endedAt?.toISOString() ?? null,
      maxDurationMin: room.maxDurationMin,
    },
    participants: room.participants.map((p) => ({
      name: names.get(p.userId) ?? "Pengguna BC",
      roomRole: p.roomRole,
      accessVia: p.accessVia,
      joinCount: p.joinCount,
      totalSeconds: p.totalSeconds,
      removed: Boolean(p.removedAt),
      firstAt: p.firstJoinedAt.toISOString(),
    })),
    chat: room.messages.map((m) => ({ id: m.id, name: names.get(m.userId) ?? "Pengguna BC", content: m.content, deleted: Boolean(m.deletedAt), at: m.createdAt.toISOString() })),
    events: room.events.filter((e) => !e.action.startsWith("LK_")).map((e) => ({ action: e.action, actorName: e.actorId ? (names.get(e.actorId) ?? null) : null, at: e.createdAt.toISOString() })),
    reports: room.reports.map((r) => toReport(r, names)),
  };
}
