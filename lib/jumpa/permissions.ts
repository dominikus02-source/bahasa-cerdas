/**
 * JUMPA — aturan izin (murni, tanpa DB/HTTP; dites di
 * scripts/test-jumpa-permissions.ts, test-jumpa-room-types.ts,
 * test-jumpa-host-actions.ts). Matriks: docs/JUMPA_TECHNICAL_PLAN.md §2.5.
 *
 * Prinsip:
 * - Hanya akun BC yang login. Tidak ada tamu.
 * - Peran efektif hanya GURU atau MURID. Founder = guru. ADMIN non-founder
 *   tidak ikut ruang (hanya panel laporan).
 * - Klien TIDAK pernah mendapat izin admin LiveKit. Semua kontrol host
 *   lewat API server (lib/jumpa/room-actions.ts).
 * - Murid tidak pernah punya kuasa atas peserta lain (mute/keluarkan/
 *   undang/hapus chat orang lain). Murid host ruang MURID hanya boleh
 *   mengunci & mengakhiri ruangnya sendiri; selebihnya pakai "Laporkan".
 * - Akun Arena Junior (TK–SD) tidak bisa membuat maupun ikut ruang MURID.
 */
import { isPastDuration, JUMPA_EARLY_JOIN_MIN, type JumpaKind } from "./caps";

export type BcRole = "GURU" | "MURID" | "ADMIN";
export type JumpaEffectiveRole = "GURU" | "MURID";
export type JumpaRoomRole = "HOST" | "COHOST" | "MEMBER";
export type JumpaStatus = "SCHEDULED" | "LIVE" | "ENDED";
export type JumpaAccessVia =
  | "CREATOR"
  | "GROUP_OWNER"
  | "GROUP_MEMBER"
  | "INVITED_GROUP"
  | "INVITED_USER"
  | "COMMUNITY"
  | "LINK";

/** Riwayat: Fase 1 hanya KELAS (dipertahankan untuk kompatibilitas tes). */
export const PHASE1_CREATABLE_KINDS: readonly JumpaKind[] = ["KELAS"];
/** Fase 2: semua jenis ruang. */
export const JUMPA_CREATABLE_KINDS: readonly JumpaKind[] = ["KELAS", "GURU", "MURID"];

export interface JumpaActor {
  role: BcRole;
  isFounder: boolean;
  /** Akun Arena Junior (TK–SD). */
  isJunior: boolean;
}

export function effectiveRole(actor: JumpaActor): JumpaEffectiveRole | null {
  if (actor.isFounder) return "GURU";
  if (actor.role === "GURU") return "GURU";
  if (actor.role === "MURID") return "MURID";
  return null;
}

export type Decision<T> =
  | ({ ok: true } & T)
  | { ok: false; code: JumpaDenyCode; message: string };

export type JumpaDenyCode =
  | "ROLE_NOT_ALLOWED"
  | "KIND_NOT_AVAILABLE"
  | "NOT_GROUP_OWNER"
  | "NOT_GROUP_MEMBER"
  | "GROUP_INACTIVE"
  | "NOT_COMMUNITY_MEMBER"
  | "JUNIOR_NOT_ALLOWED"
  | "NOT_INVITED"
  | "ROOM_ENDED"
  | "ROOM_CANCELLED"
  | "NOT_STARTED"
  | "ROOM_EXPIRED"
  | "ROOM_LOCKED"
  | "ROOM_FULL"
  | "REMOVED"
  | "NOT_ALLOWED"
  | "BAD_TARGET";

const deny = (code: JumpaDenyCode, message: string) =>
  ({ ok: false, code, message }) as const;

// ═══════════════════════════════ Buat ruang ═══════════════════════════════

export interface CreateRoomInput {
  actor: JumpaActor;
  kind: JumpaKind;
  /**
   * Kelas terkait. KELAS: kelas milik guru. MURID: kelas tempat murid
   * terdaftar (teman sekelas = satu-satunya yang boleh masuk).
   */
  group: { ownedByActor: boolean; isActive: boolean; actorIsMember?: boolean } | null;
  /** Komunitas MGMP opsional untuk ruang GURU. */
  community?: { actorIsMember: boolean; approved: boolean } | null;
  allowedKinds?: readonly JumpaKind[];
}

