/**
 * JUMPA — kirim notifikasi lewat sistem notifikasi platform yang sudah ada:
 * baris Notifikasi (in-app) + Web Push (lib/push.ts, hanya perangkat yang
 * mengizinkan). Idempoten lewat JumpaNotice.dedupeKey. Tidak pernah melempar:
 * notifikasi adalah efek samping, aksi pemicunya tetap berhasil.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { kirimKeUser } from "@/lib/push";
import { buildNotice, noticeAudience, noticeKey, pushAllowedNow, type JumpaNoticeKind, type NoticeRoom } from "./notify";

export interface NoticeRoomRow {
  id: string;
  code: string;
  title: string;
  kind: "KELAS" | "GURU" | "MURID";
  groupId: string | null;
  communityId: string | null;
  createdById: string;
  scheduledAt: Date | null;
  /** "Beri tahu kelas". false = tidak ada penerima kelas/komunitas. */
  notifyClass: boolean;
}

export const NOTICE_ROOM_SELECT = {
  id: true, code: true, title: true, kind: true, groupId: true, communityId: true, createdById: true, scheduledAt: true, notifyClass: true,
} as const;

/** Kumpulkan penerima ruang (kelas terikat + kelas/komunitas/orang yang diundang). */
export async function roomAudience(room: NoticeRoomRow, opts?: { includeCreator?: boolean }): Promise<string[]> {
  if (room.kind === "MURID") return [];
  const invites = await db.jumpaInvite.findMany({
    where: { roomId: room.id, revokedAt: null, kind: { in: ["GROUP", "COMMUNITY", "USER"] } },
    select: { kind: true, groupId: true, communityId: true, userId: true },
    take: 200,
  });
  const groupIds = [...new Set([...(room.groupId ? [room.groupId] : []), ...invites.filter((i) => i.kind === "GROUP" && i.groupId).map((i) => i.groupId!)])];
  const communityIds = [...new Set([...(room.communityId ? [room.communityId] : []), ...invites.filter((i) => i.kind === "COMMUNITY" && i.communityId).map((i) => i.communityId!)])];
  const [gm, cm] = await Promise.all([
    room.notifyClass && groupIds.length && room.kind === "KELAS"
      ? db.groupMember.findMany({ where: { groupId: { in: groupIds }, group: { isActive: true } }, select: { userId: true }, take: 600 })
      : Promise.resolve([]),
    room.notifyClass && communityIds.length && room.kind === "GURU"
      ? db.communityMember.findMany({ where: { communityId: { in: communityIds }, user: { role: "GURU" } }, select: { userId: true }, take: 600 })
      : Promise.resolve([]),
  ]);
  const invitedUserIds = invites.filter((i) => i.kind === "USER" && i.userId).map((i) => i.userId!);
  const candidates = [...new Set([...gm.map((m) => m.userId), ...invitedUserIds])];
  const juniors = candidates.length
    ? await db.arenaJuniorAkun.findMany({ where: { userId: { in: candidates } }, select: { userId: true } })
    : [];
  const ids = noticeAudience({
    roomKind: room.kind,
    creatorId: room.createdById,
    groupMemberIds: gm.map((m) => m.userId),
    communityMemberIds: cm.map((m) => m.userId),
    invitedUserIds,
    juniorIds: juniors.map((j) => j.userId),
    notifyClass: room.notifyClass,
  });
  if (opts?.includeCreator && !ids.includes(room.createdById)) ids.push(room.createdById);
  return ids;
}

async function groupName(groupId: string | null): Promise<string | null> {
  if (!groupId) return null;
  const g = await db.group.findUnique({ where: { id: groupId }, select: { name: true } });
  return g?.name ?? null;
}

export interface DeliverResult {
  status: "sent" | "duplicate" | "empty" | "failed";
  recipients: number;
  pushed: number;
}

/**
 * Kirim satu jenis notifikasi untuk satu ruang, sekali saja per kunci.
 * `recipients` diisi untuk penerima khusus (mis. laporan); default = audiens ruang.
 */
export async function deliverRoomNotice(
  room: NoticeRoomRow,
  kind: JumpaNoticeKind,
  opts?: { variant?: string | Date | null; recipients?: string[]; includeCreator?: boolean; category?: string; now?: Date },
): Promise<DeliverResult> {
  const now = opts?.now ?? new Date();
  const dedupeKey = noticeKey(kind, room.id, opts?.variant ?? null);
  let noticeId: string;
  try {
    const n = await db.jumpaNotice.create({ data: { roomId: room.id, kind, dedupeKey }, select: { id: true } });
    noticeId = n.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: "duplicate", recipients: 0, pushed: 0 };
    console.error("JUMPA_NOTICE_CLAIM_FAILED", { kind, error: error instanceof Error ? error.message : String(error) });
    return { status: "failed", recipients: 0, pushed: 0 };
  }

  try {
    const ids = opts?.recipients ?? (await roomAudience(room, { includeCreator: opts?.includeCreator }));
    if (ids.length === 0) return { status: "empty", recipients: 0, pushed: 0 };
    const nr: NoticeRoom = { code: room.code, title: room.title, kind: room.kind, groupName: await groupName(room.groupId), scheduledAt: room.scheduledAt };
    const notice = buildNotice(kind, nr, { now, category: opts?.category });

    await db.notifikasi.createMany({
      data: ids.map((userId) => ({ userId, title: notice.title, body: notice.body, type: notice.type, data: { link: notice.link, jumpa: kind } })),
    });

    // Web Push: hanya perangkat yang mengizinkan; murid tidak di-push saat jam tenang.
    const roles = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true } });
    const pushIds = roles.filter((u) => pushAllowedNow(u.role, now)).map((u) => u.id);
    let pushed = 0;
    for (let i = 0; i < pushIds.length; i += 25) {
      const batch = pushIds.slice(i, i + 25);
      const r = await Promise.all(batch.map((id) => kirimKeUser(id, { title: notice.title, body: notice.body, url: notice.link, tag: notice.tag }).catch(() => 0)));
      pushed += r.reduce((a, b) => a + b, 0);
    }
    await db.jumpaNotice.update({ where: { id: noticeId }, data: { recipients: ids.length, pushed } }).catch(() => undefined);
    return { status: "sent", recipients: ids.length, pushed };
  } catch (error) {
    console.error("JUMPA_NOTICE_FAILED", { kind, error: error instanceof Error ? error.message : String(error) });
    return { status: "failed", recipients: 0, pushed: 0 };
  }
}

/** Ruang mulai berlangsung (pemandu masuk) → "Kelas X sedang JUMPA". Sekali per ruang. */
export async function notifyRoomLive(roomId: string): Promise<DeliverResult> {
  const room = await db.jumpaRoom.findUnique({ where: { id: roomId }, select: NOTICE_ROOM_SELECT });
  if (!room || room.kind === "MURID") return { status: "empty", recipients: 0, pushed: 0 };
  // "Beri tahu kelas" mati → roomAudience tidak menyertakan kelas/komunitas
  // (rapat instan = tanpa penerima sama sekali).
  return deliverRoomNotice(room, "LIVE");
}
