/**
 * Generator teka-teki silang prosedural (ber-seed).
 *
 * Ide inti: dari bank kata bertema, pilih subset kata (mengutamakan kata yang
 * belum pernah muncul di main sebelumnya via `avoidAnswers`), lalu susun di
 * grid dengan algoritma penempatan serakah:
 *
 *   1. Kata pertama (terpanjang) diletakkan mendatar di kiri atas.
 *   2. Kata berikutnya dipilih yang paling banyak berbagi huruf dengan kata
 *      yang sudah terpasang, lalu dicoba semua titik perpotongan (mendatar
 *      atau menurun) dengan aturan teka-teki sungguhan.
 *   3. Gagal? coba ulang dengan acakan lain (sampai batas), lalu relaksasi
 *      bila masih kurang.
 *
 * Aturan validitas grid (standar teka-teki silang):
 * - huruf tidak boleh bentrok di sel yang sama;
 * - kata tidak boleh memanjang tanpa sengaja (sel sebelum awal & sesudah
 *   akhir kata tidak boleh milik kata searah);
 * - sel di sisi atas/bawah (kata mendatar) atau kiri/kanan (kata menurun)
 *   hanya boleh terisi bila sel kata itu sendiri dipotong kata lain
 *   (perpotongan, bukan sejajar yang menempel).
 *
 * Deterministik per (level, seed): seed sama → puzzle sama persis, sehingga
 * "Teka-Teki Hari Ini" konsisten untuk semua pemain dan mudah diuji.
 */

import type { Dir, TtsPuzzle, TtsWord, TtsWordDef } from "./types";
import { levelConfig } from "./levels";
import { bankForLevel, themeKeyForAnswer } from "./word-bank";
import { mulberry32, type Rng } from "./seed";
import {
  canAppearInLevel,
  conflictAnswersFor,
  wordDifficulty,
} from "./difficulty";
export interface BuildPuzzleOptions {
  level: number;
  seed: number;
  /** Jawaban yang dihindari (anti-ulang antar main). Dipakai selama masih ada alternatif. */
  avoidAnswers?: string[];
  /** P8I: batasi tipe petunjuk agar ragam (maks 2 kata per tipe dalam satu puzzle). */
  balanceClueTypes?: boolean;
}

interface PlacedWord {
  word: TtsWord;
  dir: Dir;
  row: number;
  col: number;
}

interface Board {
  letters: Map<string, string>;
  /** Sel yang dipakai kata mendatar. */
  hCells: Set<string>;
  /** Sel yang dipakai kata menurun. */
  vCells: Set<string>;
  placed: PlacedWord[];
}

const key = (r: number, c: number) => `${r},${c}`;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wordCells(p: PlacedWord): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const len = p.word.answer.length;
  for (let i = 0; i < len; i++) {
    out.push(p.dir === "A" ? [p.row, p.col + i] : [p.row + i, p.col]);
  }
  return out;
}

/** Huruf-huruf yang sudah terpasang di board (untuk afinitas). */
function placedLetters(board: Board): Set<string> {
  const s = new Set<string>();
  for (const v of board.letters.values()) s.add(v);
  return s;
}

/** Coba satu penempatan; true bila valid. */
function tryPlace(board: Board, w: TtsWord, dir: Dir, row: number, col: number, maxRows: number, maxCols: number): boolean {
  const len = w.answer.length;
  if (row < 0 || col < 0) return false;
  if (dir === "A" && col + len > maxCols) return false;
  if (dir === "D" && row + len > maxRows) return false;

  const sameSet = dir === "A" ? board.hCells : board.vCells;
  const crossSet = dir === "A" ? board.vCells : board.hCells;

  // 1) Huruf tidak bentrok; sel yang terisi harus milik kata searah (crossing).
  for (let i = 0; i < len; i++) {
    const r = dir === "A" ? row : row + i;
    const c = dir === "A" ? col + i : col;
    const k = key(r, c);
    const existing = board.letters.get(k);
    if (existing !== undefined) {
      if (existing !== w.answer[i]) return false;
      if (sameSet.has(k)) return false; // memanjang kata searah yang sudah ada
      if (!crossSet.has(k)) return false; // sel terisi tanpa perpotongan
    }
  }

  // 2) Tanpa perpanjangan tak sengaja di kedua ujung (sel ujung milik kata searah).
  const before = dir === "A" ? key(row, col - 1) : key(row - 1, col);
  const after = dir === "A" ? key(row, col + len) : key(row + len, col);
  if (sameSet.has(before) || sameSet.has(after)) return false;

  // 3) Sel sisi sejajar hanya boleh terisi bila sel kata ini dipotong kata lain.
  for (let i = 0; i < len; i++) {
    const r = dir === "A" ? row : row + i;
    const c = dir === "A" ? col + i : col;
    const k = key(r, c);
    const sides: Array<[number, number]> = dir === "A"
      ? [[r - 1, c], [r + 1, c]]
      : [[r, c - 1], [r, c + 1]];
    for (const [sr, sc] of sides) {
      if (board.letters.has(key(sr, sc)) && !crossSet.has(k)) return false;
    }
  }

  return true;
}

