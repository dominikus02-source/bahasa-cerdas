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
