"use client";

/**
 * Teka-Teki Silang — 10 level berjenjang (grid & kesulitan naik bertahap),
 * pemain pilih durasi 1-10 menit sebelum mulai, maskot Zelby/Hazel/Alby
 * menemani sesi baca petunjuk dan merayakan tiap kata & puzzle yang selesai.
 * XP & Koin dihitung dari akurasi, penalti petunjuk, dan bonus kecepatan.
 *
 * Mengikuti pola arsitektur Irama Kata: layar start -> pilih level -> atur
 * waktu -> main -> hasil, progres + ekonomi tersimpan di localStorage, XP
 * dikirim ke /api/game/xp.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { setQuiet } from "@/lib/notif-quiet"
import {
  X, Play, RotateCcw, ChevronRight, Lock, Star, Trophy, Lightbulb,
  Eraser, CheckCircle2, Grid3x3, ArrowRight, ArrowDown, Clock, Coins, Zap,
} from "lucide-react";

/* ---------- Data ---------- */
type Dir = "A" | "D";
type WordDef = { number: number; dir: Dir; answer: string; clue: string; row: number; col: number };
type Mascot = "zelby" | "hazel" | "alby";
type Puzzle = { id: number; title: string; subtitle: string; mascot: Mascot; rows: number; cols: number; words: WordDef[] };