/** Semua penempatan valid untuk satu kata, dengan skor (banyak perpotongan, dekat tengah). */
function candidatePlacements(
  board: Board,
  w: TtsWord,
  maxRows: number,
  maxCols: number,
  rng: Rng
): Array<{ dir: Dir; row: number; col: number; score: number; crossings: number }> {
  const out: Array<{ dir: Dir; row: number; col: number; score: number; crossings: number }> = [];
  const centerR = maxRows / 2;
  const centerC = maxCols / 2;
  const len = w.answer.length;

  for (const placed of board.placed) {
    const cells = wordCells(placed);
    for (let i = 0; i < cells.length; i++) {
      const [r, c] = cells[i];
      for (let j = 0; j < len; j++) {
        if (placed.word.answer[i] !== w.answer[j]) continue;
        // Kata yang sedang ditempatkan dipotong di indeks j oleh kata terpasang
        // di sel (r, c) — arahnya tegak lurus.
        const dir: Dir = placed.dir === "A" ? "D" : "A";
        const row = dir === "D" ? r - j : r;
        const col = dir === "A" ? c - j : c;
        if (!tryPlace(board, w, dir, row, col, maxRows, maxCols)) continue;
        let crossings = 0;
        for (let x = 0; x < len; x++) {
          const rr = dir === "A" ? row : row + x;
          const cc = dir === "A" ? col + x : col;
          if (board.letters.has(key(rr, cc))) crossings++;
        }
        const dist = Math.abs(row + len / 2 - centerR) + Math.abs(col + len / 2 - centerC);
        out.push({ dir, row, col, score: crossings * 3 - dist / 10 + rng() * 0.01, crossings });
      }
    }
  }
  return out;
}

function placeWord(board: Board, w: TtsWord, dir: Dir, row: number, col: number) {
  const p: PlacedWord = { word: w, dir, row, col };
  const set = dir === "A" ? board.hCells : board.vCells;
  const len = w.answer.length;
  for (let i = 0; i < len; i++) {
    const r = dir === "A" ? row : row + i;
    const c = dir === "A" ? col + i : col;
    board.letters.set(key(r, c), w.answer[i]);
    set.add(key(r, c));
  }
  board.placed.push(p);
}

