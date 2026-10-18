/**
 * JUMPA — isi & sasaran notifikasi (murni; dites di scripts/test-jumpa-flow.ts).
 * Pengiriman (DB + Web Push) ada di lib/jumpa/notify-server.ts.
 *
 * Sistem notifikasi platform yang dipakai:
 *   1. In-app: tabel Notifikasi (lonceng dasbor guru, /arena/notifikasi murid).
 *   2. Web Push: lib/push.ts → hanya ke perangkat yang MENGIZINKAN notifikasi
 *      (PushSubscription). Itulah preferensi notifikasi yang ada di platform.
 * Tidak ada email notifikasi di platform, jadi JUMPA juga tidak mengirim email.
 */
import { formatWib, formatWibTime } from "./schedule";

export type JumpaNoticeKind = "SCHEDULED" | "REMINDER" | "LIVE" | "CANCELLED" | "RESCHEDULED" | "REPORT";

export interface NoticeRoom {
  code: string;
  title: string;
  kind: "KELAS" | "GURU" | "MURID";
  groupName: string | null;
  scheduledAt: Date | null;
}

export interface JumpaNotice {
  title: string;
  body: string;
  /** Path in-app yang dibuka saat notifikasi diketuk. */
  link: string;
  /** Tipe Notifikasi (ikon di NotificationCard). */
  type: "info" | "warning";
  /** Tag Web Push: notifikasi ruang yang sama saling menimpa. */
  tag: string;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Satu sumber teks notifikasi JUMPA (pendek, Indonesia, tanpa emoji). */
export function buildNotice(kind: JumpaNoticeKind, room: NoticeRoom, extra?: { now?: Date; category?: string }): JumpaNotice {
  const link = `/jumpa/${room.code}`;
  const tag = `jumpa-${room.code}`;
  const when = room.scheduledAt ? formatWib(room.scheduledAt, extra?.now) : "";
  const title = clip(room.title, 80);
  switch (kind) {
    case "SCHEDULED":
      return { title: "JUMPA dijadwalkan", body: `${title} · ${when}`, link, type: "info", tag };
    case "REMINDER":
      return {
        title: "JUMPA 10 menit lagi",
        body: `${title} · mulai ${room.scheduledAt ? formatWibTime(room.scheduledAt) : "sebentar lagi"}`,
        link,
        type: "info",
        tag,
      };
    case "LIVE":
      return room.kind === "KELAS" && room.groupName
        ? { title: `Kelas ${clip(room.groupName, 40)} sedang JUMPA`, body: "Gabung sekarang.", link, type: "info", tag }
        : { title: "JUMPA sedang berlangsung", body: `${title} · gabung sekarang.`, link, type: "info", tag };
    case "CANCELLED":
      return { title: "JUMPA dibatalkan", body: when ? `${title} · ${when}` : title, link: "/jumpa/riwayat", type: "warning", tag };
    case "RESCHEDULED":
      return { title: "Jadwal JUMPA berubah", body: `${title} · ${when}`, link, type: "info", tag };
    case "REPORT":
      return { title: "Laporan JUMPA baru", body: `${extra?.category ?? "Laporan"} · ${title}`, link: `/jumpa/pantau?ruang=${room.code}`, type: "warning", tag: `jumpa-lapor-${room.code}` };
  }
}

/** Kunci idempotensi (JumpaNotice.dedupeKey). Ubah jadwal = kunci pengingat baru. */
export function noticeKey(kind: JumpaNoticeKind, roomId: string, variant?: string | Date | null): string {
  const v = variant instanceof Date ? variant.toISOString() : variant ?? "";
  return `${kind}:${roomId}${v ? `:${v}` : ""}`;
}

/**
 * Siapa yang diberi tahu. Ruang MURID tidak pernah menyiarkan notifikasi
 * (perlindungan anak: ruang murid hanya diketahui teman yang diajak langsung).
 */
export function noticeAudience(input: {
  roomKind: "KELAS" | "GURU" | "MURID";
  creatorId: string;
  /** Anggota kelas terikat + kelas yang diundang. */
  groupMemberIds: string[];
  /** Anggota komunitas terikat/diundang (hanya guru). */
  communityMemberIds: string[];
  /** Undangan perorangan. */
  invitedUserIds: string[];
  /** Akun Junior (TK–SD) — dikecualikan seperti undangan Fase 2. */
  juniorIds?: string[];
  /** Penerima tambahan khusus (mis. tidak ada). */
  exclude?: string[];
}): string[] {
  if (input.roomKind === "MURID") return [];
  const ids = new Set<string>(input.invitedUserIds);
  if (input.roomKind === "KELAS") input.groupMemberIds.forEach((id) => ids.add(id));
  if (input.roomKind === "GURU") input.communityMemberIds.forEach((id) => ids.add(id));
  ids.delete(input.creatorId);
  for (const id of input.juniorIds ?? []) ids.delete(id);
  for (const id of input.exclude ?? []) ids.delete(id);
  return [...ids].slice(0, 500);
}

/**
 * Jam tenang Web Push untuk murid: 21.00–05.59 WIB push tidak dikirim
 * (notifikasi in-app tetap tersimpan). Guru tidak dibatasi.
 */
export function pushAllowedNow(role: "GURU" | "MURID" | "ADMIN", now: Date): boolean {
  if (role !== "MURID") return true;
  const jam = (now.getUTCHours() + 7) % 24;
  return jam >= 6 && jam < 21;
}
