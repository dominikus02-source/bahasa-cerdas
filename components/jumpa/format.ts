export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export interface ParsedParticipantMeta {
  bcRole: "GURU" | "MURID" | null;
  roomRole: "HOST" | "COHOST" | "MEMBER" | null;
}

/** Metadata peserta dicetak server (lib/jumpa/token.ts); klien hanya membaca. */
export function parseParticipantMeta(raw: string | undefined): ParsedParticipantMeta {
  if (!raw) return { bcRole: null, roomRole: null };
  try {
    const v = JSON.parse(raw) as { bcRole?: unknown; roomRole?: unknown };
    const bcRole = v.bcRole === "GURU" || v.bcRole === "MURID" ? v.bcRole : null;
    const roomRole = v.roomRole === "HOST" || v.roomRole === "COHOST" || v.roomRole === "MEMBER" ? v.roomRole : null;
    return { bcRole, roomRole };
  } catch {
    return { bcRole: null, roomRole: null };
  }
}

/** Jumlah kolom grid untuk n tile (mobile: maks 2). */
export function gridColumns(n: number, wide: boolean): number {
  if (n <= 1) return 1;
  if (!wide) return n <= 3 ? 1 : 2;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 16) return 4;
  return 5;
}

export interface GridFit {
  cols: number;
  tileW: number;
  tileH: number;
}

/**
 * Ukuran tile grid yang muat di area w×h dengan rasio tetap (`aspect` =
 * lebar/tinggi): coba setiap jumlah kolom, pilih yang tile-nya terbesar.
 * Mobile dibatasi maks 2 kolom agar wajah tetap terbaca.
 */
export function fitGrid(n: number, w: number, h: number, gap: number, aspect: number, maxCols = 6): GridFit | null {
  if (n <= 0 || w <= 0 || h <= 0 || aspect <= 0) return null;
  let best: GridFit | null = null;
  for (let cols = 1; cols <= Math.min(n, maxCols); cols++) {
    const rows = Math.ceil(n / cols);
    const byW = (w - gap * (cols - 1)) / cols;
    const byH = ((h - gap * (rows - 1)) / rows) * aspect;
    const tileW = Math.floor(Math.min(byW, byH));
    if (tileW <= 0) continue;
    if (!best || tileW > best.tileW) best = { cols, tileW, tileH: Math.floor(tileW / aspect) };
  }
  return best;
}

/** Nada gradien avatar (0–3) yang stabil per peserta. */
export function avatarTone(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 4;
}

/**
 * Nama pendek untuk tile kecil (strip pembicara): "Dewi Permata Sari" →
 * "Dewi P.", nama satu kata dipotong 10 huruf. Mencegah "Dewi Per…".
 */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Peserta";
  const first = parts[0].length > 10 ? `${parts[0].slice(0, 9)}.` : parts[0];
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return last ? `${first} ${last}.` : first;
}

/** Kode ruang (abc-defg-hij) dari ketikan bebas atau tautan /jumpa/<kode>. */
export function parseRoomInput(text: string): string | null {
  const t = text.trim().toLowerCase();
  const fromUrl = t.match(/\/jumpa\/([a-z2-9-]{10,12})(?:[/?#]|$)/);
  const raw = (fromUrl ? fromUrl[1] : t).replace(/[\s-]/g, "");
  if (!/^[a-z2-9]{10}$/.test(raw)) return null;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
}

/** Lama berjalan, ringkas: "baru mulai", "12 mnt", "1 j 5 mnt". */
export function elapsedLabel(startedAt: string | null, now = Date.now()): string | null {
  if (!startedAt) return null;
  const min = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
  if (min < 1) return "baru mulai";
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} jam ${min % 60} mnt` : `${h} jam`;
}
