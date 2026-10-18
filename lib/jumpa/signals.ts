/**
 * JUMPA — format pesan data channel LiveKit (dipakai klien & server; murni).
 *
 * Dua sumber:
 * - SERVER (participant undefined, dikirim RoomServiceClient.sendData):
 *   obrolan, moderasi, status ruang. Klien HANYA mempercayai topik server
 *   bila pengirimnya server — pesan dengan topik yang sama dari peserta
 *   diabaikan (tidak bisa memalsukan chat/moderasi).
 * - PESERTA: angkat tangan & reaksi (ringan, tidak disimpan). Perintah
 *   "turunkan tangan" dari peserta hanya diterima bila metadata pengirim
 *   (diset server, tidak bisa diubah klien) adalah HOST/COHOST.
 */
export const JUMPA_TOPICS = {
  chat: "jumpa.chat",
  moderation: "jumpa.mod",
  room: "jumpa.room",
  hand: "jumpa.hand",
  reaction: "jumpa.react",
} as const;

export const SERVER_TOPICS: readonly string[] = [JUMPA_TOPICS.chat, JUMPA_TOPICS.moderation, JUMPA_TOPICS.room];
export const PEER_TOPICS: readonly string[] = [JUMPA_TOPICS.hand, JUMPA_TOPICS.reaction];

export const JUMPA_REACTIONS = ["like", "love", "clap", "laugh", "wow", "idea"] as const;
export type JumpaReaction = (typeof JUMPA_REACTIONS)[number];

export type ServerSignal =
  | { t: "chat.new"; message: { id: string; userId: string; name: string; content: string; deleted: boolean; createdAt: string } }
  | { t: "chat.deleted"; id: string }
  | { t: "mod.muted"; source: "microphone" | "camera" | "screen_share" }
  | { t: "mod.removed" }
  | { t: "room.ended"; reason: "HOST" | "TIME_LIMIT" | "EMPTY" | "STALE" }
  | { t: "room.locked"; locked: boolean }
  | { t: "room.warning"; endsAt: string }
  | { t: "room.screen"; allowMurid: boolean }
  | { t: "room.chat"; enabled: boolean }
  | { t: "room.role"; userId: string; roomRole: "HOST" | "COHOST" | "MEMBER" };

export type PeerSignal =
  | { t: "hand"; raised: boolean; at: number }
  | { t: "hand.lower"; userId: string }
  | { t: "react"; r: JumpaReaction };

const enc = new TextEncoder();
const dec = new TextDecoder();

export function encodeSignal(sig: ServerSignal | PeerSignal): Uint8Array<ArrayBuffer> {
  return enc.encode(JSON.stringify(sig));
}

function parseJson(payload: Uint8Array): Record<string, unknown> | null {
  if (payload.byteLength > 16_384) return null;
  try {
    const v = JSON.parse(dec.decode(payload)) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Validasi pesan server. `fromServer` = participant pengirim undefined.
 * Mengembalikan null untuk apa pun yang tidak sah/dipalsukan peserta.
 */
export function parseServerSignal(topic: string | undefined, payload: Uint8Array, fromServer: boolean): ServerSignal | null {
  if (!fromServer || !topic || !SERVER_TOPICS.includes(topic)) return null;
  const v = parseJson(payload);
  if (!v || typeof v.t !== "string") return null;
  const t = v.t;
  if (topic === JUMPA_TOPICS.chat) {
    if (t === "chat.new" && v.message && typeof v.message === "object") {
      const m = v.message as Record<string, unknown>;
      if (typeof m.id === "string" && typeof m.userId === "string" && typeof m.content === "string" && typeof m.name === "string" && typeof m.createdAt === "string") {
        return { t, message: { id: m.id, userId: m.userId, name: m.name, content: m.content, deleted: m.deleted === true, createdAt: m.createdAt } };
      }
    }
    if (t === "chat.deleted" && typeof v.id === "string") return { t, id: v.id };
    return null;
  }
  if (topic === JUMPA_TOPICS.moderation) {
    if (t === "mod.muted" && (v.source === "microphone" || v.source === "camera" || v.source === "screen_share")) return { t, source: v.source };
    if (t === "mod.removed") return { t };
    return null;
  }
  // room
  if (t === "room.ended" && (v.reason === "HOST" || v.reason === "TIME_LIMIT" || v.reason === "EMPTY" || v.reason === "STALE")) return { t, reason: v.reason };
  if (t === "room.locked" && typeof v.locked === "boolean") return { t, locked: v.locked };
  if (t === "room.warning" && typeof v.endsAt === "string") return { t, endsAt: v.endsAt };
  if (t === "room.screen" && typeof v.allowMurid === "boolean") return { t, allowMurid: v.allowMurid };
  if (t === "room.chat" && typeof v.enabled === "boolean") return { t, enabled: v.enabled };
  if (t === "room.role" && typeof v.userId === "string" && (v.roomRole === "HOST" || v.roomRole === "COHOST" || v.roomRole === "MEMBER")) {
    return { t, userId: v.userId, roomRole: v.roomRole };
  }
  return null;
}

/**
 * Validasi pesan peserta. `senderRoomRole` dari metadata yang diset
 * server. "hand.lower" hanya sah dari HOST/COHOST.
 */
export function parsePeerSignal(
  topic: string | undefined,
  payload: Uint8Array,
  senderRoomRole: string | null,
): PeerSignal | null {
  if (!topic || !PEER_TOPICS.includes(topic)) return null;
  const v = parseJson(payload);
  if (!v || typeof v.t !== "string") return null;
  if (topic === JUMPA_TOPICS.hand) {
    if (v.t === "hand" && typeof v.raised === "boolean") {
      return { t: "hand", raised: v.raised, at: typeof v.at === "number" && Number.isFinite(v.at) ? v.at : Date.now() };
    }
    if (v.t === "hand.lower" && typeof v.userId === "string") {
      return senderRoomRole === "HOST" || senderRoomRole === "COHOST" ? { t: "hand.lower", userId: v.userId } : null;
    }
    return null;
  }
  if (v.t === "react" && typeof v.r === "string" && (JUMPA_REACTIONS as readonly string[]).includes(v.r)) {
    return { t: "react", r: v.r as JumpaReaction };
  }
  return null;
}

/** Antrean tangan: urut waktu angkat (paling awal duluan). */
export function handQueue<T extends { userId: string; at: number }>(raised: T[]): T[] {
  return [...raised].sort((a, b) => a.at - b.at || a.userId.localeCompare(b.userId));
}

/** Pembatas reaksi sisi klien: maksimal `max` per `windowMs`. */
export function allowReaction(history: number[], now: number, max = 5, windowMs = 3000): boolean {
  return history.filter((t) => now - t < windowMs).length < max;
}
