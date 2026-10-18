/**
 * JUMPA — obrolan ruang (murni). Pola OBROLAN (app/api/chat/send):
 * trim, tolak kosong/terlalu panjang, buang tag HTML (render React tetap
 * meng-escape), soft-delete dengan placeholder.
 */
import { JUMPA_CHAT_MAX_LEN, JUMPA_CHAT_RETENTION_DAYS } from "./caps";

export type ChatValidation =
  | { ok: true; content: string }
  | { ok: false; code: "CHAT_EMPTY" | "CHAT_TOO_LONG"; message: string };

export function sanitizeChatContent(raw: unknown): ChatValidation {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return { ok: false, code: "CHAT_EMPTY", message: "Isi pesan tidak boleh kosong." };
  if (trimmed.length > JUMPA_CHAT_MAX_LEN) {
    return { ok: false, code: "CHAT_TOO_LONG", message: `Pesan terlalu panjang (maksimal ${JUMPA_CHAT_MAX_LEN} karakter).` };
  }
  // Buang tag HTML & karakter kontrol (kecuali baris baru).
  // eslint-disable-next-line no-control-regex
  const safe = trimmed.replace(/<\/?[a-z][^>]*>/gi, "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();
  if (!safe) return { ok: false, code: "CHAT_EMPTY", message: "Isi pesan tidak boleh kosong." };
  return { ok: true, content: safe.slice(0, JUMPA_CHAT_MAX_LEN) };
}

export const CHAT_DELETED_PLACEHOLDER = "Pesan telah dihapus";

export interface ChatRecord {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface ChatView {
  id: string;
  userId: string;
  name: string;
  content: string;
  deleted: boolean;
  createdAt: string;
}

/** Bentuk yang dikirim ke peserta: konten pesan terhapus TIDAK pernah ikut. */
export function toChatView(m: ChatRecord, name: string): ChatView {
  const deleted = Boolean(m.deletedAt);
  return {
    id: m.id,
    userId: m.userId,
    name,
    content: deleted ? CHAT_DELETED_PLACEHOLDER : m.content,
    deleted,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Batas waktu retensi: pesan dibuat sebelum ini dihapus permanen. */
export function chatRetentionCutoff(now: Date, days = JUMPA_CHAT_RETENTION_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60_000);
}