/** Susun satu puzzle dari seed; deterministik. */
export function buildPuzzle(options: BuildPuzzleOptions): TtsPuzzle {
  const cfg = levelConfig(options.level);
  const rng = mulberry32(options.seed);
  const poolAll = bankForLevel(options.level);

  // ── P8I: metadata kesulitan + gerbang level ──
  // Kata langka (RARE) tidak boleh muncul sebelum L7; tier lain mengikuti
  // tema (1:1 dengan level) sehingga pool tidak pernah kosong.
  const enriched = poolAll.map((w) => ({
    word: w,
    ...wordDifficulty(w, themeKeyForAnswer(w.answer) ?? ""),
  }));
  const pool: TtsWord[] = enriched
    .filter((e) => canAppearInLevel(e.word.answer, e.tier, options.level))
    .map((e) => ({ ...e.word, clueType: e.clueType, tier: e.tier }));

  // ── P8I: peta konflik petunjuk↔jawaban (anti-bocor perpotongan) ──
  const conflictMap = new Map<string, Set<string>>();
  for (const w of pool) conflictMap.set(w.answer, conflictAnswersFor(w.answer, pool));

  // Anti-ulang: hindari jawaban yang baru saja muncul, selama masih ada
  // alternatif cukup (≥ 2× target).
  const avoid = new Set(options.avoidAnswers ?? []);
  let candidates = pool.filter((w) => !avoid.has(w.answer));
  if (candidates.length < cfg.targetWords * 2) candidates = pool;

  let best: Board | null = null;
  const maxTries = 7;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const board: Board = { letters: new Map(), hCells: new Set(), vCells: new Set(), placed: [] };
    const shuffled = shuffle(candidates, rng);

    // ── P8I: pilih kata dengan menghindari pasangan yang saling membocorkan
    // petunjuk (konflik petunjuk↔jawaban). Bila hasil seleksi kurang dari
    // minWords, jatuh ke daftar tanpa filter konflik (jaga solvabilitas). ──
    function pickNonConflicting(list: typeof shuffled): typeof shuffled {
      const out: typeof shuffled = [];
      const used = new Set<string>();
      for (const w of list) {
        if (used.has(w.answer)) continue;
        const conflicts = conflictMap.get(w.answer);
        if (conflicts && [...conflicts].some((c) => used.has(c))) continue;
        out.push(w);
        used.add(w.answer);
        if (out.length >= cfg.targetWords) break;
      }
      return out.length >= cfg.minWords ? out : list.slice(0, cfg.targetWords);
    }
    const ordered = pickNonConflicting(shuffled);

    // Kata pertama: terpanjang, mendatar, di baris acak dekat atas.
    if (ordered.length === 0) continue;
    const first = ordered.reduce((a, b) => (b.answer.length > a.answer.length ? b : a));
    const firstRow = Math.floor(rng() * Math.min(3, Math.max(1, cfg.maxRows - first.answer.length)));
    placeWord(board, first, "A", firstRow, 0);

    const rest = ordered.filter((w) => w.answer !== first.answer);
    // ── P8I: ragam tipe petunjuk (maks 2 per tipe dalam satu puzzle) ──
    const typeCount = new Map<string, number>();
    typeCount.set(first.clueType ?? "definisi", 1);
    while (rest.length > 0 && board.placed.length < cfg.targetWords) {
      const letters = placedLetters(board);
      // Afinitas: paling banyak huruf yang cocok dengan kata terpasang.
      rest.sort((a, b) => {
        const sa = [...new Set(a.answer.split(""))].filter((ch) => letters.has(ch)).length;
        const sb = [...new Set(b.answer.split(""))].filter((ch) => letters.has(ch)).length;
        if (sa !== sb) return sb - sa;
        return b.answer.length - a.answer.length;
      });
      const idx = rest.findIndex((w) => {
        const t = w.clueType ?? "definisi";
        return (typeCount.get(t) ?? 0) < 2;
      });
      const w = rest.splice(idx === -1 ? 0 : idx, 1)[0];
      const placements = candidatePlacements(board, w, cfg.maxRows, cfg.maxCols, rng);
      if (placements.length === 0) continue;
      placements.sort((a, b) => b.score - a.score);
      placeWord(board, w, placements[0].dir, placements[0].row, placements[0].col);
      const t = w.clueType ?? "definisi";
      typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
    }

    if (!best || board.placed.length > best.placed.length) best = board;
    if (board.placed.length >= cfg.targetWords) break;
  }

  const board = best ?? { letters: new Map(), hCells: new Set(), vCells: new Set(), placed: [] };

  // Relaksasi: kalau masih kurang dari minWords, paksakan sisa kata —
  // tetap WAJIB bercokolong (perpotongan) agar setiap kata bisa disilangkan;
  // hanya jatuh ke penempatan longgar bila tidak ada opsi berpotongan sama sekali.
  if (board.placed.length < cfg.minWords) {
    const used = new Set(board.placed.map((p) => p.word.answer));
    let progress = true;
    while (board.placed.length < cfg.minWords && progress) {
      progress = false;
      for (const w of candidates) {
        if (used.has(w.answer) || board.placed.length >= cfg.minWords) continue;
        const placements = candidatePlacements(board, w, cfg.maxRows, cfg.maxCols, rng);
        const bestPlacement = placements.sort((a, b) => b.score - a.score)[0];
        if (!bestPlacement) continue;
        placeWord(board, w, bestPlacement.dir, bestPlacement.row, bestPlacement.col);
        used.add(w.answer);
        progress = true;
      }
    }
  }

  // ── P8I: buang kata terisolasi (0 perpotongan) selama jumlah ≥ minWords —
  // menjamin setiap kata dapat disilangkan dan petunjuknya terhubung. ──
  let dropped = true;
  while (dropped && board.placed.length > cfg.minWords) {
    dropped = false;
    const letterCount = new Map<string, number>();
    for (const p of board.placed) {
      for (const [r, c] of wordCells(p)) {
        const k = key(r, c);
        letterCount.set(k, (letterCount.get(k) || 0) + 1);
      }
    }
    for (let i = 0; i < board.placed.length && !dropped; i++) {
      const p = board.placed[i];
      const crosses = wordCells(p).some(([r, c]) => (letterCount.get(key(r, c)) || 0) > 1);
      if (!crosses) {
        board.placed.splice(i, 1);
        dropped = true;
      }
    }
  }

  // Nomor urut klasik: pindai baris demi baris, beri nomor pada sel awal kata;
  // dua arah yang berbagi sel awal mendapat nomor sama, seperti teka-teki nyata.
  const startNumbers = new Map<string, number>();
  let nextNumber = 1;
  for (const p of board.placed) {
    const k = key(p.row, p.col);
    if (!startNumbers.has(k)) startNumbers.set(k, nextNumber++);
  }

  const words: TtsWordDef[] = board.placed.map((p) => ({
    number: startNumbers.get(key(p.row, p.col)) ?? 1,
    dir: p.dir,
    answer: p.word.answer,
    clue: p.word.clue,
    row: p.row,
    col: p.col,
  }));

  // Bounding box → ukuran grid. Kata memakai koordinat absolut (tanpa shift),
  // jadi grid harus menjangkau indeks 0..maxR → tinggi = maxR + 1.
  let maxR = -Infinity, maxC = -Infinity;
  for (const p of board.placed) {
    for (const [r, c] of wordCells(p)) {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
  }
  if (!Number.isFinite(maxR)) {
    maxR = maxC = -1;
  }
  const rows = Math.max(cfg.minRows, maxR + 1);
  const cols = Math.max(cfg.minCols, maxC + 1);

  if (words.length === 0) {
    return buildPuzzle({ level: 1, seed: options.seed });
  }

  return {
    id: cfg.level,
    title: cfg.title,
    subtitle: cfg.subtitle,
    mascot: cfg.mascot,
    rows,
    cols,
    words,
  };
}