export function canCreateRoom(input: CreateRoomInput): Decision<Record<never, never>> {
  const role = effectiveRole(input.actor);
  if (!role) return deny("ROLE_NOT_ALLOWED", "Akun ini belum bisa memakai JUMPA.");
  const allowed = input.allowedKinds ?? JUMPA_CREATABLE_KINDS;
  if (!allowed.includes(input.kind)) {
    return deny("KIND_NOT_AVAILABLE", "Jenis ruang ini belum tersedia.");
  }
  if (input.kind === "KELAS" || input.kind === "GURU") {
    if (role !== "GURU") return deny("ROLE_NOT_ALLOWED", "Hanya guru yang bisa membuat ruang ini.");
  }
  if (input.kind === "MURID") {
    if (role !== "MURID") return deny("ROLE_NOT_ALLOWED", "Ruang murid hanya dibuat oleh murid.");
    if (input.actor.isJunior) return deny("JUNIOR_NOT_ALLOWED", "Akun Junior belum bisa membuat ruang.");
  }
  if (input.kind === "KELAS") {
    if (!input.group) return deny("NOT_GROUP_OWNER", "Pilih kelas terlebih dahulu.");
    if (!input.group.ownedByActor) return deny("NOT_GROUP_OWNER", "Kamu bukan guru kelas ini.");
    if (!input.group.isActive) return deny("GROUP_INACTIVE", "Kelas ini sudah tidak aktif.");
  }
  if (input.kind === "MURID") {
    if (!input.group) return deny("NOT_GROUP_MEMBER", "Pilih kelasmu terlebih dahulu.");
    if (!input.group.actorIsMember) return deny("NOT_GROUP_MEMBER", "Kamu bukan anggota kelas ini.");
    if (!input.group.isActive) return deny("GROUP_INACTIVE", "Kelas ini sudah tidak aktif.");
  }
  if (input.kind === "GURU" && input.community) {
    if (!input.community.actorIsMember || !input.community.approved) {
      return deny("NOT_COMMUNITY_MEMBER", "Kamu bukan anggota komunitas ini.");
    }
  }
  return { ok: true };
}

// ═══════════════════════════════ Masuk ruang ══════════════════════════════

export interface JoinRoomState {
  kind: JumpaKind;
  status: JumpaStatus;
  isLocked: boolean;
  startedAt: Date | null;
  maxDurationMin: number;
  maxParticipants: number;
  /** Alur jadwal: jam mulai (WIB di UI). null = ruang instan. */
  scheduledAt?: Date | null;
  /** "CANCELLED" = jadwal dibatalkan pembuat. */
  endReason?: string | null;
}

export interface JoinRelation {
  isCreator: boolean;
  /** Pemilik (guru) kelas yang terikat ke ruang. */
  isGroupOwner: boolean;
  /** Anggota aktif kelas yang terikat ke ruang. */
  isGroupMember: boolean;
  /** Kelas terikat masih aktif. */
  groupActive: boolean;
  /** Sudah pernah diberi akses ke ruang ini (boleh masuk lagi saat terkunci). */
  isExistingParticipant: boolean;
  /** Pernah dikeluarkan host. */
  isRemoved: boolean;
  // ── Fase 2 (opsional; default false) ──
  /** Anggota kelas lain yang diundang ke ruang KELAS. */
  isInvitedGroupMember?: boolean;
  /** Diundang langsung (USER). */
  isUserInvited?: boolean;
  /** Anggota komunitas ruang / komunitas yang diundang (ruang GURU). */
  isCommunityMember?: boolean;
  /** Membawa tautan undangan guru yang valid (ruang GURU). */
  hasValidLink?: boolean;
  /** Peran ruang yang tersimpan (mis. COHOST yang ditunjuk host). */
  storedRoomRole?: JumpaRoomRole | null;
}

export interface JoinInput {
  actor: JumpaActor;
  room: JoinRoomState;
  relation: JoinRelation;
  /** Peserta yang sedang tersambung, TIDAK termasuk actor sendiri. */
  activeOthers: number;
  now: Date;
}