const PUZZLES: Puzzle[] = [
  { id: 1, title: "Keluarga Inti", subtitle: "Kosakata dasar seputar keluarga", mascot: "zelby", rows: 5, cols: 5, words: [
    { number: 1, dir: "A", answer: "IBU", clue: "Orang tua perempuan", row: 0, col: 1 },
    { number: 2, dir: "D", answer: "BAPAK", clue: "Orang tua laki-laki", row: 0, col: 2 },
    { number: 3, dir: "D", answer: "ADIK", clue: "Saudara yang lebih muda", row: 1, col: 0 },
    { number: 4, dir: "A", answer: "KAKAK", clue: "Saudara yang lebih tua", row: 4, col: 0 },
  ]},
  { id: 2, title: "Kelas Kata", subtitle: "Kenali jenis-jenis kata dasar", mascot: "zelby", rows: 8, cols: 8, words: [
    { number: 1, dir: "D", answer: "VERBA", clue: "Kata kerja, contoh: makan, lari", row: 0, col: 7 },
    { number: 2, dir: "A", answer: "NOMINA", clue: "Kata benda, contoh: meja, kucing", row: 4, col: 2 },
    { number: 2, dir: "D", answer: "NAMA", clue: "Sebutan atau identitas seseorang", row: 4, col: 2 },
    { number: 3, dir: "D", answer: "IBU", clue: "Orang tua perempuan", row: 4, col: 5 },
    { number: 4, dir: "A", answer: "ADA", clue: "Kata yang menyatakan keberadaan", row: 5, col: 0 },
    { number: 5, dir: "A", answer: "MATA", clue: "Indra penglihatan", row: 7, col: 1 },
  ]},
  { id: 3, title: "Ejaan Baku", subtitle: "Bedakan ejaan baku dan tidak baku", mascot: "zelby", rows: 11, cols: 6, words: [
    { number: 1, dir: "A", answer: "KARIER", clue: "Ejaan baku dari 'karir'", row: 0, col: 0 },
    { number: 2, dir: "D", answer: "RISIKO", clue: "Ejaan baku dari 'resiko'", row: 0, col: 2 },
    { number: 3, dir: "D", answer: "NASIHAT", clue: "Ejaan baku dari 'nasehat'", row: 4, col: 0 },
    { number: 4, dir: "D", answer: "TEKNIK", clue: "Ejaan baku dari 'tehnik'", row: 4, col: 4 },
    { number: 5, dir: "A", answer: "APOTEK", clue: "Ejaan baku untuk tempat membeli obat (bukan apotik)", row: 5, col: 0 },
    { number: 6, dir: "A", answer: "IZIN", clue: "Ejaan baku dari 'ijin'", row: 8, col: 2 },
  ]},
  { id: 4, title: "Sinonim", subtitle: "Cari padanan kata yang bermakna sama", mascot: "hazel", rows: 10, cols: 7, words: [
    { number: 1, dir: "A", answer: "MUNGIL", clue: "Sinonim dari 'kecil' (bernada imut)", row: 0, col: 0 },
    { number: 2, dir: "D", answer: "INDAH", clue: "Sinonim dari 'cantik' (untuk pemandangan)", row: 0, col: 4 },
    { number: 3, dir: "A", answer: "PANDAI", clue: "Sinonim dari 'pintar'", row: 3, col: 0 },
    { number: 4, dir: "D", answer: "AGUNG", clue: "Sinonim dari 'besar' (bermakna mulia)", row: 3, col: 1 },
    { number: 5, dir: "D", answer: "RIANG", clue: "Sinonim dari 'gembira'", row: 5, col: 3 },
    { number: 6, dir: "A", answer: "GIAT", clue: "Sinonim dari 'rajin'", row: 7, col: 1 },
    { number: 7, dir: "A", answer: "TANGKAS", clue: "Sinonim dari 'cekatan'", row: 9, col: 0 },
  ]},
  { id: 5, title: "Antonim", subtitle: "Cari lawan kata yang tepat", mascot: "hazel", rows: 7, cols: 11, words: [
    { number: 1, dir: "D", answer: "TINGGI", clue: "Antonim dari 'rendah'", row: 0, col: 0 },
    { number: 2, dir: "D", answer: "CEPAT", clue: "Antonim dari 'lambat'", row: 0, col: 3 },
    { number: 3, dir: "A", answer: "KERAS", clue: "Antonim dari 'lembut'", row: 1, col: 2 },
    { number: 4, dir: "D", answer: "SEMPIT", clue: "Antonim dari 'luas'", row: 1, col: 6 },
    { number: 5, dir: "D", answer: "BASAH", clue: "Antonim dari 'kering'", row: 1, col: 10 },
    { number: 6, dir: "A", answer: "GELAP", clue: "Antonim dari 'terang'", row: 3, col: 0 },
    { number: 7, dir: "A", answer: "MALAS", clue: "Antonim dari 'rajin'", row: 3, col: 6 },
    { number: 8, dir: "A", answer: "TUA", clue: "Antonim dari 'muda'", row: 6, col: 6 },
  ]},
  { id: 6, title: "Unsur Sastra", subtitle: "Istilah dalam karya sastra", mascot: "hazel", rows: 12, cols: 9, words: [
    { number: 1, dir: "A", answer: "LATAR", clue: "Tempat, waktu, dan suasana dalam cerita", row: 0, col: 0 },
    { number: 2, dir: "D", answer: "AMANAT", clue: "Pesan moral dalam sebuah cerita", row: 0, col: 1 },
    { number: 3, dir: "A", answer: "PUISI", clue: "Karya sastra terikat rima dan irama", row: 3, col: 4 },
    { number: 3, dir: "D", answer: "PROSA", clue: "Karya sastra bebas, tidak terikat rima", row: 3, col: 4 },
    { number: 4, dir: "A", answer: "ALUR", clue: "Rangkaian peristiwa dalam cerita", row: 4, col: 1 },
    { number: 5, dir: "A", answer: "TEMA", clue: "Gagasan pokok sebuah cerita", row: 7, col: 1 },
    { number: 5, dir: "D", answer: "TOKOH", clue: "Pelaku dalam sebuah cerita", row: 7, col: 1 },
  ]},
  { id: 7, title: "Imbuhan", subtitle: "Kata berimbuhan me-, di-, ke-an, ber-, per-an", mascot: "hazel", rows: 12, cols: 11, words: [
    { number: 1, dir: "D", answer: "KEBAIKAN", clue: "Bentukan kata dasar 'baik' + imbuhan ke-an", row: 0, col: 4 },
    { number: 2, dir: "A", answer: "PENULIS", clue: "Orang yang menulis, kata dasar 'tulis' + pe-", row: 1, col: 3 },
    { number: 3, dir: "A", answer: "MAKANAN", clue: "Bentukan kata dasar 'makan' + akhiran -an", row: 3, col: 1 },
    { number: 4, dir: "D", answer: "BERLARI", clue: "Bentukan kata dasar 'lari' + awalan ber-", row: 4, col: 10 },
    { number: 5, dir: "D", answer: "DIBACA", clue: "Bentukan kata dasar 'baca' + awalan di-", row: 6, col: 7 },
    { number: 6, dir: "A", answer: "MENULIS", clue: "Bentukan kata dasar 'tulis' + awalan me-", row: 7, col: 2 },
    { number: 7, dir: "A", answer: "PELAJAR", clue: "Bentukan kata dasar 'ajar' + awalan pe-", row: 9, col: 4 },
    { number: 8, dir: "A", answer: "PERSATUAN", clue: "Bentukan kata dasar 'satu' + imbuhan per-an", row: 11, col: 0 },
  ]},
  { id: 8, title: "EYD Lanjut", subtitle: "Istilah ejaan dan tanda baca", mascot: "alby", rows: 8, cols: 12, words: [
    { number: 1, dir: "A", answer: "SERU", clue: "Tanda baca untuk kalimat perintah/seruan", row: 0, col: 8 },
    { number: 2, dir: "D", answer: "EJAAN", clue: "Kaidah cara menuliskan kata dan kalimat", row: 0, col: 9 },
    { number: 3, dir: "D", answer: "KAPITAL", clue: "Jenis huruf besar di awal kalimat/nama", row: 1, col: 6 },
    { number: 4, dir: "D", answer: "HURUF", clue: "Lambang bunyi bahasa dalam tulisan", row: 2, col: 1 },
    { number: 5, dir: "D", answer: "TITIK", clue: "Tanda baca untuk mengakhiri kalimat berita", row: 2, col: 3 },
    { number: 6, dir: "A", answer: "TANDA", clue: "Simbol baca seperti titik, koma, dan seru", row: 2, col: 5 },
    { number: 7, dir: "A", answer: "KUTIP", clue: "Tanda baca untuk mengapit kalimat langsung", row: 3, col: 0 },
    { number: 8, dir: "A", answer: "MIRING", clue: "Gaya huruf untuk istilah asing, huruf ...", row: 4, col: 5 },
    { number: 9, dir: "A", answer: "KOMA", clue: "Tanda baca untuk jeda pendek dalam kalimat", row: 6, col: 3 },
  ]},
  { id: 9, title: "Majas & Gaya Bahasa", subtitle: "Istilah majas dalam karya sastra", mascot: "alby", rows: 13, cols: 12, words: [
    { number: 1, dir: "D", answer: "PARADOKS", clue: "Majas yang tampak bertentangan tapi mengandung kebenaran", row: 0, col: 0 },
    { number: 2, dir: "D", answer: "SINDIRAN", clue: "Ungkapan tidak langsung untuk mengkritik", row: 0, col: 7 },
    { number: 3, dir: "A", answer: "ANTITESIS", clue: "Majas yang memakai pasangan kata berlawanan", row: 1, col: 0 },
    { number: 4, dir: "D", answer: "HIPERBOLA", clue: "Majas yang melebih-lebihkan sesuatu", row: 3, col: 5 },
    { number: 5, dir: "A", answer: "SIMILE", clue: "Majas perbandingan pakai kata 'seperti' atau 'bagai'", row: 4, col: 4 },
    { number: 6, dir: "D", answer: "REPETISI", clue: "Majas pengulangan kata untuk penegasan", row: 5, col: 2 },
    { number: 7, dir: "A", answer: "IRONI", clue: "Majas sindiran yang berlawanan dari makna sebenarnya", row: 7, col: 4 },
    { number: 8, dir: "A", answer: "METAFORA", clue: "Majas perbandingan langsung tanpa kata 'seperti'", row: 9, col: 0 },
    { number: 9, dir: "A", answer: "ALEGORI", clue: "Majas kiasan berbentuk cerita utuh", row: 11, col: 5 },
  ]},
  { id: 10, title: "Ujian Akhir", subtitle: "Campuran semua tema — level terberat", mascot: "alby", rows: 11, cols: 14, words: [
    { number: 1, dir: "D", answer: "IRONI", clue: "Majas sindiran yang berlawanan dari makna sebenarnya", row: 0, col: 4 },
    { number: 2, dir: "A", answer: "PROSA", clue: "Karya sastra bebas, tidak terikat rima", row: 1, col: 3 },
    { number: 3, dir: "D", answer: "MENULIS", clue: "Bentukan kata dasar 'tulis' + awalan me-", row: 1, col: 9 },
    { number: 4, dir: "D", answer: "KAPITAL", clue: "Jenis huruf besar di awal kalimat/nama", row: 2, col: 0 },
    { number: 5, dir: "D", answer: "SINONIM", clue: "Kata yang bermakna sama dengan kata lain", row: 3, col: 2 },
    { number: 6, dir: "A", answer: "AMANAT", clue: "Pesan moral dalam sebuah cerita", row: 3, col: 6 },
    { number: 6, dir: "D", answer: "ANTONIM", clue: "Kata yang bermakna berlawanan", row: 3, col: 6 },
    { number: 7, dir: "A", answer: "PUISI", clue: "Karya sastra terikat rima dan irama", row: 4, col: 0 },
    { number: 8, dir: "D", answer: "TOKOH", clue: "Pelaku dalam sebuah cerita", row: 6, col: 11 },
    { number: 9, dir: "D", answer: "EJAAN", clue: "Kaidah cara menuliskan kata dan kalimat", row: 6, col: 13 },
    { number: 10, dir: "A", answer: "NOMINA", clue: "Kata benda, contoh: meja, kucing", row: 7, col: 2 },
    { number: 11, dir: "A", answer: "METAFORA", clue: "Majas perbandingan langsung tanpa kata 'seperti'", row: 9, col: 6 },
  ]},
];

