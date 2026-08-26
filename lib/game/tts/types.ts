/**
 * Teka-Teki Silang — tipe bersama untuk generator puzzle prosedural.
 *
 * Bentuk WordDef/Puzzle sengaja identik secara struktural dengan tipe yang
 * dipakai komponen `components/game/TTSpage.tsx`, sehingga komponen bisa
 * memakai hasil generator tanpa migrasi data.
 */

export type Dir = "A" | "D";
export type Mascot = "zelby" | "hazel" | "alby";

export interface TtsWordDef {
  number: number;
  dir: Dir;
  answer: string;
  clue: string;
  row: number;
  col: number;
}

export interface TtsPuzzle {
  id: number;
  title: string;
  subtitle: string;
  mascot: Mascot;
  rows: number;
  cols: number;
  words: TtsWordDef[];
}

/** Satu entri bank kata: jawaban (huruf A–Z, tanpa spasi) + petunjuk. */
export interface TtsWord {
  answer: string;
  clue: string;
  /**
   * P8I — Metadata kesulitan deterministik (diturunkan, bukan label manual).
   * clueType: definisi | sinonim | antonim | ejaan-baku | imbuhan | majas |
   *           ungkapan | serapan | istilah
   * tier:     1 = DASAR · 2 = MENENGAH · 3 = LANJUT
   * Keduanya dihitung oleh `lib/game/tts/difficulty.ts`; opsional di tipe agar
   * kompatibel dengan entri lama.
   */
  clueType?: string;
  tier?: 1 | 2 | 3;
}