export function evaluateJoin(
  input: JoinInput,
): Decision<{ roomRole: JumpaRoomRole; accessVia: JumpaAccessVia; effective: JumpaEffectiveRole }> {
  const { actor, room, relation } = input;
  const role = effectiveRole(actor);
  if (!role) return deny("ROLE_NOT_ALLOWED", "Akun ini belum bisa memakai JUMPA.");

  if (room.status === "ENDED" && room.endReason === "CANCELLED") return deny("ROOM_CANCELLED", "JUMPA ini dibatalkan.");
  if (room.status === "ENDED") return deny("ROOM_ENDED", "Ruang ini sudah selesai.");
  if (isPastDuration(room.startedAt, room.maxDurationMin, input.now)) {
    return deny("ROOM_EXPIRED", "Waktu ruang ini sudah habis.");
  }
  if (relation.isRemoved) return deny("REMOVED", "Kamu sudah dikeluarkan dari ruang ini.");

  let access: { roomRole: JumpaRoomRole; accessVia: JumpaAccessVia } | null = null;
  if (relation.isCreator) {
    access = { roomRole: "HOST", accessVia: "CREATOR" };
  } else if (room.kind === "KELAS") {
    if (role === "GURU" && relation.isGroupOwner) access = { roomRole: "HOST", accessVia: "GROUP_OWNER" };
    else if (role === "MURID" && relation.isGroupMember && relation.groupActive) {
      access = { roomRole: "MEMBER", accessVia: "GROUP_MEMBER" };
    } else if (role === "MURID" && relation.isInvitedGroupMember) {
      access = { roomRole: "MEMBER", accessVia: "INVITED_GROUP" };
    } else if (relation.isUserInvited) {
      // Undangan individu divalidasi saat dibuat (guru rekan / murid kelas host).
      access = { roomRole: "MEMBER", accessVia: "INVITED_USER" };
    }
  } else if (room.kind === "GURU") {
    if (role === "GURU") {
      if (relation.isUserInvited) access = { roomRole: "MEMBER", accessVia: "INVITED_USER" };
      else if (relation.isCommunityMember) access = { roomRole: "MEMBER", accessVia: "COMMUNITY" };
      else if (relation.hasValidLink) access = { roomRole: "MEMBER", accessVia: "LINK" };
      else if (relation.isExistingParticipant) access = { roomRole: "MEMBER", accessVia: "LINK" };
    }
  } else if (room.kind === "MURID") {
    // Perlindungan anak: hanya murid (non-Junior) sekelas pembuat.
    if (role === "MURID" && actor.isJunior) {
      return deny("JUNIOR_NOT_ALLOWED", "Akun Junior belum bisa ikut ruang murid.");
    }
    if (role === "MURID" && relation.isGroupMember && relation.groupActive) {
      access = { roomRole: "MEMBER", accessVia: "GROUP_MEMBER" };
    }
  }
  if (!access) return deny("NOT_INVITED", "Kamu tidak terdaftar di ruang ini.");

  // COHOST tersimpan hanya berlaku untuk guru (murid tidak pernah jadi cohost).
  if (access.roomRole === "MEMBER" && relation.storedRoomRole === "COHOST" && role === "GURU") {
    access = { ...access, roomRole: "COHOST" };
  }

  const isHost = access.roomRole === "HOST" || access.roomRole === "COHOST";
  if (room.isLocked && !isHost && !relation.isExistingParticipant) {
    return deny("ROOM_LOCKED", "Ruang sedang dikunci oleh pemandu.");
  }
  // Ruang terjadwal: peserta masuk mulai 10 menit sebelum jam mulai, atau
  // begitu pemandu memulai (status LIVE). Pemandu boleh membuka lebih awal.
  if (!isHost && room.status === "SCHEDULED" && room.scheduledAt && input.now.getTime() < room.scheduledAt.getTime() - JUMPA_EARLY_JOIN_MIN * 60_000) {
    return deny("NOT_STARTED", "JUMPA belum dibuka.");
  }
  if (!isHost && input.activeOthers >= room.maxParticipants) {
    return deny("ROOM_FULL", "Ruang sudah penuh.");
  }
  return { ok: true, ...access, effective: role };
}

// ═══════════════════════════ Sumber media (token) ═════════════════════════

export type JumpaPublishSource = "camera" | "microphone" | "screen_share" | "screen_share_audio";

export interface PublishContext {
  kind: JumpaKind;
  allowMuridScreenShare: boolean;
}

/**
 * Sumber media yang boleh dipublikasikan.
 * - Guru: kamera, mik, berbagi layar (+audio layar).
 * - Murid: kamera + mik. Berbagi layar hanya bila
 *   (a) ruang KELAS dan guru host mengizinkan, atau
 *   (b) murid adalah pembuat (HOST) ruang MURID-nya sendiri.
 * Tanpa `ctx` (pemanggil Fase 1) = kamera + mik saja.
 */
export function publishSourcesFor(
  roomRole: JumpaRoomRole,
  effective: JumpaEffectiveRole,
  ctx?: PublishContext,
): JumpaPublishSource[] {
  const base: JumpaPublishSource[] = ["camera", "microphone"];
  if (!ctx) return base;
  const screen: JumpaPublishSource[] = ["screen_share", "screen_share_audio"];
  if (effective === "GURU") return [...base, ...screen];
  if (ctx.kind === "KELAS" && ctx.allowMuridScreenShare) return [...base, ...screen];
  if (ctx.kind === "MURID" && roomRole === "HOST") return [...base, ...screen];
  return base;
}

