"use client";

/**
 * Teka-Teki Silang — 12 level berjenjang (grid & kesulitan naik bertahap),
 * pemain pilih durasi 1-10 menit sebelum mulai, maskot Zelby/Hazel/Alby
 * menemani sesi baca petunjuk dan merayakan tiap kata & puzzle yang selesai.
 * XP & Koin dihitung dari akurasi, penalti petunjuk, dan bonus kecepatan.
 *
 * Mengikuti pola arsitektur Irama Kata: layar start -> pilih level -> atur
 * waktu -> main -> hasil, progres + ekonomi tersimpan di localStorage, XP
 * dikirim ke /api/game/xp.
 *
 * v2 (rilis): puzzle TIDAK statis lagi — dibangkitkan prosedural per main
 * (lib/game/tts) dari bank kata kurasi KBBI. Mode "Hari Ini" memberi puzzle
 * yang sama untuk semua pemain dan ganti tiap hari; mode "Acak" memberi
 * kombinasi beda tiap main. Kata yang baru muncul ikut dihindari main
 * berikutnya (anti-ulang), jadi main berulang tetap terasa baru. Skor server
 * dikirim sebagai skor nyata (bukan persen) supaya XP yang dicairkan wajar.
 *
 * v3 (DNA Kuis Tempur): fullscreen layar lebar + HUD 5 tile (Nyawa / Level /
 * Rentetan / Terisi / Waktu) + bar waktu ala Kuis Tempur. Sistem nyawa ala
 * Duolingo (maks 6, -1 tiap jawaban salah saat Cek, pulih 1/8 menit, +1
 * bonus saat sempurna, gate screen saat habis). Leveling lengkap: 12 level
 * (11 tema + Ujian Akhir), tier pemain dari XP lokal, rentetan harian + bonus
 * XP, dan selebrasi saat level baru terbuka.
 *
 * v3.1 (KUIS TTS 1.0 — gameplay audit): keluar saat bermain diberi
 * KONFIRMASI bila progress akan hilang (§23); result screen punya CTA jelas
 * [Main Lagi] + [Kembali ke Arena] (§15); tiap sel grid punya aria-label
 * (aksesibilitas §35); animasi hormati prefers-reduced-motion (§28). XP tetap
 * dikirim SEKALI per sesi (xpSentRef) dan skor dicap server
 * (MAX_SCORE_PER_GAME) — anti-cheat tidak diubah.
 *
 * v3.2 (KUIS TTS 1.1 — real user QA): durasi cukup 3 pilihan (3/5/10 menit)
 * biar keputusan <2 detik (§5); timer tidak tampil 3x (chip header dihapus —
 * HUD Waktu + bar sisa waktu cukup, §15); keluar dari modal konfirmasi →
 * /arena/game (§21); result screen = reward murni (strip statistik
 * Tier/Rentetan/Nyawa dihapus, bonus rentetan & nyawa jadi chip reward, §19);
 * feedback salah = pesan singkat "Belum tepat — coba lagi." lewat bubble
 * maskot (§13); kartu info duplikat di layar awal dihapus biar 5 detik
 * pertama jelas (§4).
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { setQuiet } from "@/lib/notif-quiet"
import {
  X, Play, RotateCcw, ChevronRight, Lock, Star, Trophy, Lightbulb,
  Eraser, CheckCircle2, Grid3x3, ArrowRight, ArrowDown, Clock, Coins, Zap,
  Volume2, VolumeX, CalendarDays, Shuffle, RefreshCw, Flame, Heart,
} from "lucide-react";
import { buildPuzzle } from "@/lib/game/tts/generator";
import { TTS_LEVELS } from "@/lib/game/tts/levels";
import { dailySeed, randomSeed } from "@/lib/game/tts/seed";
import { classifyClueType, hintNudgeFor } from "@/lib/game/tts/difficulty";
import type { Dir, Mascot, TtsWord, TtsWordDef as WordDef } from "@/lib/game/tts/types";
import { sfx, isSoundOn, toggleSound, haptic } from "@/lib/game/sound";
import GameBackButton from "@/components/game/GameBackButton";
import {
  HEARTS_MAX, HEART_REGEN_MS, type HeartsState, freshHearts, regenHearts, spendHeart, nextHeartInMs,
  type StreakState, STREAK_KEY, tierFor, bumpStreak, streakXpBonus,
} from "@/lib/game/tts/economy";

/* ---------- Data ---------- */
type Puzzle = ReturnType<typeof buildPuzzle>;
const TOTAL_LEVELS = TTS_LEVELS.length;


const THEME = ["#FF6B6B", "#F59E0B", "#10B981", "#38BDF8", "#8B5CF6"];
const TIME_OPTIONS = [3, 5, 10]; // KUIS TTS 1.1 (§5): maksimal 3 pilihan — keputusan <2 detik

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

/* Anti-ulang: kata yang baru muncul disimpan, dihindari main berikutnya.
 * Dibatas 60 entri (disisakan 30 terakhir) biar tetap "ingat" tanpa menumpuk. */
const SEEN_MAX = 60;
const SEEN_KEEP = 30;
function loadSeen(): string[] {
  try {
    const raw = localStorage.getItem("tts-seen-v2");
    if (raw) {
      const d = JSON.parse(raw);
      return Array.isArray(d) ? d.filter((x) => typeof x === "string") : [];
    }
  } catch { /* abaikan */ }
  return [];
}
function saveSeen(seen: string[]) {
  try { localStorage.setItem("tts-seen-v2", JSON.stringify(seen)); } catch { /* abaikan */ }
}

/* Nyawa: maks 6, pulih 1 per 8 menit (pola Duolingo). Disimpan sebagai
 * { hearts, updatedAt } — pemain yang kembali setelah lama otomatis penuh. */
const HEARTS_KEY = "tts-hearts-v2";
function loadHearts(): HeartsState {
  try {
    const raw = localStorage.getItem(HEARTS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (typeof d.hearts === "number" && typeof d.updatedAt === "number") {
        return regenHearts({ hearts: d.hearts, updatedAt: d.updatedAt });
      }
    }
  } catch { /* abaikan */ }
  return freshHearts();
}
function saveHearts(s: HeartsState) {
  try { localStorage.setItem(HEARTS_KEY, JSON.stringify(s)); } catch { /* abaikan */ }
}