const THEME = ["#FF6B6B", "#F59E0B", "#10B981", "#38BDF8", "#8B5CF6"];
const TIME_OPTIONS = [1, 2, 3, 5, 7, 10];

/* ---------- Maskot: Zelby (teal, ceria), Hazel (koral, hangat), Alby (emas, gagah) ---------- */
const MASCOTS: Record<Mascot, { name: string; body: string; accent: string; cheer: string[] }> = {
  zelby: { name: "Zelby", body: "#2DD4BF", accent: "#0F766E", cheer: ["Keren!", "Betul!", "Hebat!"] },
  hazel: { name: "Hazel", body: "#FB7185", accent: "#9F1239", cheer: ["Mantap!", "Tepat!", "Asyik!"] },
  alby: { name: "Alby", body: "#FBBF24", accent: "#92400E", cheer: ["Jenius!", "Sip!", "Top!"] },
};

function MascotFace({ mascot, celebrating }: { mascot: Mascot; celebrating: boolean }) {
  const m = MASCOTS[mascot];
  return (
    <svg viewBox="0 0 100 100" className={`w-14 h-14 ${celebrating ? "tts-mascot-cheer" : "tts-mascot-idle"}`}>
      <ellipse cx="50" cy="58" rx="34" ry="30" fill={m.body} stroke="#161B3A" strokeWidth="4" />
      <circle cx="26" cy="30" r="7" fill={m.body} stroke="#161B3A" strokeWidth="4" />
      <circle cx="74" cy="30" r="7" fill={m.body} stroke="#161B3A" strokeWidth="4" />
      <circle cx="38" cy="52" r="6" fill="#161B3A" />
      <circle cx="62" cy="52" r="6" fill="#161B3A" />
      <circle cx="40" cy="50" r="1.8" fill="#fff" />
      <circle cx="64" cy="50" r="1.8" fill="#fff" />
      {celebrating ? (
        <path d="M38 68 Q50 82 62 68" stroke="#161B3A" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M40 68 Q50 74 60 68" stroke="#161B3A" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      <circle cx="28" cy="62" r="4" fill={m.accent} opacity="0.5" />
      <circle cx="72" cy="62" r="4" fill={m.accent} opacity="0.5" />
    </svg>
  );
}

/* ---------- Kumpulan sel per teka-teki ---------- */
type Cell = { row: number; col: number; number?: number; letter: string };
function buildCells(p: Puzzle) {
  const map = new Map<string, Cell>();
  for (const w of p.words) {
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.dir === "A" ? w.row : w.row + i;
      const c = w.dir === "A" ? w.col + i : w.col;
      const key = `${r},${c}`;
      const existing = map.get(key);
      if (!existing) map.set(key, { row: r, col: c, letter: w.answer[i] });
    }
  }
  for (const w of p.words) {
    const key = `${w.row},${w.col}`;
    const cell = map.get(key);
    if (cell && cell.number == null) cell.number = w.number;
  }
  return map;
}

/* ---------- Progres & ekonomi tersimpan ---------- */
type Saved = { unlocked: number[]; best: Record<number, number>; xp: number; coins: number };
function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem("tts-progress-v2");
    if (raw) {
      const d = JSON.parse(raw);
      return { unlocked: d.unlocked || [1], best: d.best || {}, xp: d.xp || 0, coins: d.coins || 0 };
    }
  } catch { /* abaikan */ }
  return { unlocked: [1], best: {}, xp: 0, coins: 0 };
}
function saveSaved(s: Saved) {
  try { localStorage.setItem("tts-progress-v2", JSON.stringify(s)); } catch { /* abaikan */ }
}

function starsFor(pct: number, hintsUsed: number): number {
  if (pct >= 100 && hintsUsed === 0) return 3;
  if (pct >= 100) return 2;
  if (pct >= 70) return 1;
  return 0;
}

/* XP: dasar naik per level, dipotong tiap petunjuk, bonus 20% kalau 100%
 * akurasi & masih sisa >20% dari waktu yang dipilih. Dibatasi biar nggak
 * bisa digrinding di level rendah. */