// ═══════════════════════════════ Kontrol host ═════════════════════════════

export type JumpaModerationAction =
  | "MUTE_AUDIO"
  | "MUTE_VIDEO"
  | "STOP_SCREEN"
  | "REMOVE"
  | "LOCK"
  | "UNLOCK"
  | "END"
  | "ALLOW_MURID_SCREEN"
  | "DISALLOW_MURID_SCREEN"
  | "SET_COHOST"
  | "UNSET_COHOST"
  | "DELETE_CHAT"
  | "TOGGLE_CHAT";

export const TARGETED_ACTIONS: readonly JumpaModerationAction[] = [
  "MUTE_AUDIO",
  "MUTE_VIDEO",
  "STOP_SCREEN",
  "REMOVE",
  "SET_COHOST",
  "UNSET_COHOST",
];

export interface ModerationActor {
  userId: string;
  roomRole: JumpaRoomRole;
  effective: JumpaEffectiveRole;
}

export interface ModerationTarget {
  userId: string;
  roomRole: JumpaRoomRole;
  effective: JumpaEffectiveRole;
}

const GURU_COHOST_ACTIONS: readonly JumpaModerationAction[] = [
  "MUTE_AUDIO",
  "MUTE_VIDEO",
  "STOP_SCREEN",
  "REMOVE",
  "LOCK",
  "UNLOCK",
  "DELETE_CHAT",
];
const MURID_HOST_ACTIONS: readonly JumpaModerationAction[] = ["LOCK", "UNLOCK", "END"];

export function canModerate(input: {
  actor: ModerationActor;
  action: JumpaModerationAction;
  roomKind: JumpaKind;
  target?: ModerationTarget | null;
}): Decision<Record<never, never>> {
  const { actor, action, roomKind, target } = input;
  const no = deny("NOT_ALLOWED", "Kamu tidak punya izin untuk tindakan ini.");

  if (actor.effective === "MURID") {
    // Murid tidak pernah punya kuasa atas peserta lain.
    if (roomKind === "MURID" && actor.roomRole === "HOST" && MURID_HOST_ACTIONS.includes(action)) return { ok: true };
    return no;
  }
  if (actor.roomRole === "MEMBER") return no;
  if (actor.roomRole === "COHOST" && !GURU_COHOST_ACTIONS.includes(action)) return no;

  if (action === "ALLOW_MURID_SCREEN" || action === "DISALLOW_MURID_SCREEN") {
    if (roomKind !== "KELAS") return deny("BAD_TARGET", "Pengaturan ini hanya untuk ruang kelas.");
  }

  if (TARGETED_ACTIONS.includes(action)) {
    if (!target) return deny("BAD_TARGET", "Peserta tidak ditemukan.");
    if (target.userId === actor.userId) return deny("BAD_TARGET", "Tidak bisa diterapkan ke diri sendiri.");
    if (target.roomRole === "HOST") return deny("BAD_TARGET", "Pemandu tidak bisa dikenai tindakan ini.");
    if (actor.roomRole === "COHOST" && target.roomRole === "COHOST") {
      return deny("BAD_TARGET", "Wakil pemandu tidak bisa menindak wakil pemandu lain.");
    }
    if (action === "SET_COHOST") {
      if (target.effective !== "GURU") return deny("BAD_TARGET", "Hanya guru yang bisa dijadikan wakil pemandu.");
      if (target.roomRole === "COHOST") return deny("BAD_TARGET", "Peserta ini sudah wakil pemandu.");
    }
    if (action === "UNSET_COHOST" && target.roomRole !== "COHOST") {
      return deny("BAD_TARGET", "Peserta ini bukan wakil pemandu.");
    }
  }
  return { ok: true };
}

/** Hapus pesan: pemilik pesan, atau guru host/cohost (bukan murid host). */
export function canDeleteChat(input: {
  actor: ModerationActor;
  messageUserId: string;
  roomKind: JumpaKind;
}): Decision<Record<never, never>> {
  if (input.messageUserId === input.actor.userId) return { ok: true };
  return canModerate({ actor: input.actor, action: "DELETE_CHAT", roomKind: input.roomKind });
}

// ═══════════════════════════════ Undangan ═════════════════════════════════

export type JumpaInviteKind = "GROUP" | "COMMUNITY" | "USER" | "LINK";