/* Rentetan harian: main tiap hari berurutan → streak; bonus XP di layar hasil. */
function loadStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (typeof d.streak === "number" && typeof d.lastDate === "string") return { lastDate: d.lastDate, streak: d.streak };
    }
  } catch { /* abaikan */ }
  return { lastDate: "", streak: 0 };
}
function saveStreak(s: StreakState) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch { /* abaikan */ }
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
function calcXP(levelId: number, pct: number, hintsUsed: number, timeUsedSec: number, timeBudgetSec: number, combo: number, streakBonus = 0) {
  const base = levelId * 12;
  let xp = base * (pct / 100) - hintsUsed * 5 + combo * 3;
  const remainRatio = timeBudgetSec > 0 ? (timeBudgetSec - timeUsedSec) / timeBudgetSec : 0;
  if (pct === 100 && remainRatio > 0.2) xp *= 1.2;
  const cap = levelId * 20;
  return Math.max(0, Math.min(cap, Math.round(xp + streakBonus)));
}
function calcCoins(stars: number, levelId: number) {
  return stars * levelId;
}

export default function TekaTekiSilang() {
  const router = useRouter();
  // DARK MODE — game ini full-screen di atas shell Arena yang theme-aware.
  // Semua warna permukaan mengikuti tema; warna aksen/brand tetap sama.
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [screen, setScreen] = useState<"start" | "levels" | "setup" | "game" | "result" | "hearts">("start");
  const [saved, setSaved] = useState<Saved>({ unlocked: [1], best: {}, xp: 0, coins: 0 });
  const [puzzleId, setPuzzleId] = useState(1);
  const [timeMinutes, setTimeMinutes] = useState(5);

  // Ekonomi v3: nyawa (regen), rentetan harian, tier dari XP lokal.
  const [heartsState, setHeartsState] = useState<HeartsState>(() => freshHearts());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [streak, setStreak] = useState<StreakState>({ lastDate: "", streak: 0 });
  const [lastUnlocked, setLastUnlocked] = useState<number | null>(null);

  // Mode soal: "Hari Ini" (seed harian, sama utk semua, ganti tiap hari) vs
  // "Acak" (seed acak tiap main). Ganti seed → puzzle baru.
  const [seed, setSeed] = useState(() => randomSeed());
  const [seedMode, setSeedMode] = useState<"daily" | "acak">("acak");
  const [bankWords, setBankWords] = useState<TtsWord[]>([]);
  const [bankStatus, setBankStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [seen, setSeen] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/game/tts-bank", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("bank unavailable");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const words: TtsWord[] = Array.isArray(data.words)
          ? data.words
              .map((w: { answer?: unknown; clue?: unknown; tier?: unknown }) => ({
                answer: String(w.answer ?? ""),
                clue: String(w.clue ?? ""),
                tier: w.tier === 1 || w.tier === 2 || w.tier === 3 ? w.tier : 2,
              }))
              .filter((w: TtsWord) => w.answer.length >= 3 && w.answer.length <= 14 && w.clue.length >= 8)
          : [];
        if (words.length >= 20) {
          setBankWords(words);
          setBankStatus("ready");
        } else {
          setBankStatus("fallback");
        }
      })
      .catch(() => {
        if (!cancelled) setBankStatus("fallback");
      });
    return () => { cancelled = true; };
  }, []);

  const puzzle = useMemo(
    () => buildPuzzle({
      level: puzzleId,
      seed,
      avoidAnswers: seen,
      wordPool: bankWords.length >= 20 ? bankWords : undefined,
    }),
    [puzzleId, seed, seen, bankWords]
  );
  const cells = useMemo(() => buildCells(puzzle), [puzzle]);
  const color = THEME[(puzzle.id - 1) % THEME.length];
  const mascot = puzzle.mascot;

  // Identitas kartu level HARUS berasal dari konfigurasi level, bukan dari
  // hasil generator. Generator hanya memasok metadata puzzle (ukuran/jumlah kata).
  // Ini mencegah fallback/ketidaksempurnaan bank mengubah Level 6/11 menjadi
  // kartu "#1 Keluarga Inti" di layar pemilihan.
  const previews = useMemo(
    () => TTS_LEVELS.map((level) => ({
      level,
      puzzle: buildPuzzle({ level: level.level, seed: dailySeed(level.level) }),
    })),
    []
  );

  const [grid, setGrid] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [dir, setDir] = useState<Dir>("A");
  const [activeWordNum, setActiveWordNum] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  // P8I — anggaran petunjuk sisi server (maks 3, tidak reset oleh refresh).
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hintsRemainingServer, setHintsRemainingServer] = useState<number | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  // P8J — nudge kontekstual gratis (sekali per kata, tanpa anggaran) + abandon.
  const [nudgedNums, setNudgedNums] = useState<Set<number>>(new Set());
  const [nudgeText, setNudgeText] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [result, setResult] = useState<{ pct: number; stars: number; hints: number; time: number; xp: number; coins: number } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [cheerText, setCheerText] = useState<string | null>(null);
  const [bigCelebrate, setBigCelebrate] = useState(false);
  // KUIS TTS 1.0: konfirmasi keluar saat progress akan hilang (§23).
  const [confirmExit, setConfirmExit] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cheerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedWordsRef = useRef<Set<string>>(new Set());
  const xpSentRef = useRef(false);
  const timeBudgetRef = useRef(0);
  const elapsedRef = useRef(0);
  const savedRef = useRef<Saved>({ unlocked: [1], best: {}, xp: 0, coins: 0 });
  const streakRef = useRef(0);

  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(screen === "game")
    return () => setQuiet(false)
  }, [screen]);

  useEffect(() => {
    const sv = loadSaved();
    const st = loadStreak();
    setSaved(sv);
    savedRef.current = sv;
    setSeen(loadSeen());
    setSoundOn(isSoundOn());
    setHeartsState(loadHearts());
    setStreak(st);
    streakRef.current = st.streak;
  }, []);

  // Jaga savedRef tetap sinkron (dipakai finishGame untuk deteksi unlock).
  useEffect(() => { savedRef.current = saved; }, [saved]);

  // Tick tiap detik selama nyawa belum penuh (regen + countdown gate screen).
  const liveHearts = regenHearts(heartsState, nowMs);
  const heartCountdown = nextHeartInMs(liveHearts, nowMs);
  const heartsFull = liveHearts.hearts >= HEARTS_MAX;
  useEffect(() => {
    if (heartsFull) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [heartsFull]);

  // Persist nyawa setiap kali berubah (setelah regen/spend/bonus).
  useEffect(() => {
    if (heartsState.updatedAt > 0) saveHearts(heartsState);
  }, [heartsState]);

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

  /* KUIS TTS 1.1 (§13): feedback singkat tanpa animasi perayaan (jawaban belum tepat). */
  const fireMessage = useCallback((text: string) => {
    setCheerText(text);
    if (cheerTimeoutRef.current) clearTimeout(cheerTimeoutRef.current);
    cheerTimeoutRef.current = setTimeout(() => setCheerText(null), 1200);
  }, []);

  /* Cek tiap kata yang menyentuh sel yang baru diisi — kalau lengkap & benar
   * dan belum pernah dirayakan, mascot merayakan + Kata Beruntun bertambah. */
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
        sfx.climb(combo + 1);
        setCombo((c) => {
          const n = c + 1;
          setBestCombo((b) => Math.max(b, n));
          return n;
        });
      }
    }
  }, [wordsAt, wordCellKeys, fireCheer, combo]);

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
    const streakBonus = streakXpBonus(streakRef.current);
    const xp = calcXP(puzzle.id, pct, hintsUsed, timeUsed, timeBudgetRef.current, bestCombo, streakBonus);
    const coins = calcCoins(stars, puzzle.id);
    setResult({ pct, stars, hints: hintsUsed, time: timeUsed, xp, coins });
    if (pct === 100) { setBigCelebrate(true); sfx.win(); } else { sfx.gameover(); }
    setScreen("result");

    // Nyawa: selesai sempurna memulihkan 1 nyawa (cap 5) — hadiah konsistensi.
    if (pct === 100) {
      setHeartsState((s) => {
        const live = regenHearts(s, Date.now());
        return { hearts: Math.min(HEARTS_MAX, live.hearts + 1), updatedAt: Date.now() };
      });
    }

    // Deteksi level baru terbuka (dari savedRef yang selalu sinkron).
    const prev = savedRef.current;
    const willUnlock = pct === 100 && puzzle.id + 1 <= TOTAL_LEVELS && !prev.unlocked.includes(puzzle.id + 1);
    setLastUnlocked(willUnlock ? puzzle.id + 1 : null);

    setSaved((prevSaved) => {
      const next: Saved = { unlocked: [...prevSaved.unlocked], best: { ...prevSaved.best }, xp: prevSaved.xp + xp, coins: prevSaved.coins + coins };
      if (pct === 100) {
        if (!next.best[puzzle.id] || pct > next.best[puzzle.id]) next.best[puzzle.id] = pct;
        const nid = puzzle.id + 1;
        if (nid <= TOTAL_LEVELS && !next.unlocked.includes(nid)) next.unlocked.push(nid);
      }
      savedRef.current = next;
      saveSaved(next);
      return next;
    });

    // Anti-ulang: catat kata yang muncul, hindari di main berikutnya.
    const usedAnswers = puzzle.words.map((w) => w.answer);
    setSeen((prev) => {
      const next = [...prev, ...usedAnswers];
      const capped = next.length > SEEN_MAX ? next.slice(-SEEN_KEEP) : next;
      saveSeen(capped);
      return capped;
    });

    const cellsCorrect = correctCells;
    if (!xpSentRef.current) {
      xpSentRef.current = true;
      // ── P8I: hadiah OTORITATIF dari server — akurasi × tier kesulitan
      // − penalti petunjuk (hitungan DB). Panggilan ulang tanpa hadiah. ──
      if (sessionId) {
        fetch("/api/game/tts/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, grid }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.ok && typeof d.xp === "number" && !d.idempotent) {
              // Ganti nilai lokal dengan angka otoritatif server.
              setResult((prev) =>
                prev ? { ...prev, xp: d.xp, coins: d.coins, stars: d.stars, hints: d.hints } : prev
              );
              setSaved((prevSaved) => {
                const delta = d.xp - xp;
                const deltaCoins = d.coins - coins;
                const next: Saved = {
                  unlocked: [...prevSaved.unlocked],
                  best: { ...prevSaved.best },
                  xp: Math.max(0, prevSaved.xp + delta),
                  coins: Math.max(0, prevSaved.coins + deltaCoins),
                };
                savedRef.current = next;
                saveSaved(next);
                return next;
              });
            }
          })
          .catch(() => {});
      } else {
        // Tanpa sesi (offline/unauthorized): kirim jalur XP lama agar tetap
        // tercatat — nilai diturunkan server dari skor (bukan dipercaya).
        let supabaseId = "";
        try { supabaseId = JSON.parse(localStorage.getItem("bc-user") || "{}").state?.supabaseId || ""; } catch { /* abaikan */ }
        const serverScore = Math.min(1500, correctCells * 10 + (pct === 100 ? 200 : 0) + bestCombo * 5);
        fetch("/api/game/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: serverScore, correct: correctCells, wrong: totalCells - correctCells,
            maxStreak: bestCombo, xpEarned: xp, gameType: "TEKA_TEKI_SILANG", supabaseId,
          }),
        }).catch(() => { /* abaikan */ });
      }
    }
  }, [totalCells, correctCells, hintsUsed, remainingSec, puzzle, bestCombo, sessionId]);

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
    let hasWrong = false;
    cells.forEach((c, k) => {
      if (!grid[k]) { next[k] = null; allCorrect = false; return; }
      anyFilled = true;
      if (grid[k] === c.letter) next[k] = "correct";
      else { next[k] = "wrong"; allCorrect = false; hasWrong = true; }
    });
    setChecked(next);
    if (hasWrong) {
      sfx.wrong();
      haptic([80, 40, 80]);
      setCombo(0);
      // KUIS TTS 1.1 (§13): umpan balik lembut, bukan hukuman — nyawa tetap -1 (pola Duolingo).
      fireMessage("Belum tepat — coba lagi.");
      setHeartsState((s) => spendHeart(s, Date.now()));
    }
    if (allCorrect && anyFilled) finishGame(false);
  };

  /* P8I — petunjuk terbatas sisi server: klaim anggaran dulu (atomik),
   * baru ungkap satu huruf. Habis → tombol mati. Tanpa sesi server
   * (offline/unauthorized) petunjuk tidak tersedia. */
  const hintsRemaining = hintsRemainingServer ?? 0;
  const activeWordType = activeWord
    ? classifyClueType(activeWord.clue, puzzle.subtitle.toLowerCase())
    : undefined;
  const nudgeAvailable =
    activeWordNum != null && !nudgedNums.has(activeWordNum) && !!hintNudgeFor(activeWordType);

  const showNudge = () => {
    if (activeWordNum == null) return;
    const text = hintNudgeFor(activeWordType);
    if (!text) return;
    setNudgedNums((s) => new Set(s).add(activeWordNum));
    setNudgeText(text);
    fireMessage(`Konteks: ${text}`);
    sfx.tap();
  };

  const useHint = async () => {
    if (!activeWord || timeUp || hintBusy) return;
    if (!sessionId || hintsRemaining <= 0) return;
    const keys = wordCellKeys(activeWord);
    const emptyOrWrong = keys.find((k) => grid[k] !== cells.get(k)?.letter);
    if (!emptyOrWrong) return;

    setHintBusy(true);
    try {
      const res = await fetch("/api/game/tts/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) return; // habis/sesi hilang — tanpa pengungkapan

      const cell = cells.get(emptyOrWrong)!;
      setGrid((g) => {
        const next = { ...g, [emptyOrWrong]: cell.letter };
        checkWordCompletion(cell.row, cell.col, next);
        return next;
      });
      setChecked((c) => ({ ...c, [emptyOrWrong]: "correct" }));
      setHintsUsed((h) => h + 1);
      setHintsRemainingServer(d.hintsRemaining);
      setCombo(0);
      sfx.tap();
    } finally {
      setHintBusy(false);
    }
  };

  const clearAll = () => { setGrid({}); setChecked({}); setCombo(0); sfx.tap(); };

  const pickMode = (mode: "daily" | "acak") => {
    setSeedMode(mode);
    setSeed(mode === "daily" ? dailySeed(puzzleId) : randomSeed());
    sfx.tap();
  };

  const openSetup = (id: number) => {
    setPuzzleId(id);
    setSeedMode("acak");
    setSeed(randomSeed());
    setScreen("setup");
  };

  const startPuzzle = () => {
    // Gate nyawa: butuh ≥ 1 nyawa untuk main (regen 1/8 menit).
    if (liveHearts.hearts < 1) {
      sfx.wrong();
      haptic([100]);
      setScreen("hearts");
      return;
    }
    // Rentetan harian: main hari ini (sekali per hari) → streak + bonus XP.
    setStreak((s) => {
      const next = bumpStreak(s);
      streakRef.current = next.streak;
      saveStreak(next);
      return next;
    });
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
    setCombo(0);
    setBestCombo(0);
    completedWordsRef.current = new Set();
    xpSentRef.current = false;
    elapsedRef.current = 0;
    const budget = timeMinutes * 60;
    timeBudgetRef.current = budget;
    setRemainingSec(budget);

    // P8I — buka sesi server: anggaran petunjuk + validasi hadiah.
    setSessionId(null);
    setNudgedNums(new Set());
    setNudgeText(null);
    setFeedbackGiven(false);
    setHintsRemainingServer(null);
    fetch("/api/game/tts/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: puzzleId, seed, cellsTotal: cells.size }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d.sessionId) {
          setSessionId(d.sessionId);
          setHintsRemainingServer(d.hintsRemaining);
        }
      })
      .catch(() => {});

    setScreen("game");
    sfx.start();
  };

  const chunky = "border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#4338CA]";
  const btn = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  const mendatar = puzzle.words.filter((w) => w.dir === "A").sort((a, b) => a.number - b.number);
  const menurun = puzzle.words.filter((w) => w.dir === "D").sort((a, b) => a.number - b.number);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timeLow = remainingSec <= 20 && remainingSec > 0;
  const bigGrid = puzzle.cols > 12 || puzzle.rows > 12;
  const cellSize = bigGrid ? "minmax(22px, 30px)" : "minmax(28px, 38px)";

  // Tier pemain (dari XP lokal) + progress menuju tier berikutnya.
  const tierInfo = tierFor(saved.xp);
  const fmtCountdown = (ms: number) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };
  const nextHeartLabel = liveHearts.hearts >= HEARTS_MAX ? "Penuh" : fmtCountdown(heartCountdown);

  return (
    <div className="game-env game-env-tts fixed inset-0 z-[60] overflow-y-auto game-env-bg bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#0B0A1A] dark:to-[#151030] text-[#161B3A] dark:text-[#F1EDFF]">
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
        /* KUIS TTS 1.0 (§28) — hormati prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce){
          .tts-screen,.tts-star-lit,.tts-logo,.tts-wrong,.tts-mascot-idle,.tts-mascot-cheer,.tts-bubble,.tts-confetti-piece{animation:none!important;transition:none!important}
        }
      `}</style>
      <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#38BDF8] border-4 border-[#161B3A] dark:border-white/25 rounded-3xl" style={{ animation: "tts-float1 9s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#FBBF24] border-4 border-[#161B3A] dark:border-white/25 rounded-full" style={{ animation: "tts-float2 10s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#10B981] border-4 border-[#161B3A] dark:border-white/25 rounded-2xl" style={{ animation: "tts-float1 11s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#FF6B6B] border-4 border-[#161B3A] dark:border-white/25 rounded-[30%_70%_70%_30%]" style={{ animation: "tts-float2 8s ease-in-out infinite" }} />

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

      {/* KUIS TTS 1.0 (§23) — konfirmasi keluar saat progress akan hilang */}
      {confirmExit && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#161B3A]/60 p-5 backdrop-blur-sm">
          <div className="tts-screen w-full max-w-sm rounded-3xl border-4 border-[#161B3A] dark:border-white/25 game-env-card bg-white dark:bg-gradient-to-br dark:from-[#1A1535] dark:to-[#221C48] p-6 text-center shadow-[6px_6px_0_#4338CA]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#161B3A] dark:border-white/25 bg-[#FF6B6B] shadow-[3px_3px_0_#4338CA]">
              <X className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-extrabold">Keluar dari permainan?</h3>
            <p className="mt-1 mb-5 text-sm opacity-70">Progress permainan ini akan hilang.</p>
            <div className="flex flex-col gap-2.5">
              <button className={`${btn} px-5 py-3 text-white`} style={{ background: color }} onClick={() => setConfirmExit(false)}>
                Tetap Main
              </button>
              {/* KUIS TTS 1.1 (§21): keluar = benar-benar keluar ke Game Hub, bukan ke pilih level. */}
              <button className={`${btn} px-5 py-3 bg-white dark:bg-[#1A1535]`} onClick={() => { setConfirmExit(false); router.push("/arena/game"); }}>
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`relative mx-auto px-4 py-3 min-h-full flex flex-col ${screen === "game" ? "max-w-[1280px]" : "max-w-2xl"}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`tts-logo w-11 h-11 bg-[#38BDF8] rounded-2xl ${chunky} !shadow-[4px_4px_0_#4338CA] flex items-center justify-center`}>
              <Grid3x3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-xl leading-none font-game-display">Teka-Teki Silang</div>
              <div className="text-[11px] font-semibold opacity-60 mt-0.5">Isi kotak, asah kosakata</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(screen === "start" || screen === "hearts") && (
              <GameBackButton href="/arena/game" label="Kembali ke Arena" title="Kembali ke Arena" />
            )}
            <button className={`${btn} game-sound-btn w-11 h-11 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50 dark:hover:bg-slate-700`} onClick={() => setSoundOn((m) => { toggleSound(); return !m; })} aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}>
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {screen !== "start" && screen !== "game" && (
          <div className="flex items-center gap-2.5 mb-4 text-xs font-extrabold">
            <span className="flex items-center gap-1 bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-full px-2.5 py-1 shadow-[2px_2px_0_#4338CA]">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> {saved.xp} XP
            </span>
            <span className="flex items-center gap-1 bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-full px-2.5 py-1 shadow-[2px_2px_0_#4338CA]">
              <Coins className="w-3.5 h-3.5 text-yellow-600" /> {saved.coins} Koin
            </span>
            <span className="flex items-center gap-1 bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-full px-2.5 py-1 shadow-[2px_2px_0_#4338CA]">
              <Heart className="w-3.5 h-3.5 text-rose-500" fill="#F43F5E" /> {liveHearts.hearts}/{HEARTS_MAX}
            </span>
          </div>
        )}

        {/* ---------- MULAI ---------- */}
        {screen === "start" && (
          <div className={`tts-screen mx-auto w-full max-w-2xl bg-white dark:bg-gradient-to-br dark:from-[#1A1535] dark:to-[#221C48] rounded-3xl ${chunky} p-6 text-center`}>
            <span className="inline-block px-4 py-1.5 bg-[#38BDF8] text-white border-[3px] border-[#161B3A] dark:border-white/25 rounded-full font-extrabold text-xs shadow-[3px_3px_0_#4338CA] mb-4">
              12 Level Berjenjang · Ditemani Zelby, Hazel & Alby
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

            {/* Statistik pemain: tier, rentetan, nyawa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5 text-left">
              <div className="bg-[#161B3A] text-white border-[3px] border-[#161B3A] dark:border-white/25 rounded-2xl p-3 shadow-[4px_4px_0_#38BDF8]">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase opacity-70">
                  <Trophy className="w-3.5 h-3.5 text-amber-300" /> Tier Pemain
                </div>
                <div className="font-extrabold text-base leading-tight mt-0.5">{tierInfo.tier.name}</div>
                {tierInfo.next && (
                  <>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.round(tierInfo.progress * 100)}%` }} />
                    </div>
                    <div className="text-[10px] font-bold opacity-70 mt-1">{saved.xp} XP · {tierInfo.next.name} di {tierInfo.next.min} XP</div>
                  </>
                )}
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] dark:border-white/25 rounded-2xl p-3 shadow-[4px_4px_0_#4338CA]">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase opacity-70">
                  <Flame className="w-3.5 h-3.5 text-orange-600" /> Rentetan Harian
                </div>
                <div className="flex items-center gap-1 font-extrabold text-base leading-tight mt-0.5">
                  {streak.streak > 0 ? (<><Flame className="w-4 h-4 text-orange-600" /> {streak.streak} hari</>) : "Mulai hari ini!"}
                </div>
                <div className="text-[10px] font-bold opacity-70 mt-1">
                  {streak.streak >= 2 ? `Bonus +${streakXpBonus(streak.streak)} XP tiap main` : "Main 2 hari berturut untuk bonus XP"}
                </div>
              </div>
              <div className="bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-2xl p-3 shadow-[4px_4px_0_#10B981]">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase opacity-70">
                  <Heart className="w-3.5 h-3.5 text-rose-500" fill="#F43F5E" /> Nyawa
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: HEARTS_MAX }).map((_, i) => (
                    <Heart key={i} className={`w-4 h-4 ${i < liveHearts.hearts ? "text-rose-500" : "text-gray-300 dark:text-[#3D3866]"}`} fill={i < liveHearts.hearts ? "currentColor" : "none"} />
                  ))}
                  <span className="font-extrabold text-sm ml-1">{liveHearts.hearts}/{HEARTS_MAX}</span>
                </div>
                <div className="text-[10px] font-bold opacity-70 mt-1">
                  {liveHearts.hearts >= HEARTS_MAX ? "Nyawa penuh — siap main!" : `Nyawa berikutnya: ${nextHeartLabel}`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button className={`${btn} px-6 py-3.5 bg-[#38BDF8] text-white text-lg`} onClick={() => setScreen("levels")}>
                <Play className="w-5 h-5" /> Main Sekarang
              </button>
            </div>
            <p className="text-[11px] font-bold opacity-60 mt-3">
              Soal dibangkitkan tiap main dari ~320 kata — main berulang tetap terasa baru.
            </p>
          </div>
        )}

        {/* ---------- HASIL: SELEBRASI UNLOCK ---------- */}
        {screen === "result" && result && (
          <div className="tts-screen mx-auto w-full max-w-2xl mb-4">
            {lastUnlocked && (
              <div className="bg-[#161B3A] text-white rounded-3xl border-4 border-[#FBBF24] shadow-[6px_6px_0_#FBBF24] p-5 text-center tts-pop">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Trophy className="w-6 h-6 text-amber-300" />
                  <span className="font-extrabold text-2xl">Level {lastUnlocked} Terbuka!</span>
                </div>
                <p className="text-white/80 text-sm">
                  {TTS_LEVELS[lastUnlocked - 1]?.title} — {TTS_LEVELS[lastUnlocked - 1]?.subtitle}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------- PILIH TEKA-TEKI ---------- */}
        {screen === "levels" && (
          <div className={`tts-screen bg-white dark:bg-gradient-to-br dark:from-[#1A1535] dark:to-[#221C48] rounded-3xl ${chunky} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <GameBackButton onClick={() => setScreen("start")} label="Kembali ke Teka-Teki Silang" title="Kembali ke menu Teka-Teki Silang" />
              <h2 className="font-extrabold text-2xl">Pilih Level</h2>
              <div className="w-11 sm:w-[110px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previews.map(({ level, puzzle: p }) => {
                const levelId = level.level;
                const unlocked = saved.unlocked.includes(levelId);
                const best = saved.best[levelId] || 0;
                const st = starsFor(best, 0);
                const c = THEME[(levelId - 1) % THEME.length];
                return (
                  <button
                    key={levelId}
                    disabled={!unlocked}
                    onClick={() => unlocked && openSetup(levelId)}
                    className={`text-left rounded-2xl border-4 border-[#161B3A] dark:border-white/25 p-4 transition-transform ${
                      unlocked ? "shadow-[5px_5px_0_#4338CA] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer" : "shadow-[5px_5px_0_#9CA3AF] bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-[#1E1840]/60 dark:text-[#4A4570]"
                    }`}
                    style={unlocked ? { background: c, color: "#fff" } : undefined}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-extrabold text-2xl leading-none">#{levelId}</span>
                      {unlocked
                        ? <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/15">{p.rows}×{p.cols} · {p.words.length} kata</span>
                        : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="font-extrabold text-base leading-tight mb-0.5">{level.title}</div>
                    <div className="text-[11px] font-semibold opacity-85 mb-2">{level.subtitle}</div>
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
          <div className={`tts-screen mx-auto w-full max-w-2xl bg-white dark:bg-gradient-to-br dark:from-[#1A1535] dark:to-[#221C48] rounded-3xl ${chunky} p-6 text-center`}>
            <GameBackButton onClick={() => setScreen("levels")} label="Kembali ke Pilih Level" title="Kembali ke pilihan level" />
            <div className="flex justify-center mb-3">
              <MascotFace mascot={mascot} celebrating={false} />
            </div>            <h2 className="font-extrabold text-2xl mb-1">{puzzle.title}</h2>
            <p className="opacity-70 text-sm mb-5">{puzzle.subtitle} · {puzzle.rows}×{puzzle.cols} · {puzzle.words.length} kata</p>

            <p className="font-extrabold text-sm mb-2">Mode soal</p>
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              <button
                onClick={() => pickMode("daily")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-4 border-[#161B3A] dark:border-white/25 font-extrabold text-xs transition-transform ${
                  seedMode === "daily" ? "shadow-none translate-x-1 translate-y-1 bg-[#38BDF8] text-white" : "bg-white dark:bg-[#1A1535] shadow-[3px_3px_0_#4338CA] hover:-translate-x-0.5 hover:-translate-y-0.5"
                }`}
              >
                <CalendarDays className="w-4 h-4" /> Hari Ini
              </button>
              <button
                onClick={() => pickMode("acak")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-4 border-[#161B3A] dark:border-white/25 font-extrabold text-xs transition-transform ${
                  seedMode === "acak" ? "shadow-none translate-x-1 translate-y-1 bg-[#8B5CF6] text-white" : "bg-white dark:bg-[#1A1535] shadow-[3px_3px_0_#4338CA] hover:-translate-x-0.5 hover:-translate-y-0.5"
                }`}
              >
                <Shuffle className="w-4 h-4" /> Acak
              </button>
              {seedMode === "acak" && (
                <button
                  onClick={() => { setSeed(randomSeed()); sfx.tap(); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-4 border-[#161B3A] dark:border-white/25 bg-[#FBBF24] font-extrabold text-xs shadow-[3px_3px_0_#4338CA] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                >
                  <RefreshCw className="w-4 h-4" /> Soal Lain
                </button>
              )}
            </div>
            <p className="text-[11px] font-bold opacity-60 -mt-1 mb-4">
              {seedMode === "daily" ? "Puzzle sama untuk semua pemain, ganti tiap hari." : "Kombinasi kata beda tiap main — tanpa pengulangan."}
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-50 mb-4">
              {bankStatus === "ready" ? "Soal berputar dari Bank Soal" : bankStatus === "loading" ? "Menyiapkan Bank Soal…" : "Mode cadangan: bank TTS kurasi"}
            </p>

            <p className="font-extrabold text-sm mb-3">Pilih durasi mengerjakan</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {TIME_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeMinutes(m)}
                  className={`w-14 h-14 rounded-2xl border-4 border-[#161B3A] dark:border-white/25 font-extrabold text-lg transition-transform ${
                    timeMinutes === m ? "shadow-none translate-x-1 translate-y-1" : "shadow-[4px_4px_0_#4338CA] hover:-translate-x-0.5 hover:-translate-y-0.5"
                  }`}
                  style={{ background: timeMinutes === m ? color : isDark ? "#16122A" : "#fff", color: timeMinutes === m ? "#fff" : isDark ? "#F1EDFF" : "#161B3A" }}
                >
                  {m}
                  <div className="text-[9px] font-bold -mt-0.5">min</div>
                </button>
              ))}
            </div>
            <button className={`${btn} px-8 py-3.5 text-white text-lg`} style={{ background: color }} onClick={startPuzzle}>
              <Play className="w-5 h-5" /> Mulai ({timeMinutes} menit)
            </button>
            <p className="text-[11px] font-bold opacity-60 mt-2 flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" fill="#F43F5E" />
              {liveHearts.hearts >= 1 ? `Siap main dengan ${liveHearts.hearts} nyawa — salah saat Cek Jawaban = -1` : "Nyawa habis — pulih dulu sebelum main lagi"}
            </p>
          </div>
        )}

        {/* ---------- NYAWA HABIS ---------- */}
        {screen === "hearts" && (
          <div className={`tts-screen mx-auto w-full max-w-2xl bg-white dark:bg-gradient-to-br dark:from-[#1A1535] dark:to-[#221C48] rounded-3xl ${chunky} p-6 text-center`}>
            <div className="flex justify-center mb-3">
              <div className="w-20 h-20 rounded-3xl bg-[#FF6B6B] border-4 border-[#161B3A] dark:border-white/25 shadow-[5px_5px_0_#4338CA] flex items-center justify-center">
                <Heart className="w-10 h-10 text-white" fill="currentColor" />
              </div>
            </div>
            <h2 className="font-extrabold text-3xl mb-2">Nyawa Habis!</h2>
            <p className="opacity-70 text-sm max-w-sm mx-auto mb-5">
              Jawaban yang salah mengurangi nyawa. Nyawa pulih <b>1 setiap {Math.round(HEART_REGEN_MS / 60000)} menit</b> — selesaikan sempurna untuk bonus +1 nyawa.
            </p>

            <div className="flex justify-center gap-1.5 mb-3">
              {Array.from({ length: HEARTS_MAX }).map((_, i) => (
                <Heart key={i} className={`w-7 h-7 ${i < liveHearts.hearts ? "text-rose-500" : "text-gray-300 dark:text-[#3D3866]"}`} fill={i < liveHearts.hearts ? "currentColor" : "none"} />
              ))}
            </div>
            <div className="inline-block bg-[#161B3A] text-white rounded-2xl px-6 py-3 shadow-[5px_5px_0_#FBBF24] mb-6">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Nyawa berikutnya</div>
              <div className="font-extrabold text-3xl leading-none">{nextHeartLabel}</div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                className={`${btn} px-5 py-3 text-white`}
                style={{ background: liveHearts.hearts >= 1 ? color : "#9CA3AF" }}
                disabled={liveHearts.hearts < 1}
                onClick={() => openSetup(puzzleId)}
              >
                <Play className="w-4 h-4" /> {liveHearts.hearts >= 1 ? "Nyawa Pulih — Main!" : "Tunggu Nyawa…"}
              </button>
              <button className={`${btn} px-5 py-3 bg-white dark:bg-[#1A1535]`} onClick={() => setScreen("levels")}>
                Pilih Level
              </button>
            </div>
            <p className="text-[11px] font-bold opacity-60 mt-4">
              Selesaikan sempurna untuk bonus +1 nyawa — pulih otomatis 1 per {Math.round(HEART_REGEN_MS / 60000)} menit.
            </p>
          </div>
        )}

        {/* ---------- MAIN ---------- */}
        {screen === "game" && (
          <div className="tts-screen tts-monochrome flex flex-col items-center gap-3 w-full max-w-[1100px] mx-auto">
            {/* HUD 5 tile — DNA Kuis Tempur: Nyawa / Level / Rentetan / Terisi / Waktu */}
            <div className="w-full grid grid-cols-5 gap-2">
              <div className={`rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-[#161B3A] text-white px-2 py-2 shadow-[3px_3px_0_#4338CA] ${liveHearts.hearts === 0 ? "opacity-60" : ""}`}>
                <div className="text-[8px] font-extrabold uppercase opacity-70">Nyawa</div>
                <div className="flex items-center gap-1 text-lg font-extrabold leading-none">
                  <Heart className="w-4 h-4 text-rose-400" fill="#FB7185" /> {liveHearts.hearts}/{HEARTS_MAX}
                </div>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#1A1535] px-2 py-2 shadow-[3px_3px_0_#4338CA]">
                <div className="text-[8px] font-extrabold uppercase opacity-70">Level</div>
                <div className="text-lg font-extrabold leading-none">{puzzle.id}<span className="text-[10px] font-bold opacity-60 ml-1">{puzzle.title}</span></div>
              </div>
              <div className={`rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 px-2 py-2 shadow-[3px_3px_0_#4338CA] ${combo > 1 ? "bg-orange-300" : "bg-white dark:bg-[#1A1535] opacity-70"}`}>
                <div className="text-[8px] font-extrabold uppercase opacity-70">Rentetan</div>
                <div className="text-lg font-extrabold leading-none">{combo}x</div>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 px-2 py-2 shadow-[3px_3px_0_#4338CA]" style={{ background: color, color: "#fff" }}>
                <div className="text-[8px] font-extrabold uppercase opacity-80">Terisi</div>
                <div className="text-lg font-extrabold leading-none">{filledCells}<span className="text-[10px] font-bold opacity-70">/{totalCells}</span></div>
              </div>
              <div className={`rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-violet-500 px-2 py-2 text-white shadow-[3px_3px_0_#4338CA] ${timeLow ? "bg-rose-500" : ""}`}>
                <div className="text-[8px] font-extrabold uppercase opacity-80">Waktu</div>
                <div className="text-lg font-extrabold leading-none">{fmtTime(remainingSec)}</div>
              </div>
            </div>

            {/* Bar sisa waktu — DNA Kuis Tempur */}
            <div className="w-full">
              <div className={`mb-1 flex items-center justify-between text-[11px] font-extrabold ${timeLow ? "text-rose-600" : "text-[#161B3A] dark:text-[#F1EDFF]/70"}`}>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Sisa waktu</span>
                <span>{fmtTime(remainingSec)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border-2 border-[#161B3A] dark:border-white/25/20 bg-[#161B3A]/10">
                <span
                  className={`block h-full rounded-full transition-all duration-1000 ease-linear ${timeLow ? "bg-rose-500" : "bg-violet-400"}`}
                  style={{ width: `${timeBudgetRef.current > 0 ? (remainingSec / timeBudgetRef.current) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Progres ketepatan + kata beruntun */}
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 h-3 rounded-full bg-[#161B3A] overflow-hidden border-2 border-[#161B3A] dark:border-white/25">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${totalCells ? (correctCells / totalCells) * 100 : 0}%`, background: color }}
                />
              </div>
              <div className="shrink-0 rounded-full border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#1A1535] px-2.5 py-1 shadow-[2px_2px_0_#4338CA] font-extrabold text-[11px] flex items-center gap-1">
                <Heart className={`w-3.5 h-3.5 ${combo >= 2 ? "text-orange-500" : "text-gray-300 dark:text-[#3D3866]"}`} />
                {combo >= 2 ? `Beruntun ×${combo}` : `${Math.round((correctCells / Math.max(1, totalCells)) * 100)}% tepat`}
              </div>
            </div>

            {/* Petunjuk aktif + maskot */}
            <div className="w-full rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-white dark:bg-[#1A1535] px-3.5 py-2 shadow-[3px_3px_0_#4338CA] flex items-center gap-3 min-h-[60px]">
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
              <div className="w-full rounded-xl border-[3px] border-[#FF6B6B] bg-[#FFE2E2] dark:bg-[#4A1825] px-3.5 py-2 text-center text-sm font-extrabold text-[#991B1B] dark:text-[#FCA5A5]">
                Waktu habis! Lihat hasil di bawah.
              </div>
            )}

            {/* Grid */}
            <div className="w-full overflow-x-auto">
              <div
                className="grid mx-auto bg-[#161B3A] rounded-xl border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#4338CA] p-1 gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${puzzle.cols}, ${cellSize})`,
                  gridTemplateRows: `repeat(${puzzle.rows}, ${cellSize})`,
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
                    // Warna sel theme-aware (WCAG AA): kontras huruf vs latar dijaga di kedua mode.
                    let bg = isDark ? "#241F45" : "#FFFFFF";
                    if (state === "correct") bg = isDark ? "#12402B" : "#BBF7D0";
                    else if (state === "wrong") bg = isDark ? "#47202E" : "#FECACA";
                    else if (isSel) bg = isDark ? "#4A3B12" : "#FDE68A";
                    else if (inActiveWord) bg = isDark ? "#37301A" : "#FEF3C7";
                    return (
                      <div key={key} className={`tts-cell-wrap relative rounded-[3px] ${state === "wrong" ? "tts-wrong" : ""}`} style={{ background: bg }}>
                        {cell.number != null && (
                          <span className={`absolute top-[1px] left-[2px] text-[8px] font-extrabold leading-none select-none pointer-events-none ${isDark ? "text-[#F1EDFF]/70" : "text-[#161B3A]/70"}`}>
                            {cell.number}
                          </span>
                        )}
                        <input
                          ref={(el) => { inputRefs.current[key] = el; }}
                          value={grid[key] || ""}
                          onChange={(e) => onType(r, c, e.target.value)}
                          onKeyDown={(e) => onKeyDown(r, c, e)}
                          onFocus={() => selectCell(r, c)}
                          aria-label={`Baris ${r + 1}, kolom ${c + 1}${cell.number != null ? `, petunjuk ${cell.number}` : ""}`}
                          maxLength={1}
                          inputMode="text"
                          autoComplete="off"
                          disabled={timeUp}
                          style={{ fontSize: bigGrid ? 12 : 14 }}
                          className={`tts-cell w-full h-full bg-transparent text-center font-extrabold outline-none ${isDark ? "text-[#F1EDFF]" : "text-[#161B3A]"}`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Aksi */}
            <div className="w-full flex flex-wrap items-center justify-center gap-2">
              <button
                className={`${btn} px-4 py-2.5 bg-white dark:bg-[#1A1535] text-sm`}
                onClick={showNudge}
                disabled={timeUp || !nudgeAvailable || activeWordNum == null}
                aria-label="Petunjuk konteks kata aktif"
                title={nudgeAvailable ? "Bantuan memahami petunjuk (gratis)" : "Konteks untuk kata ini sudah ditampilkan"}
              >
                <Lightbulb className="w-4 h-4" /> Konteks
              </button>
              <button
                className={`${btn} px-4 py-2.5 bg-white dark:bg-[#1A1535] text-sm`}
                onClick={useHint}
                disabled={timeUp || hintBusy || !sessionId || hintsRemaining <= 0}
                aria-label={`Buka satu huruf, sisa ${hintsRemaining} dari 3`}
              >
                <Lightbulb className="w-4 h-4" /> Buka Huruf ({hintsRemaining}/3)
              </button>
              <button className={`${btn} px-4 py-2.5 bg-white dark:bg-[#1A1535] text-sm`} onClick={clearAll} disabled={timeUp}>
                <Eraser className="w-4 h-4" /> Bersihkan
              </button>
              <button className={`${btn} px-5 py-2.5 bg-[#10B981] text-white text-sm`} onClick={checkAnswers} disabled={timeUp}>
                <CheckCircle2 className="w-4 h-4" /> Cek Jawaban
              </button>
              <GameBackButton
                onClick={() => {
                  const adaProgress = filledCells > 0 || combo > 0 || timeBudgetRef.current - remainingSec > 0;
                  if (adaProgress) setConfirmExit(true);
                  else setScreen("levels");
                }}
                label="Kembali"
                title="Kembali ke pilihan level"
              />
            </div>

            {/* Daftar petunjuk */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white dark:bg-[#1A1535] rounded-2xl border-4 border-[#161B3A] dark:border-white/25 shadow-[4px_4px_0_#4338CA] p-3.5">
                <div className="flex items-center gap-1.5 font-extrabold text-sm mb-2">
                  <ArrowRight className="w-4 h-4" /> Mendatar
                </div>
                <ul className="space-y-1.5">
                  {mendatar.map((w) => (
                    <li key={`A${w.number}`}>
                      <button
                        className={`text-left text-xs font-semibold w-full rounded-lg px-2 py-1 transition-colors ${activeWordNum === w.number && dir === "A" ? "bg-[#FEF3C7] dark:bg-[#2D2060]" : "hover:bg-gray-100 dark:hover:bg-white/10"}`}
                        onClick={() => { setDir("A"); selectCell(w.row, w.col); }}
                      >
                        <b>{w.number}.</b> {w.clue}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white dark:bg-[#1A1535] rounded-2xl border-4 border-[#161B3A] dark:border-white/25 shadow-[4px_4px_0_#4338CA] p-3.5">
                <div className="flex items-center gap-1.5 font-extrabold text-sm mb-2">
                  <ArrowDown className="w-4 h-4" /> Menurun
                </div>
                <ul className="space-y-1.5">
                  {menurun.map((w) => (
                    <li key={`D${w.number}`}>
                      <button
                        className={`text-left text-xs font-semibold w-full rounded-lg px-2 py-1 transition-colors ${activeWordNum === w.number && dir === "D" ? "bg-[#FEF3C7] dark:bg-[#2D2060]" : "hover:bg-gray-100 dark:hover:bg-white/10"}`}
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
          <div className={`tts-screen bg-white dark:bg-gradient-to-br dark:from-[#1A1535] dark:to-[#221C48] rounded-3xl ${chunky} p-6 text-center`}>
            <div className="flex justify-center mb-2">
              <MascotFace mascot={mascot} celebrating={result.pct === 100} />
            </div>
            <h2 className="font-extrabold text-3xl mb-1" style={{ color: result.pct === 100 ? "#10B981" : isDark ? "#F1EDFF" : "#161B3A" }}>
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
              <div className="inline-block bg-[#FBBF24] rounded-2xl px-6 py-3 shadow-[5px_5px_0_#4338CA]">
                <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">+XP / +Koin</div>
                <div className="font-extrabold text-2xl leading-none flex items-center gap-1.5">
                  <Zap className="w-5 h-5" />{result.xp} <Coins className="w-5 h-5 ml-1" />{result.coins}
                </div>
              </div>
            </div>

            {/* KUIS TTS 1.1 (§19): result = reward + next action — bonus jadi chip transparan. */}
            <div className="flex justify-center gap-3 mb-5 text-sm flex-wrap">
              <div className="bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#4338CA]">
                <Lightbulb className="w-4 h-4 inline mr-1 text-amber-500" />
                Petunjuk dipakai <b>{result.hints}×</b>
              </div>
              <div className="bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#4338CA]">
                <Trophy className="w-4 h-4 inline mr-1 text-violet-500" />
                Waktu dipakai <b>{fmtTime(result.time)}</b>
              </div>
              {streak.streak >= 2 && (
                <div className="bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#4338CA]">
                  <Flame className="w-4 h-4 inline mr-1 text-orange-500" />
                  Bonus rentetan <b>+{streakXpBonus(streak.streak)} XP</b>
                </div>
              )}
              {result.pct === 100 && (
                <div className="bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#4338CA]">
                  <Heart className="w-4 h-4 inline mr-1 text-rose-500" fill="#F43F5E" />
                  Bonus nyawa <b>+1</b>
                </div>
              )}
              {bestCombo >= 2 && (
                <div className="bg-white dark:bg-[#1A1535] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#4338CA]">
                  <Flame className="w-4 h-4 inline mr-1 text-orange-500" />
                  Beruntun terbaik <b>×{bestCombo}</b>
                </div>
              )}
            </div>

            {/* KUIS TTS 1.0 (§15): MAIN LAGI (primary) + KEMBALI KE GIM (secondary).
                Level berikutnya muncul saat sempurna — progresi natural. */}
            <div className="flex flex-wrap justify-center gap-3">
              {result.pct === 100 && puzzleId < TOTAL_LEVELS ? (
                <button className={`${btn} px-5 py-3 text-white`} style={{ background: color }} onClick={() => { openSetup(puzzleId + 1); }}>
                  Level Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button className={`${btn} px-5 py-3 text-white`} style={{ background: color }} onClick={() => setScreen("setup")}>
                  <RotateCcw className="w-4 h-4" /> Main Lagi
                </button>
              )}
              <button className={`${btn} px-5 py-3 bg-[#FBBF24] hover:brightness-110`} onClick={() => router.push("/arena/game")}>
                Kembali ke Arena
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