function calcXP(levelId: number, pct: number, hintsUsed: number, timeUsedSec: number, timeBudgetSec: number) {
  const base = levelId * 8;
  let xp = base * (pct / 100) - hintsUsed * 4;
  const remainRatio = timeBudgetSec > 0 ? (timeBudgetSec - timeUsedSec) / timeBudgetSec : 0;
  if (pct === 100 && remainRatio > 0.2) xp *= 1.2;
  const cap = levelId * 12;
  return Math.max(0, Math.min(cap, Math.round(xp)));
}
function calcCoins(stars: number, levelId: number) {
  return stars * levelId;
}

export default function TekaTekiSilang() {
  const [screen, setScreen] = useState<"start" | "levels" | "setup" | "game" | "result">("start");
  const [saved, setSaved] = useState<Saved>({ unlocked: [1], best: {}, xp: 0, coins: 0 });
  const [puzzleId, setPuzzleId] = useState(1);
  const [timeMinutes, setTimeMinutes] = useState(5);

  const puzzle = PUZZLES.find((p) => p.id === puzzleId) || PUZZLES[0];
  const cells = useMemo(() => buildCells(puzzle), [puzzle]);
  const color = THEME[(puzzle.id - 1) % THEME.length];
  const mascot = puzzle.mascot;

  const [grid, setGrid] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [dir, setDir] = useState<Dir>("A");
  const [activeWordNum, setActiveWordNum] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [result, setResult] = useState<{ pct: number; stars: number; hints: number; time: number; xp: number; coins: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [cheerText, setCheerText] = useState<string | null>(null);
  const [bigCelebrate, setBigCelebrate] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cheerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedWordsRef = useRef<Set<string>>(new Set());
  const xpSentRef = useRef(false);
  const timeBudgetRef = useRef(0);
  const elapsedRef = useRef(0);

  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(screen === "game")
    return () => setQuiet(false)
  }, [screen]);

  useEffect(() => { setSaved(loadSaved()); }, []);

  const wordsAt = useCallback((row: number, col: number) => {
    return puzzle.words.filter((w) => {
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.dir === "A" ? w.row : w.row + i;
        const c = w.dir === "A" ? w.col + i : w.col;
        if (r === row && c === col) return true;
      }
      return false;
    });
  }, [puzzle]);

  const activeWord = useMemo(() => {
    if (!selected) return null;
    const options = wordsAt(selected.row, selected.col);
    return options.find((w) => w.dir === dir) || options[0] || null;
  }, [selected, dir, wordsAt]);

  useEffect(() => { setActiveWordNum(activeWord?.number ?? null); }, [activeWord]);

  const wordCellKeys = useCallback((w: WordDef) => {
    const keys: string[] = [];
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.dir === "A" ? w.row : w.row + i;
      const c = w.dir === "A" ? w.col + i : w.col;
      keys.push(`${r},${c}`);
    }
    return keys;
  }, []);

  const focusCell = (row: number, col: number) => inputRefs.current[`${row},${col}`]?.focus();

  const selectCell = (row: number, col: number) => {
    const key = `${row},${col}`;
    if (!cells.has(key)) return;
    if (selected && selected.row === row && selected.col === col) {
      const options = wordsAt(row, col);
      if (options.length > 1) setDir((d) => (d === "A" ? "D" : "A"));
    } else {
      setSelected({ row, col });
      const options = wordsAt(row, col);
      if (!options.find((w) => w.dir === dir)) setDir(options[0]?.dir || "A");
    }
    focusCell(row, col);
  };

  const moveNext = (w: WordDef, fromKey: string) => {
    const keys = wordCellKeys(w);
    const idx = keys.indexOf(fromKey);
    if (idx >= 0 && idx < keys.length - 1) {
      const [r, c] = keys[idx + 1].split(",").map(Number);
      setSelected({ row: r, col: c });
      focusCell(r, c);
    }
  };
  const movePrev = (w: WordDef, fromKey: string) => {
    const keys = wordCellKeys(w);
    const idx = keys.indexOf(fromKey);
    if (idx > 0) {
      const [r, c] = keys[idx - 1].split(",").map(Number);
      setSelected({ row: r, col: c });
      focusCell(r, c);
    }
  };

  const fireCheer = useCallback(() => {
    const m = MASCOTS[mascot];
    setCheerText(m.cheer[Math.floor(Math.random() * m.cheer.length)]);
    setCelebrating(true);
    if (cheerTimeoutRef.current) clearTimeout(cheerTimeoutRef.current);
    cheerTimeoutRef.current = setTimeout(() => { setCelebrating(false); setCheerText(null); }, 1100);
  }, [mascot]);

  /* Cek tiap kata yang menyentuh sel yang baru diisi — kalau lengkap & benar
   * dan belum pernah dirayakan, mascot merayakan. */
  const checkWordCompletion = useCallback((row: number, col: number, nextGrid: Record<string, string>) => {
    const involved = wordsAt(row, col);
    for (const w of involved) {
      const key = `${w.number}${w.dir}`;
      if (completedWordsRef.current.has(key)) continue;
      const keys = wordCellKeys(w);
      const allCorrect = keys.every((k, i) => nextGrid[k] === w.answer[i]);
      if (allCorrect) {
        completedWordsRef.current.add(key);
        fireCheer();
      }
    }
  }, [wordsAt, wordCellKeys, fireCheer]);

  const onType = (row: number, col: number, raw: string) => {
    if (timeUp) return;
    const key = `${row},${col}`;
    const ch = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    if (!ch) return;
    setGrid((g) => {
      const next = { ...g, [key]: ch };
      checkWordCompletion(row, col, next);
      return next;
    });
    setChecked((c) => ({ ...c, [key]: null }));
    if (activeWord) moveNext(activeWord, key);
  };

  const onKeyDown = (row: number, col: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = `${row},${col}`;
    if (e.key === "Backspace") {
      if (grid[key]) {
        setGrid((g) => { const n = { ...g }; delete n[key]; return n; });
        setChecked((c) => ({ ...c, [key]: null }));
      } else if (activeWord) {
        movePrev(activeWord, key);
      }
      e.preventDefault();
    } else if (e.key === "ArrowRight") { selectCell(row, col + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { selectCell(row, col - 1); e.preventDefault(); }
    else if (e.key === "ArrowDown") { selectCell(row + 1, col); e.preventDefault(); }
    else if (e.key === "ArrowUp") { selectCell(row - 1, col); e.preventDefault(); }
  };

  const totalCells = cells.size;
  const filledCells = useMemo(() => Array.from(cells.keys()).filter((k) => grid[k]).length, [cells, grid]);
  const correctCells = useMemo(
    () => Array.from(cells.entries()).filter(([k, c]) => grid[k] === c.letter).length,
    [cells, grid]
  );

  const finishGame = useCallback((viaTimeout: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const pct = totalCells === 0 ? 0 : Math.round((correctCells / totalCells) * 100);
    const stars = viaTimeout ? Math.min(1, starsFor(pct, hintsUsed)) : starsFor(pct, hintsUsed);
    const timeUsed = timeBudgetRef.current - remainingSec;
    const xp = calcXP(puzzle.id, pct, hintsUsed, timeUsed, timeBudgetRef.current);
    const coins = calcCoins(stars, puzzle.id);
    setResult({ pct, stars, hints: hintsUsed, time: timeUsed, xp, coins });
    if (pct === 100) setBigCelebrate(true);
    setScreen("result");

    setSaved((prev) => {
      const next: Saved = { unlocked: [...prev.unlocked], best: { ...prev.best }, xp: prev.xp + xp, coins: prev.coins + coins };
      if (pct === 100) {
        if (!next.best[puzzle.id] || pct > next.best[puzzle.id]) next.best[puzzle.id] = pct;
        const nid = puzzle.id + 1;
        if (nid <= PUZZLES.length && !next.unlocked.includes(nid)) next.unlocked.push(nid);
      }
      saveSaved(next);
      return next;
    });

    if (!xpSentRef.current && xp > 0) {
      xpSentRef.current = true;
      let supabaseId = "";
      try { supabaseId = JSON.parse(localStorage.getItem("bc-user") || "{}").state?.supabaseId || ""; } catch { /* abaikan */ }
      fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: pct, correct: correctCells, wrong: totalCells - correctCells,
          maxStreak: 0, xpEarned: xp, gameType: "TEKA_TEKI_SILANG", supabaseId,
        }),
      }).catch(() => { /* abaikan */ });
    }
  }, [totalCells, correctCells, hintsUsed, remainingSec, puzzle.id]);

  /* Timer countdown */
  useEffect(() => {
    if (screen !== "game" || timeUp) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          setTimeUp(true);
          finishGame(true);
          return 0;
        }
        elapsedRef.current += 1;
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, timeUp]);

  const checkAnswers = () => {
    const next: Record<string, "correct" | "wrong" | null> = {};
    let allCorrect = true;
    let anyFilled = false;
    cells.forEach((c, k) => {
      if (!grid[k]) { next[k] = null; allCorrect = false; return; }
      anyFilled = true;
      if (grid[k] === c.letter) next[k] = "correct";
      else { next[k] = "wrong"; allCorrect = false; }
    });
    setChecked(next);
    if (allCorrect && anyFilled) finishGame(false);
  };

  const useHint = () => {
    if (!activeWord || timeUp) return;
    const keys = wordCellKeys(activeWord);
    const emptyOrWrong = keys.find((k) => grid[k] !== cells.get(k)?.letter);
    if (!emptyOrWrong) return;
    const cell = cells.get(emptyOrWrong)!;
    setGrid((g) => {
      const next = { ...g, [emptyOrWrong]: cell.letter };
      checkWordCompletion(cell.row, cell.col, next);
      return next;
    });
    setChecked((c) => ({ ...c, [emptyOrWrong]: "correct" }));
    setHintsUsed((h) => h + 1);
  };

  const clearAll = () => { setGrid({}); setChecked({}); };

  const openSetup = (id: number) => { setPuzzleId(id); setScreen("setup"); };

  const startPuzzle = () => {
    setGrid({});
    setChecked({});
    setSelected(null);
    setDir("A");
    setHintsUsed(0);
    setResult(null);
    setTimeUp(false);
    setBigCelebrate(false);
    setCelebrating(false);
    setCheerText(null);
    completedWordsRef.current = new Set();
    xpSentRef.current = false;
    elapsedRef.current = 0;
    const budget = timeMinutes * 60;
    timeBudgetRef.current = budget;
    setRemainingSec(budget);
    setScreen("game");
  };

  const chunky = "border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A]";
  const btn = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  const mendatar = puzzle.words.filter((w) => w.dir === "A").sort((a, b) => a.number - b.number);
  const menurun = puzzle.words.filter((w) => w.dir === "D").sort((a, b) => a.number - b.number);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timeLow = remainingSec <= 20 && remainingSec > 0;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] text-[#161B3A]">
      <style>{`
        @keyframes tts-float1{0%,100%{transform:translate(0,0) rotate(6deg)}50%{transform:translate(16px,-22px) rotate(18deg)}}
        @keyframes tts-float2{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-18px,16px) rotate(-12deg)}}
        @keyframes tts-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes tts-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tts-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes tts-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
        @keyframes tts-idle{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-4px) rotate(-2deg)}}
        @keyframes tts-cheer{0%{transform:scale(1) rotate(0)}25%{transform:scale(1.25) rotate(-8deg)}50%{transform:scale(1.1) rotate(8deg) translateY(-10px)}75%{transform:scale(1.2) rotate(-4deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes tts-bubble{0%{opacity:0;transform:translateY(6px) scale(.8)}15%{opacity:1;transform:translateY(0) scale(1)}85%{opacity:1}100%{opacity:0;transform:translateY(-6px) scale(.9)}}
        @keyframes tts-confetti{0%{transform:translateY(-10px) rotate(0);opacity:1}100%{transform:translateY(420px) rotate(540deg);opacity:0}}
        .tts-screen{animation:tts-fade .35s ease}
        .tts-star-lit{animation:tts-pop .5s ease}
        .tts-logo{animation:tts-pulse 1.4s ease-in-out infinite}
        .tts-wrong{animation:tts-shake .3s ease}
        .tts-cell{caret-color:transparent}
        .tts-mascot-idle{animation:tts-idle 2.2s ease-in-out infinite}
        .tts-mascot-cheer{animation:tts-cheer .7s ease}
        .tts-bubble{animation:tts-bubble 1.1s ease}
        .tts-confetti-piece{position:absolute;top:0;animation:tts-confetti 1.8s ease-in forwards}
      `}</style>
      <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#38BDF8] border-4 border-[#161B3A] rounded-3xl" style={{ animation: "tts-float1 9s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#FBBF24] border-4 border-[#161B3A] rounded-full" style={{ animation: "tts-float2 10s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#10B981] border-4 border-[#161B3A] rounded-2xl" style={{ animation: "tts-float1 11s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#FF6B6B] border-4 border-[#161B3A] rounded-[30%_70%_70%_30%]" style={{ animation: "tts-float2 8s ease-in-out infinite" }} />

      {bigCelebrate && (
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
          {Array.from({ length: 26 }).map((_, i) => (
            <div key={i} className="tts-confetti-piece" style={{
              left: `${(i * 137) % 100}%`,
              width: 8, height: 8,
              background: THEME[i % THEME.length],
              animationDelay: `${(i % 10) * 0.08}s`,
              borderRadius: i % 2 === 0 ? "2px" : "50%",
            }} />
          ))}
        </div>
      )}

      <div className="relative max-w-2xl mx-auto px-4 py-5 min-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`tts-logo w-11 h-11 bg-[#38BDF8] rounded-2xl ${chunky} !shadow-[4px_4px_0_#161B3A] flex items-center justify-center`}>
              <Grid3x3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-xl leading-none font-game-display">Teka-Teki Silang</div>
              <div className="text-[11px] font-semibold opacity-60 mt-0.5">Isi kotak, asah kosakata</div>
            </div>
          </div>
          {screen === "game" && (
            <div className={`rounded-xl border-[3px] border-[#161B3A] px-3 py-1.5 shadow-[3px_3px_0_#161B3A] font-extrabold text-sm flex items-center gap-1.5 ${timeLow ? "bg-[#FF6B6B] text-white" : "bg-white"}`}>
              <Clock className="w-4 h-4" /> {fmtTime(remainingSec)}
            </div>
          )}
        </div>

        {screen !== "start" && screen !== "game" && (
          <div className="flex items-center gap-2.5 mb-4 text-xs font-extrabold">
            <span className="flex items-center gap-1 bg-white border-[3px] border-[#161B3A] rounded-full px-2.5 py-1 shadow-[2px_2px_0_#161B3A]">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> {saved.xp} XP
            </span>
            <span className="flex items-center gap-1 bg-white border-[3px] border-[#161B3A] rounded-full px-2.5 py-1 shadow-[2px_2px_0_#161B3A]">
              <Coins className="w-3.5 h-3.5 text-yellow-600" /> {saved.coins} Koin
            </span>
          </div>
        )}

        {/* ---------- MULAI ---------- */}
        {screen === "start" && (
          <div className={`tts-screen bg-white rounded-3xl ${chunky} p-6 text-center`}>
            <span className="inline-block px-4 py-1.5 bg-[#38BDF8] text-white border-[3px] border-[#161B3A] rounded-full font-extrabold text-xs shadow-[3px_3px_0_#161B3A] mb-4">
              10 Level Berjenjang · Ditemani Zelby, Hazel & Alby
            </span>
            <div className="flex justify-center gap-2 mb-4">
              <MascotFace mascot="zelby" celebrating={false} />
              <MascotFace mascot="hazel" celebrating={false} />
              <MascotFace mascot="alby" celebrating={false} />
            </div>
            <h1 className="font-extrabold text-4xl mb-2">Isi Kotak yang <span className="text-[#38BDF8]">Tepat!</span></h1>
            <p className="opacity-70 text-sm max-w-md mx-auto mb-5">
              Mulai dari grid kecil dan kata sederhana, makin naik level makin besar & berat soalnya. Pilih durasi waktu, isi kotak, dan biarkan maskotmu merayakan tiap kata yang benar!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button className={`${btn} px-6 py-3.5 bg-[#38BDF8] text-white text-lg`} onClick={() => setScreen("levels")}>
                <Play className="w-5 h-5" /> Main Sekarang
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-6 text-center">
              <div className="bg-[#10B981] text-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-80">3 Bintang</div>
                <div className="font-extrabold text-sm">Selesai, 0 petunjuk</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">XP & Koin</div>
                <div className="font-extrabold text-sm">Naik tiap level</div>
              </div>
              <div className="bg-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Bonus</div>
                <div className="font-extrabold text-sm">Selesai cepat +20%</div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- PILIH TEKA-TEKI ---------- */}
        {screen === "levels" && (
          <div className={`tts-screen bg-white rounded-3xl ${chunky} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <button className={`${btn} w-11 h-11 bg-white`} onClick={() => setScreen("start")} aria-label="Kembali">
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-extrabold text-2xl">Pilih Level</h2>
              <div className="w-11" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PUZZLES.map((p) => {
                const unlocked = saved.unlocked.includes(p.id);
                const best = saved.best[p.id] || 0;
                const st = starsFor(best, 0);
                const c = THEME[(p.id - 1) % THEME.length];
                return (
                  <button
                    key={p.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && openSetup(p.id)}
                    className={`text-left rounded-2xl border-4 border-[#161B3A] p-4 transition-transform ${
                      unlocked ? "shadow-[5px_5px_0_#161B3A] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-[5px_5px_0_#9CA3AF]"
                    }`}
                    style={unlocked ? { background: c, color: "#fff" } : undefined}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-extrabold text-2xl leading-none">#{p.id}</span>
                      {unlocked
                        ? <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/15">{p.rows}×{p.cols} · {p.words.length} kata</span>
                        : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="font-extrabold text-base leading-tight mb-0.5">{p.title}</div>
                    <div className="text-[11px] font-semibold opacity-85 mb-2">{p.subtitle}</div>
                    {unlocked ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star key={i} className="w-4 h-4" fill={i <= st ? "currentColor" : "none"} style={{ opacity: i <= st ? 1 : 0.35 }} />
                        ))}
                        {best > 0 && <span className="text-[10px] font-extrabold ml-1.5 opacity-90">{best}%</span>}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold">Selesaikan level sebelumnya</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------- ATUR WAKTU ---------- */}
        {screen === "setup" && (
          <div className={`tts-screen bg-white rounded-3xl ${chunky} p-6 text-center`}>
            <button className={`${btn} w-11 h-11 bg-white mb-4`} onClick={() => setScreen("levels")} aria-label="Kembali">
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-3">
              <MascotFace mascot={mascot} celebrating={false} />
            </div>
            <h2 className="font-extrabold text-2xl mb-1">{puzzle.title}</h2>
            <p className="opacity-70 text-sm mb-5">{puzzle.subtitle} · {puzzle.rows}×{puzzle.cols} · {puzzle.words.length} kata</p>
            <p className="font-extrabold text-sm mb-3">Pilih durasi mengerjakan</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {TIME_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeMinutes(m)}
                  className={`w-14 h-14 rounded-2xl border-4 border-[#161B3A] font-extrabold text-lg transition-transform ${
                    timeMinutes === m ? "shadow-none translate-x-1 translate-y-1" : "shadow-[4px_4px_0_#161B3A] hover:-translate-x-0.5 hover:-translate-y-0.5"
                  }`}
                  style={{ background: timeMinutes === m ? color : "#fff", color: timeMinutes === m ? "#fff" : "#161B3A" }}
                >
                  {m}
                  <div className="text-[9px] font-bold -mt-0.5">min</div>
                </button>
              ))}
            </div>
            <button className={`${btn} px-8 py-3.5 text-white text-lg`} style={{ background: color }} onClick={startPuzzle}>
              <Play className="w-5 h-5" /> Mulai ({timeMinutes} menit)
            </button>
          </div>
        )}

        {/* ---------- MAIN ---------- */}
        {screen === "game" && (
          <div className="tts-screen flex flex-col items-center gap-3">
            {/* HUD */}
            <div className="w-full grid grid-cols-3 gap-2">
              <div className="rounded-xl border-[3px] border-[#161B3A] bg-[#161B3A] text-white px-3 py-1.5 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Terisi</div>
                <div className="font-extrabold text-lg leading-none">{filledCells}/{totalCells}</div>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] px-3 py-1.5 shadow-[3px_3px_0_#161B3A]" style={{ background: color, color: "#fff" }}>
                <div className="text-[9px] font-extrabold uppercase opacity-80">Level {puzzle.id}</div>
                <div className="font-extrabold text-sm leading-none truncate">{puzzle.title}</div>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] bg-[#FBBF24] px-3 py-1.5 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Petunjuk</div>
                <div className="font-extrabold text-lg leading-none">{hintsUsed}</div>
              </div>
            </div>

            {/* Petunjuk aktif + maskot */}
            <div className="w-full rounded-xl border-[3px] border-[#161B3A] bg-white px-3.5 py-2 shadow-[3px_3px_0_#161B3A] flex items-center gap-3 min-h-[60px]">
              <div className="relative shrink-0">
                <MascotFace mascot={mascot} celebrating={celebrating} />
                {cheerText && (
                  <div className="tts-bubble absolute -top-8 left-1/2 -translate-x-1/2 bg-[#161B3A] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap">
                    {cheerText}
                  </div>
                )}
              </div>
              {activeWord ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#161B3A] text-white text-[11px] font-extrabold shrink-0">{activeWord.number}</span>
                  {activeWord.dir === "A" ? <ArrowRight className="w-4 h-4 shrink-0 opacity-60" /> : <ArrowDown className="w-4 h-4 shrink-0 opacity-60" />}
                  <span className="text-sm font-semibold">{activeWord.clue}</span>
                </div>
              ) : (
                <span className="text-sm font-semibold opacity-50">Ketuk sebuah kotak untuk mulai mengisi</span>
              )}
            </div>

            {timeUp && (
              <div className="w-full rounded-xl border-[3px] border-[#FF6B6B] bg-[#FFE2E2] px-3.5 py-2 text-center text-sm font-extrabold text-[#991B1B]">
                Waktu habis! Lihat hasil di bawah.
              </div>
            )}

            {/* Grid */}
            <div className="w-full overflow-x-auto">
              <div
                className="grid mx-auto bg-[#161B3A] rounded-xl border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A] p-1 gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${puzzle.cols}, minmax(28px, 38px))`,
                  gridTemplateRows: `repeat(${puzzle.rows}, minmax(28px, 38px))`,
                  width: "fit-content",
                }}
              >
                {Array.from({ length: puzzle.rows }).map((_, r) =>
                  Array.from({ length: puzzle.cols }).map((__, c) => {
                    const key = `${r},${c}`;
                    const cell = cells.get(key);
                    if (!cell) return <div key={key} className="bg-[#0E1330] rounded-[3px]" />;
                    const isSel = selected?.row === r && selected?.col === c;
                    const inActiveWord = activeWord ? wordCellKeys(activeWord).includes(key) : false;
                    const state = checked[key];
                    let bg = "#FFFFFF";
                    if (state === "correct") bg = "#BBF7D0";
                    else if (state === "wrong") bg = "#FECACA";
                    else if (isSel) bg = "#FDE68A";
                    else if (inActiveWord) bg = "#FEF3C7";
                    return (
                      <div key={key} className={`relative rounded-[3px] ${state === "wrong" ? "tts-wrong" : ""}`} style={{ background: bg }}>
                        {cell.number != null && (
                          <span className="absolute top-[1px] left-[2px] text-[8px] font-extrabold leading-none text-[#161B3A]/70 select-none pointer-events-none">
                            {cell.number}
                          </span>
                        )}
                        <input
                          ref={(el) => { inputRefs.current[key] = el; }}
                          value={grid[key] || ""}
                          onChange={(e) => onType(r, c, e.target.value)}
                          onKeyDown={(e) => onKeyDown(r, c, e)}
                          onFocus={() => selectCell(r, c)}
                          maxLength={1}
                          inputMode="text"
                          autoComplete="off"
                          disabled={timeUp}
                          className="tts-cell w-full h-full bg-transparent text-center font-extrabold text-[14px] outline-none text-[#161B3A]"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Aksi */}
            <div className="w-full flex flex-wrap items-center justify-center gap-2">
              <button className={`${btn} px-4 py-2.5 bg-white text-sm`} onClick={useHint} disabled={timeUp}>
                <Lightbulb className="w-4 h-4" /> Petunjuk
              </button>
              <button className={`${btn} px-4 py-2.5 bg-white text-sm`} onClick={clearAll} disabled={timeUp}>
                <Eraser className="w-4 h-4" /> Bersihkan
              </button>
              <button className={`${btn} px-5 py-2.5 bg-[#10B981] text-white text-sm`} onClick={checkAnswers} disabled={timeUp}>
                <CheckCircle2 className="w-4 h-4" /> Cek Jawaban
              </button>
              <button className={`${btn} w-11 h-11 bg-white`} onClick={() => setScreen("levels")} aria-label="Keluar">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Daftar petunjuk */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border-4 border-[#161B3A] shadow-[4px_4px_0_#161B3A] p-3.5">
                <div className="flex items-center gap-1.5 font-extrabold text-sm mb-2">
                  <ArrowRight className="w-4 h-4" /> Mendatar
                </div>
                <ul className="space-y-1.5">
                  {mendatar.map((w) => (
                    <li key={`A${w.number}`}>
                      <button
                        className={`text-left text-xs font-semibold w-full rounded-lg px-2 py-1 transition-colors ${activeWordNum === w.number && dir === "A" ? "bg-[#FEF3C7]" : "hover:bg-gray-100"}`}
                        onClick={() => { setDir("A"); selectCell(w.row, w.col); }}
                      >
                        <b>{w.number}.</b> {w.clue}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl border-4 border-[#161B3A] shadow-[4px_4px_0_#161B3A] p-3.5">
                <div className="flex items-center gap-1.5 font-extrabold text-sm mb-2">
                  <ArrowDown className="w-4 h-4" /> Menurun
                </div>
                <ul className="space-y-1.5">
                  {menurun.map((w) => (
                    <li key={`D${w.number}`}>
                      <button
                        className={`text-left text-xs font-semibold w-full rounded-lg px-2 py-1 transition-colors ${activeWordNum === w.number && dir === "D" ? "bg-[#FEF3C7]" : "hover:bg-gray-100"}`}
                        onClick={() => { setDir("D"); selectCell(w.row, w.col); }}
                      >
                        <b>{w.number}.</b> {w.clue}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ---------- HASIL ---------- */}
        {screen === "result" && result && (
          <div className={`tts-screen bg-white rounded-3xl ${chunky} p-6 text-center`}>
            <div className="flex justify-center mb-2">
              <MascotFace mascot={mascot} celebrating={result.pct === 100} />
            </div>
            <h2 className="font-extrabold text-3xl mb-1" style={{ color: result.pct === 100 ? "#10B981" : "#161B3A" }}>
              {result.pct === 100 ? "Level Selesai!" : "Waktunya Selesai"}
            </h2>
            <p className="opacity-70 text-sm mb-4">
              {result.pct === 100 ? `${MASCOTS[mascot].name} bangga sama kamu!` : "Cek lagi kotak yang masih kosong atau salah."}
            </p>

            <div className="flex justify-center gap-1.5 mb-4">
              {[1, 2, 3].map((i) => (
                <Star
                  key={i}
                  className={`w-12 h-12 ${i <= result.stars ? "tts-star-lit" : ""}`}
                  style={i <= result.stars ? { animationDelay: `${i * 0.15}s` } : undefined}
                  fill={i <= result.stars ? "#FBBF24" : "none"}
                  stroke={i <= result.stars ? "#F59E0B" : "#D1D5DB"}
                  strokeWidth={2}
                />
              ))}
            </div>

            <div className="flex justify-center gap-3 mb-4">
              <div className="inline-block bg-[#161B3A] text-white rounded-2xl px-6 py-3 shadow-[5px_5px_0_#38BDF8]">
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Ketepatan</div>
                <div className="font-extrabold text-3xl leading-none">{result.pct}%</div>
              </div>
              <div className="inline-block bg-[#FBBF24] rounded-2xl px-6 py-3 shadow-[5px_5px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">+XP / +Koin</div>
                <div className="font-extrabold text-2xl leading-none flex items-center gap-1.5">
                  <Zap className="w-5 h-5" />{result.xp} <Coins className="w-5 h-5 ml-1" />{result.coins}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mb-5 text-sm flex-wrap">
              <div className="bg-white border-[3px] border-[#161B3A] rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#161B3A]">
                <Lightbulb className="w-4 h-4 inline mr-1 text-amber-500" />
                Petunjuk dipakai <b>{result.hints}×</b>
              </div>
              <div className="bg-white border-[3px] border-[#161B3A] rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#161B3A]">
                <Trophy className="w-4 h-4 inline mr-1 text-violet-500" />
                Waktu dipakai <b>{fmtTime(result.time)}</b>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button className={`${btn} px-5 py-3 bg-white`} onClick={() => setScreen("setup")}>
                <RotateCcw className="w-4 h-4" /> Ulangi
              </button>
              {result.pct === 100 && puzzleId < PUZZLES.length && (
                <button className={`${btn} px-5 py-3 bg-[#38BDF8] text-white`} onClick={() => { openSetup(puzzleId + 1); }}>
                  Level Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button className={`${btn} px-5 py-3 bg-[#FBBF24]`} onClick={() => setScreen("levels")}>
                Pilih Level
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] opacity-50 mt-4 pb-4">
          Ketuk kotak yang sama dua kali untuk ganti arah Mendatar / Menurun.
        </p>
      </div>
    </div>
  );
}