export interface InviteFacts {
  kind: JumpaInviteKind;
  /** GROUP: kelas milik pengundang & aktif. */
  ownsGroup?: boolean;
  groupActive?: boolean;
  /** COMMUNITY: pengundang anggota & komunitas disetujui. */
  isCommunityMember?: boolean;
  communityApproved?: boolean;
  /** USER: peran sasaran & apakah sasaran murid di salah satu kelas pengundang. */
  targetEffective?: JumpaEffectiveRole | null;
  targetIsJunior?: boolean;
  targetInActorGroups?: boolean;
}

export function canInvite(input: {
  actor: ModerationActor;
  roomKind: JumpaKind;
  invite: InviteFacts;
}): Decision<Record<never, never>> {
  const { actor, roomKind, invite } = input;
  if (actor.effective !== "GURU" || actor.roomRole === "MEMBER") {
    return deny("NOT_ALLOWED", "Hanya guru pemandu atau wakil pemandu yang bisa mengundang.");
  }
  if (roomKind === "MURID") return deny("NOT_ALLOWED", "Ruang murid hanya untuk teman sekelas.");

  switch (invite.kind) {
    case "GROUP":
      if (roomKind !== "KELAS") return deny("BAD_TARGET", "Undangan kelas hanya untuk ruang kelas.");
      if (!invite.ownsGroup) return deny("NOT_GROUP_OWNER", "Kamu hanya bisa mengundang kelasmu sendiri.");
      if (!invite.groupActive) return deny("GROUP_INACTIVE", "Kelas ini sudah tidak aktif.");
      return { ok: true };
    case "COMMUNITY":
      if (roomKind !== "GURU") return deny("BAD_TARGET", "Undangan komunitas hanya untuk ruang guru.");
      if (!invite.isCommunityMember || !invite.communityApproved) {
        return deny("NOT_COMMUNITY_MEMBER", "Kamu bukan anggota komunitas ini.");
      }
      return { ok: true };
    case "LINK":
      if (roomKind !== "GURU") return deny("BAD_TARGET", "Tautan undangan khusus ruang guru.");
      return { ok: true };
    case "USER":
      if (!invite.targetEffective) return deny("BAD_TARGET", "Pengguna tidak ditemukan.");
      if (roomKind === "GURU") {
        return invite.targetEffective === "GURU" ? { ok: true } : deny("BAD_TARGET", "Ruang guru hanya untuk guru.");
      }
      // KELAS: guru rekan, atau murid dari kelas milik pengundang.
      if (invite.targetEffective === "GURU") return { ok: true };
      if (invite.targetInActorGroups) return { ok: true };
      return deny("BAD_TARGET", "Murid hanya bisa diundang dari kelasmu sendiri.");
  }
}

// ═══════════════════════════ Log & laporan ════════════════════════════════

export interface LogViewer {
  userId: string;
  role: BcRole;
  isFounder: boolean;
}

/**
 * Siapa yang boleh melihat log ruang (peserta, kehadiran, obrolan,
 * laporan): admin/founder semua ruang; guru untuk ruang yang dibuatnya
 * dan ruang yang terikat ke kelas miliknya (termasuk ruang MURID).
 */
export function canViewRoomLogs(viewer: LogViewer, room: { createdById: string; groupTeacherId: string | null }): boolean {
  if (viewer.role === "ADMIN" || viewer.isFounder) return true;
  if (viewer.role !== "GURU") return false;
  return room.createdById === viewer.userId || room.groupTeacherId === viewer.userId;
}

export const JUMPA_REPORT_CATEGORIES = {
  BULLYING: "Perundungan / kata-kata kasar",
  INAPPROPRIATE: "Konten tidak pantas",
  STRANGER: "Orang tidak dikenal",
  SPAM: "Spam / mengganggu",
  OTHER: "Lainnya",
} as const;
export type JumpaReportCategory = keyof typeof JUMPA_REPORT_CATEGORIES;

/** Penerima laporan: guru kelas terkait (bila ada) + semua admin. */
export function reportRecipients(input: {
  groupTeacherId: string | null;
  creatorId: string;
  creatorEffective: JumpaEffectiveRole;
  adminIds: string[];
  reporterId: string;
}): string[] {
  const ids = new Set<string>(input.adminIds);
  if (input.groupTeacherId) ids.add(input.groupTeacherId);
  // Ruang GURU tanpa kelas: host guru ikut menerima.
  else if (input.creatorEffective === "GURU") ids.add(input.creatorId);
  ids.delete(input.reporterId);
  return [...ids];
}
