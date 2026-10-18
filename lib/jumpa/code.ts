import { randomBytes, randomUUID } from "crypto";

// Tanpa huruf/angka yang mirip (0/o, 1/l/i) agar mudah dibacakan di kelas.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomChunk(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Kode ruang berbentuk xxx-xxxx-xxx (mirip Meet). Bukan credential. */
export function generateRoomCode(): string {
  return `${randomChunk(3)}-${randomChunk(4)}-${randomChunk(3)}`;
}

export const ROOM_CODE_RE = /^[a-z2-9]{3}-[a-z2-9]{4}-[a-z2-9]{3}$/;

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_RE.test(code);
}

/** Nama ruang di LiveKit — acak, terpisah dari kode URL. */
export function generateLivekitRoomName(): string {
  return `bc-${randomUUID()}`;
}
