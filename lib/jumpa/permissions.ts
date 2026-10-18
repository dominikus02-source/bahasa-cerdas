/**
 * JUMPA — aturan izin (murni, tanpa DB/HTTP; dites di
 * scripts/test-jumpa-permissions.ts). Matriks lengkap:
 * docs/JUMPA_TECHNICAL_PLAN.md §2.5.
 *
 * Prinsip:
 * - Hanya akun BC yang login. Tidak ada tamu.
 * - Peran efektif hanya GURU atau MURID. Founder = guru (lib/auth/redirect.ts
 *   dashboardForUser). ADMIN non-founder ditolak sampai founder memutuskan.
 * - Klien TIDAK pernah mendapat izin admin LiveKit. Host control lewat API.
 */
import { isPastDuration, type JumpaKind } from "./caps";

export type BcRole = "GURU" | "MURID" | "ADMIN";
export type JumpaEffectiveRole = "GURU" | "MURID";
export type JumpaRoomRole = "HOST" | "COHOST" | "MEMBER";
export type JumpaStatus = "SCHEDULED" | "LIVE" | "ENDED";
export type JumpaAccessVia = "CREATOR" | "GROUP_OWNER" | "GROUP_MEMBER";

/** Jenis ruang yang boleh dibuat di Fase 1. GURU/MURID menyusul di Fase 2. */
export const PHASE1_CREATABLE_KINDS: readonly JumpaKind[] = ["KELAS"];

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
  | "GROUP_INACTIVE"
  | "NOT_INVITED"
  | "ROOM_ENDED"
  | "ROOM_EXPIRED"
  | "ROOM_LOCKED"
  | "ROOM_FULL"
  | "REMOVED";

const deny = (code: JumpaDenyCode, message: string) =>
  ({ ok: false, code, message }) as const;

export interface CreateRoomInput {
  actor: JumpaActor;
  kind: JumpaKind;
  /** Kelas tujuan (wajib untuk KELAS). */
  group: { ownedByActor: boolean; isActive: boolean } | null;
  /** Fase yang aktif — default Fase 1 (hanya KELAS). */
  allowedKinds?: readonly JumpaKind[];
}

export function canCreateRoom(input: CreateRoomInput): Decision<Record<never, never>> {
  const role = effectiveRole(input.actor);
  if (!role) return deny("ROLE_NOT_ALLOWED", "Akun ini belum bisa memakai JUMPA.");
  const allowed = input.allowedKinds ?? PHASE1_CREATABLE_KINDS;
  if (!allowed.includes(input.kind)) {
    return deny("KIND_NOT_AVAILABLE", "Jenis ruang ini belum tersedia.");
  }
  if (input.kind === "KELAS" || input.kind === "GURU") {
    if (role !== "GURU") return deny("ROLE_NOT_ALLOWED", "Hanya guru yang bisa membuat ruang ini.");
  }
  if (input.kind === "MURID") {
    if (role !== "MURID") return deny("ROLE_NOT_ALLOWED", "Ruang murid hanya dibuat oleh murid.");
    if (input.actor.isJunior) return deny("ROLE_NOT_ALLOWED", "Akun Junior belum bisa membuat ruang.");
  }
  if (input.kind === "KELAS") {
    if (!input.group) return deny("NOT_GROUP_OWNER", "Pilih kelas terlebih dahulu.");
    if (!input.group.ownedByActor) return deny("NOT_GROUP_OWNER", "Kamu bukan guru kelas ini.");
    if (!input.group.isActive) return deny("GROUP_INACTIVE", "Kelas ini sudah tidak aktif.");
  }
  return { ok: true };
}

export interface JoinRoomState {
  kind: JumpaKind;
  status: JumpaStatus;
  isLocked: boolean;
  startedAt: Date | null;
  maxDurationMin: number;
  maxParticipants: number;
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

  if (room.status === "ENDED") return deny("ROOM_ENDED", "Ruang ini sudah selesai.");
  if (isPastDuration(room.startedAt, room.maxDurationMin, input.now)) {
    return deny("ROOM_EXPIRED", "Waktu ruang ini sudah habis.");
  }
  if (relation.isRemoved) return deny("REMOVED", "Kamu sudah dikeluarkan dari ruang ini.");

  // Siapa yang boleh masuk, per jenis ruang.
  let access: { roomRole: JumpaRoomRole; accessVia: JumpaAccessVia } | null = null;
  if (relation.isCreator) {
    // Pembuat selalu HOST ruangnya sendiri. Kekuatan HOST murid dibatasi
    // per peran efektif saat host control hadir (Fase 2), bukan di sini.
    access = { roomRole: "HOST", accessVia: "CREATOR" };
  } else if (room.kind === "KELAS") {
    if (role === "GURU" && relation.isGroupOwner) access = { roomRole: "HOST", accessVia: "GROUP_OWNER" };
    else if (role === "MURID" && relation.isGroupMember && relation.groupActive) {
      access = { roomRole: "MEMBER", accessVia: "GROUP_MEMBER" };
    }
  } else if (room.kind === "GURU") {
    // Fase 2: undangan komunitas/individu dipetakan ke isGroupMember.
    if (role === "GURU" && relation.isGroupMember) access = { roomRole: "MEMBER", accessVia: "GROUP_MEMBER" };
  } else if (room.kind === "MURID") {
    if (role === "MURID" && !actor.isJunior && relation.isGroupMember && relation.groupActive) {
      access = { roomRole: "MEMBER", accessVia: "GROUP_MEMBER" };
    }
  }
  if (!access) return deny("NOT_INVITED", "Kamu tidak terdaftar di ruang ini.");

  const isHost = access.roomRole === "HOST" || access.roomRole === "COHOST";
  if (room.isLocked && !isHost && !relation.isExistingParticipant) {
    return deny("ROOM_LOCKED", "Ruang sedang dikunci oleh host.");
  }
  if (!isHost && input.activeOthers >= room.maxParticipants) {
    return deny("ROOM_FULL", "Ruang sudah penuh.");
  }
  return { ok: true, ...access, effective: role };
}

/** Sumber media yang boleh dipublikasikan. Fase 1: kamera + mikrofon saja. */
export function publishSourcesFor(
  _roomRole: JumpaRoomRole,
  _effective: JumpaEffectiveRole,
): Array<"camera" | "microphone"> {
  return ["camera", "microphone"];
}
