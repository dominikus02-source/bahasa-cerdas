"use client";

/**
 * Irama Kata — game ritme bahasa: kata-kata jatuh di 4 jalur, ketuk HANYA
 * kata yang sesuai aturan level ("ketuk kata BAKU!", "ketuk KATA KERJA!"),
 * biarkan sisanya lewat. Refleks + klasifikasi kata.
 *
 * Adaptasi dari konsep BeatCraft (rhythm 4 lanes) ke konten Bahasa Indonesia.
 * - Ketuk kata yang BENAR saat menyentuh garis -> PAS/BAGUS + combo
 * - Ketuk kata yang SALAH -> combo hangus + penalti skor
 * - Kata benar lolos garis -> MELESET, -1 nyawa (3 nyawa)
 * - 9 level: aturan bergantian, tempo makin cepat
 * - XP dikirim ke /api/game/xp (dibatasi), progres level di localStorage
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { setQuiet } from "@/lib/notif-quiet"
import {
  Heart, Play, Pause, X, Volume2, VolumeX, Lock, Star, Trophy, Zap,
  RotateCcw, ChevronRight, Music4,
} from "lucide-react";

/* ---------- Bank kata ---------- */
const BAKU = ["apotek", "izin", "zaman", "sistem", "nomor", "hafal", "imbau", "cabai", "jadwal", "foto", "teknik", "risiko", "nasihat", "ijazah", "praktik", "napas", "objek", "silakan", "atlet", "asas", "kualitas", "analisis", "hakikat", "kaidah", "kuitansi", "respons", "modern", "karier", "saraf", "cedera"];
const NONBAKU = ["apotik", "ijin", "jaman", "sistim", "nomer", "hapal", "himbau", "cabe", "jadual", "poto", "tehnik", "resiko", "nasehat", "ijasah", "praktek", "nafas", "obyek", "silahkan", "atlit", "azas", "kwalitas", "analisa", "hakekat", "kaedah", "kwitansi", "respon", "moderen", "karir", "sarap", "cidera"];
const BENDA = ["meja", "buku", "kursi", "sepeda", "sekolah", "pensil", "jendela", "gunung", "sungai", "pantai", "kelas", "papan", "lemari", "sepatu", "topi", "roti", "nasi", "bunga", "pohon", "burung", "rumah", "pintu", "kapal", "sawah"];
const KERJA = ["makan", "minum", "berlari", "tidur", "menulis", "membaca", "melompat", "duduk", "berdiri", "menyapu", "memasak", "mencuci", "bermain", "belajar", "menyanyi", "berenang", "menari", "melukis", "menanam", "memetik"];
const SIFAT = ["besar", "kecil", "tinggi", "rendah", "cantik", "rajin", "malas", "cepat", "lambat", "panas", "dingin", "manis", "pahit", "berani", "ramah", "sopan", "bersih", "kotor", "terang", "gelap", "luas", "sempit", "kuat", "lemah"];

type RuleKey = "BAKU" | "BENDA" | "KERJA" | "SIFAT";
const RULES: Record<RuleKey, { label: string; valid: string[]; invalid: string[] }> = {
  BAKU: { label: "Ketuk kata BAKU", valid: BAKU, invalid: NONBAKU },
  BENDA: { label: "Ketuk KATA BENDA", valid: BENDA, invalid: [...KERJA, ...SIFAT] },
  KERJA: { label: "Ketuk KATA KERJA", valid: KERJA, invalid: [...BENDA, ...SIFAT] },
  SIFAT: { label: "Ketuk KATA SIFAT", valid: SIFAT, invalid: [...BENDA, ...KERJA] },
};

type Level = { id: number; name: string; rule: RuleKey; bpm: number; duration: number; density: number; color: string };
const LEVELS: Level[] = [
  { id: 1, name: "Baku Pemula", rule: "BAKU", bpm: 46, duration: 30, density: 0.55, color: "#FF6B6B" },
  { id: 2, name: "Benda di Sekitar", rule: "BENDA", bpm: 50, duration: 32, density: 0.58, color: "#F59E0B" },
  { id: 3, name: "Aksi Cepat", rule: "KERJA", bpm: 54, duration: 34, density: 0.6, color: "#10B981" },
  { id: 4, name: "Sifat Kilat", rule: "SIFAT", bpm: 58, duration: 36, density: 0.62, color: "#38BDF8" },
  { id: 5, name: "Baku Lanjut", rule: "BAKU", bpm: 62, duration: 38, density: 0.66, color: "#FF6B6B" },
  { id: 6, name: "Benda Ngebut", rule: "BENDA", bpm: 66, duration: 40, density: 0.7, color: "#F59E0B" },
  { id: 7, name: "Kerja Keras", rule: "KERJA", bpm: 71, duration: 42, density: 0.74, color: "#10B981" },
  { id: 8, name: "Sifat Super", rule: "SIFAT", bpm: 76, duration: 45, density: 0.78, color: "#38BDF8" },
  { id: 9, name: "Master Baku", rule: "BAKU", bpm: 82, duration: 50, density: 0.82, color: "#8B5CF6" },
];

const LANE_COLORS = ["#FF6B6B", "#FBBF24", "#4ADE80", "#38BDF8"];
const LANE_KEYS = ["d", "f", "j", "k"];
const W = 480, H = 640;
const FALL_TIME = 2400;
const PERFECT_WIN = 110;
const GOOD_WIN = 220;

/* ---------- Audio ringan (beat + efek) ---------- */
let audioCtx: AudioContext | null = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* no audio */ }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(muted: boolean, freq: number, type: OscillatorType, dur: number, gain: number, slideTo?: number) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}
// Hi-hat: burst noise pendek lewat highpass filter.
function noise(muted: boolean, dur = 0.04, gain = 0.05) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  src.start();
}

/* ---------- Musik prosedural ----------
 * Chiptune ringan yang dibangkitkan dari clock BPM yang sama dengan jatuhnya
 * kata: kick + bass di tiap ketukan, hi-hat + arpeggio melodi di antara
 * ketukan. Nada dasar berbeda per level -> tiap level terdengar beda,
 * selalu sinkron sempurna, tanpa file audio & tanpa lisensi. */
const PENT = [1, 1.125, 1.25, 1.5, 1.667, 2]; // tangga nada pentatonik mayor
const BASS_PAT = [0, 0, 3, 4]; // pola bass per bar (4 ketukan)
const ARP_PAT = [0, 2, 4, 5, 4, 2, 1, 3]; // pola melodi arpeggio
const ROOTS = [262, 294, 330, 349, 392]; // C4 D4 E4 F4 G4 — nada dasar per level

/* ---------- Tipe catatan ---------- */
type Note = { time: number; lane: number; word: string; valid: boolean; hit: boolean; missed: boolean; wrong: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; rot: number; vr: number };
type Popup = { x: number; y: number; text: string; color: string; life: number };
type HitStats = { pas: number; bagus: number; meleset: number; salah: number };

function makeNotes(level: Level): Note[] {
  const { valid, invalid } = RULES[level.rule];
  const beatMs = 60000 / level.bpm;
  const total = Math.floor((level.duration * 1000) / beatMs);
  const notes: Note[] = [];
  let lastLane = -1;
  for (let i = 0; i < total; i++) {
    if (Math.random() > level.density) continue;
    let lane: number;
    do { lane = Math.floor(Math.random() * 4); } while (lane === lastLane && Math.random() < 0.6);
    lastLane = lane;
    const isValid = Math.random() < 0.55;
    const pool = isValid ? valid : invalid;
    notes.push({
      time: i * beatMs + 2000,
      lane,
      word: pool[Math.floor(Math.random() * pool.length)],
      valid: isValid,
      hit: false, missed: false, wrong: false,
    });
  }
  return notes;
}

/* ---------- Progres tersimpan ---------- */
type Saved = { unlocked: number[]; best: Record<number, number> };
function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem("irama-kata-progress");
    if (raw) { const d = JSON.parse(raw); return { unlocked: d.unlocked || [1], best: d.best || {} }; }
  } catch { /* abaikan */ }
  return { unlocked: [1], best: {} };
}
function saveSaved(s: Saved) {
  try { localStorage.setItem("irama-kata-progress", JSON.stringify(s)); } catch { /* abaikan */ }
}

function starsFor(score: number): number {
  if (score >= 4500) return 3;
  if (score >= 2500) return 2;
  if (score >= 900) return 1;
  return 0;
}

/* ---------- Komponen ---------- */
export default function IramaKata() {
  const [screen, setScreen] = useState<"start" | "levels" | "game" | "result">("start");
  const [saved, setSaved] = useState<Saved>({ unlocked: [1], best: {} });
  const [muted, setMuted] = useState(false);
  const [levelId, setLevelId] = useState(1);
  const [result, setResult] = useState<{ score: number; stats: HitStats; maxCombo: number; acc: number; gameOver: boolean; stars: number } | null>(null);
  const [paused, setPaused] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<{ score: HTMLSpanElement | null; combo: HTMLSpanElement | null; lives: HTMLDivElement | null }>({ score: null, combo: null, lives: null });
  const engineRef = useRef<Engine | null>(null);
  const mutedRef = useRef(false);
  const xpSentRef = useRef(false);

  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(screen === "game")
    return () => setQuiet(false)
  }, [screen]);

  useEffect(() => {
    setSaved(loadSaved());
    try { setMuted(localStorage.getItem("irama-kata-muted") === "1"); } catch { /* abaikan */ }
  }, []);
  useEffect(() => {
    mutedRef.current = muted;
    try { localStorage.setItem("irama-kata-muted", muted ? "1" : "0"); } catch { /* abaikan */ }
  }, [muted]);

  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];

  /* Engine dalam class agar loop rAF tak menyentuh state React tiap frame */
  class Engine {
    level: Level;
    notes: Note[];
    particles: Particle[] = [];
    popups: Popup[] = [];
    laneFlash = [0, 0, 0, 0];
    score = 0; combo = 0; maxCombo = 0; lives = 3;
    stats: HitStats = { pas: 0, bagus: 0, meleset: 0, salah: 0 };
    elapsed = 0; startTime = 0; totalPauseMs = 0; pauseStart = 0;
    paused = false; running = false; countdownMs = 2000; countingDown = true;
    lastBeat = -1; beatPulse = 0; shake = 0; lastFrame = 0;
    endTime: number;
    root: number; // nada dasar musik level ini
    constructor(lv: Level) {
      this.level = lv;
      this.notes = makeNotes(lv);
      this.endTime = (lv.duration + 2.5) * 1000;
      this.root = ROOTS[(lv.id - 1) % ROOTS.length];
    }
    start() {
      ensureAudio();
      this.running = true;
      this.lastFrame = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
    stop() { this.running = false; }
    setPaused(p: boolean) {
      if (p && !this.paused) { this.paused = true; this.pauseStart = performance.now(); }
      else if (!p && this.paused) { this.totalPauseMs += performance.now() - this.pauseStart; this.paused = false; }
    }
    tap(lane: number) {
      if (!this.running || this.paused || this.countingDown) return;
      this.laneFlash[lane] = 1;
      let nearest: Note | null = null, dist = Infinity;
      for (const n of this.notes) {
        if (n.lane !== lane || n.hit || n.missed || n.wrong) continue;
        const d = Math.abs(n.time - this.elapsed);
        if (d < dist) { dist = d; nearest = n; }
      }
      if (!nearest || dist >= GOOD_WIN) return;
      if (nearest.valid) {
        nearest.hit = true;
        const perfect = dist < PERFECT_WIN;
        const bonus = Math.floor(this.combo / 8) * 15;
        this.score += (perfect ? 100 : 50) + bonus;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        if (perfect) this.stats.pas++; else this.stats.bagus++;
        this.burst(lane, perfect ? 14 : 9, perfect);
        this.popups.push({ x: lane * (W / 4) + W / 8, y: H - 130, text: perfect ? "PAS!" : "BAGUS", color: perfect ? "#4ADE80" : "#FBBF24", life: 52 });
        const freqs = [330, 415, 495, 590];
        tone(mutedRef.current, freqs[lane], "triangle", 0.13, 0.2, freqs[lane] * 1.4);
        if (perfect) tone(mutedRef.current, freqs[lane] * 2, "sine", 0.16, 0.1);
        if (navigator.vibrate) navigator.vibrate(perfect ? 25 : 12);
      } else {
        // Ketuk kata yang tidak sesuai aturan -> penalti (bukan nyawa)
        nearest.wrong = true;
        this.combo = 0;
        this.score = Math.max(0, this.score - 30);
        this.stats.salah++;
        this.shake = 7;
        this.popups.push({ x: lane * (W / 4) + W / 8, y: H - 130, text: "SALAH!", color: "#FF6B6B", life: 52 });
        tone(mutedRef.current, 180, "sawtooth", 0.2, 0.14, 78);
        if (navigator.vibrate) navigator.vibrate([25, 35, 25]);
      }
    }
    burst(lane: number, count: number, perfect: boolean) {
      const cx = lane * (W / 4) + W / 8, cy = H - 95;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const sp = 3 + Math.random() * 5;
        this.particles.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2,
          size: 5 + Math.random() * 6,
          color: Math.random() < 0.35 ? "#FFFFFF" : perfect && Math.random() < 0.3 ? "#FBBF24" : LANE_COLORS[lane],
          life: 26 + Math.random() * 20,
          rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.4,
        });
      }
    }
    miss(n: Note) {
      n.missed = true;
      this.combo = 0;
      this.lives--;
      this.stats.meleset++;
      this.shake = 8;
      this.popups.push({ x: n.lane * (W / 4) + W / 8, y: H - 130, text: "MELESET", color: "#FF6B6B", life: 50 });
      tone(mutedRef.current, 160, "sawtooth", 0.18, 0.13, 75);
      if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
      if (this.lives <= 0) this.finish(true);
    }
    loop(now: number) {
      if (!this.running) return;
      const dt = now - this.lastFrame;
      this.lastFrame = now;
      if (!this.paused) {
        if (this.countingDown) {
          this.countdownMs -= dt;
          if (this.countdownMs <= 0) { this.countingDown = false; this.startTime = now; }
        } else {
          this.elapsed = now - this.startTime - this.totalPauseMs;
          const beatMs = 60000 / this.level.bpm;
          // Musik prosedural: resolusi setengah ketukan. Ketukan = kick + bass;
          // antara ketukan = hi-hat + arpeggio melodi. Semua dari clock BPM
          // yang sama dengan jatuhnya kata -> selalu sinkron.
          const half = Math.floor(this.elapsed / (beatMs / 2));
          if (half !== this.lastBeat && half >= 0) {
            this.lastBeat = half;
            const beat = half >> 1;
            if (half % 2 === 0) {
              this.beatPulse = 1;
              const accent = beat % 4 === 0;
              tone(mutedRef.current, accent ? 130 : 95, "sine", 0.14, accent ? 0.3 : 0.18, 44); // kick
              tone(mutedRef.current, (this.root / 2) * PENT[BASS_PAT[beat % 4]], "triangle", 0.3, 0.1); // bass
            } else {
              noise(mutedRef.current); // hi-hat
              tone(mutedRef.current, this.root * PENT[ARP_PAT[half % 8] % 6], "square", 0.09, 0.04); // melodi
            }
          }
          this.beatPulse *= 0.9;
          for (const n of this.notes) {
            if (!n.hit && !n.missed && !n.wrong && n.valid && this.elapsed - n.time > GOOD_WIN) this.miss(n);
            if (!this.running) return;
          }
          if (this.elapsed >= this.endTime) { this.finish(false); return; }
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.98; p.life--; p.rot += p.vr;
            if (p.life <= 0) this.particles.splice(i, 1);
          }
          for (let i = this.popups.length - 1; i >= 0; i--) {
            const p = this.popups[i];
            p.y -= 1.1; p.life--;
            if (p.life <= 0) this.popups.splice(i, 1);
          }
          for (let i = 0; i < 4; i++) this.laneFlash[i] *= 0.85;
          this.shake *= 0.82;
        }
      }
      this.render();
      this.hud();
      requestAnimationFrame((t) => this.loop(t));
    }
    finish(gameOver: boolean) {
      if (!this.running) return;
      this.running = false;
      onFinish(this, gameOver);
    }
    hud() {
      const h = hudRef.current;
      if (h.score) h.score.textContent = String(this.score);
      if (h.combo) h.combo.textContent = this.combo + "×";
      if (h.lives) {
        const hearts = h.lives.children;
        for (let i = 0; i < hearts.length; i++) {
          (hearts[i] as HTMLElement).style.opacity = i < this.lives ? "1" : "0.25";
        }
      }
    }
    render() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const c = canvas.getContext("2d");
      if (!c) return;
      c.save();
      if (this.shake > 0.3) c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);

      const p = this.beatPulse;
      const grad = c.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgb(${30 + p * 26},${24 + p * 18},${64 + p * 36})`);
      grad.addColorStop(1, `rgb(${16 + p * 16},${14 + p * 12},${40 + p * 22})`);
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);

      const laneW = W / 4;
      const hitY = H - 100;
      for (let i = 0; i < 4; i++) {
        const x = i * laneW;
        c.fillStyle = i % 2 === 0 ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.05)";
        c.fillRect(x, 0, laneW, H);
        if (this.laneFlash[i] > 0.05) {
          const lg = c.createLinearGradient(0, hitY - 180, 0, hitY + 50);
          lg.addColorStop(0, "rgba(255,255,255,0)");
          lg.addColorStop(1, LANE_COLORS[i]);
          c.globalAlpha = this.laneFlash[i] * 0.5;
          c.fillStyle = lg;
          c.fillRect(x, hitY - 180, laneW, 230);
          c.globalAlpha = 1;
        }
        if (i > 0) {
          c.strokeStyle = "rgba(255,255,255,.08)";
          c.lineWidth = 2;
          c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
        }
      }

      for (let i = 0; i < 4; i++) {
        const x = i * laneW + 10, w = laneW - 20;
        c.fillStyle = LANE_COLORS[i];
        c.globalAlpha = 0.16 + this.laneFlash[i] * 0.45;
        c.beginPath(); c.roundRect(x, hitY - 26, w, 54, 14); c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = LANE_COLORS[i];
        c.lineWidth = 3 + this.laneFlash[i] * 2;
        c.beginPath(); c.roundRect(x, hitY - 26, w, 54, 14); c.stroke();
      }
      c.fillStyle = "rgba(255,255,255,.9)";
      c.fillRect(0, hitY - 2, W, 4);

      // Kata jatuh
      for (const n of this.notes) {
        if (n.hit) continue;
        const dtn = n.time - this.elapsed;
        if (dtn > FALL_TIME) continue;
        if ((n.missed || n.wrong) && dtn < -GOOD_WIN - 250) continue;
        const y = (1 - dtn / FALL_TIME) * hitY;
        if (y < -46) continue;
        const x = n.lane * laneW + 8, nw = laneW - 16, nh = 42;
        c.fillStyle = "rgba(0,0,0,.35)";
        c.beginPath(); c.roundRect(x + 3, y + 4, nw, nh, 12); c.fill();
        c.fillStyle = n.missed || n.wrong ? "#3a3f5c" : LANE_COLORS[n.lane];
        c.beginPath(); c.roundRect(x, y, nw, nh, 12); c.fill();
        // Kilau atas (glossy stripe) + titik kilau — ciri chunky BeatCraft
        if (!n.missed && !n.wrong) {
          c.fillStyle = "rgba(255,255,255,.4)";
          c.beginPath(); c.roundRect(x + 5, y + 4, nw - 10, 6, 3); c.fill();
          c.fillStyle = "rgba(255,255,255,.6)";
          c.beginPath(); c.arc(x + nw - 11, y + nh / 2 + 3, 3, 0, Math.PI * 2); c.fill();
        }
        c.strokeStyle = "#0E1330";
        c.lineWidth = 3;
        c.beginPath(); c.roundRect(x, y, nw, nh, 12); c.stroke();
        c.font = "800 16px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = n.missed || n.wrong ? "rgba(255,255,255,.4)" : "#0E1330";
        c.fillText(n.word, x + nw / 2, y + nh / 2 + 4, nw - 14);
        c.textBaseline = "alphabetic";
      }

      for (const pt of this.particles) {
        c.save();
        c.translate(pt.x, pt.y);
        c.rotate(pt.rot);
        c.globalAlpha = Math.min(1, pt.life / 28);
        c.fillStyle = pt.color;
        c.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
        c.restore();
      }
      c.globalAlpha = 1;

      for (const pp of this.popups) {
        c.save();
        c.globalAlpha = Math.min(1, pp.life / 28);
        c.font = "800 26px system-ui, sans-serif";
        c.textAlign = "center";
        c.lineWidth = 5;
        c.strokeStyle = "#0E1330";
        c.strokeText(pp.text, pp.x, pp.y);
        c.fillStyle = pp.color;
        c.fillText(pp.text, pp.x, pp.y);
        c.restore();
      }
      c.globalAlpha = 1;

      if (this.combo >= 4) {
        c.save();
        c.translate(W / 2, 96);
        c.scale(1 + Math.min(0.3, this.combo * 0.01), 1 + Math.min(0.3, this.combo * 0.01));
        c.font = "800 32px system-ui, sans-serif";
        c.textAlign = "center";
        c.lineWidth = 6;
        c.strokeStyle = "#0E1330";
        const g2 = c.createLinearGradient(0, -18, 0, 18);
        g2.addColorStop(0, "#FBBF24");
        g2.addColorStop(1, "#FF6B6B");
        c.strokeText(this.combo + " RENTETAN", 0, 0);
        c.fillStyle = g2;
        c.fillText(this.combo + " RENTETAN", 0, 0);
        c.restore();
      }

      // Aturan level (selalu terlihat)
      c.font = "800 15px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillStyle = "rgba(255,255,255,.85)";
      c.fillText(RULES[this.level.rule].label + " — biarkan yang lain lewat!", W / 2, 44);

      c.font = "800 16px system-ui, sans-serif";
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "rgba(255,255,255,.6)";
        c.fillText(["D", "F", "J", "K"][i], i * laneW + laneW / 2, H - 16);
      }

      const prog = Math.min(1, Math.max(0, this.elapsed / this.endTime));
      c.fillStyle = "rgba(255,255,255,.15)";
      c.fillRect(16, 14, W - 32, 8);
      c.fillStyle = "#4ADE80";
      c.beginPath(); c.roundRect(16, 14, (W - 32) * prog, 8, 4); c.fill();

      if (this.countingDown) {
        c.fillStyle = "rgba(14,19,48,.65)";
        c.fillRect(0, 0, W, H);
        const num = Math.ceil(this.countdownMs / 660);
        const label = num > 0 ? String(num) : "MULAI!";
        const phase = (this.countdownMs % 660) / 660;
        c.save();
        c.translate(W / 2, H / 2 - 30);
        c.scale(1 + (1 - phase) * 0.4, 1 + (1 - phase) * 0.4);
        c.font = "800 96px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.lineWidth = 8;
        c.strokeStyle = "#0E1330";
        c.strokeText(label, 0, 0);
        c.fillStyle = label === "MULAI!" ? "#4ADE80" : "#FBBF24";
        c.fillText(label, 0, 0);
        c.restore();
        c.textBaseline = "alphabetic";
        c.font = "800 20px system-ui, sans-serif";
        c.fillStyle = "#fff";
        c.textAlign = "center";
        c.fillText(RULES[this.level.rule].label, W / 2, H / 2 + 64);
        c.font = "600 14px system-ui, sans-serif";
        c.fillStyle = "rgba(255,255,255,.7)";
        c.fillText("Biarkan kata yang tidak sesuai lewat", W / 2, H / 2 + 92);
      }

      if (this.paused) {
        c.fillStyle = "rgba(14,19,48,.75)";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#fff";
        c.font = "800 48px system-ui, sans-serif";
        c.textAlign = "center";
        c.fillText("JEDA", W / 2, H / 2);
        c.font = "600 16px system-ui, sans-serif";
        c.fillStyle = "rgba(255,255,255,.75)";
        c.fillText("Tekan Spasi atau tombol jeda untuk lanjut", W / 2, H / 2 + 34);
      }

      c.restore();
    }
  }

  const onFinish = useCallback((g: InstanceType<typeof Engine>, gameOver: boolean) => {
    const total = g.stats.pas + g.stats.bagus + g.stats.meleset + g.stats.salah;
    const acc = total === 0 ? 0 : Math.round(((g.stats.pas + g.stats.bagus * 0.5) / total) * 100);
    const stars = gameOver ? 0 : starsFor(g.score);
    setResult({ score: g.score, stats: g.stats, maxCombo: g.maxCombo, acc, gameOver, stars });
    setScreen("result");
    setPaused(false);

    // Simpan progres + buka level berikutnya
    setSaved((prev) => {
      const next = { unlocked: [...prev.unlocked], best: { ...prev.best } };
      if (!gameOver) {
        if (!next.best[g.level.id] || g.score > next.best[g.level.id]) next.best[g.level.id] = g.score;
        const nid = g.level.id + 1;
        if (nid <= LEVELS.length && !next.unlocked.includes(nid)) next.unlocked.push(nid);
      }
      saveSaved(next);
      return next;
    });

    // XP dibatasi server-pattern: skor/40, maks 60 per run
    if (!xpSentRef.current && g.score > 0) {
      xpSentRef.current = true;
      let supabaseId = "";
      try { supabaseId = JSON.parse(localStorage.getItem("bc-user") || "{}").state?.supabaseId || ""; } catch { /* abaikan */ }
      fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: g.score,
          correct: g.stats.pas + g.stats.bagus,
          wrong: g.stats.meleset + g.stats.salah,
          maxStreak: g.maxCombo,
          xpEarned: Math.min(Math.floor(g.score / 40), 60),
          gameType: "IRAMA_KATA",
          supabaseId,
        }),
      }).catch(() => { /* abaikan */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLevel = useCallback((id: number) => {
    ensureAudio();
    const lv = LEVELS.find((l) => l.id === id);
    if (!lv) return;
    setLevelId(id);
    setResult(null);
    setPaused(false);
    xpSentRef.current = false;
    setScreen("game");
    engineRef.current?.stop();
    const eng = new Engine(lv);
    engineRef.current = eng;
    // Tunggu canvas ter-mount
    requestAnimationFrame(() => eng.start());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = useCallback(() => {
    const g = engineRef.current;
    if (!g || !g.running) return;
    const p = !g.paused;
    g.setPaused(p);
    setPaused(p);
  }, []);

  const quit = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setScreen("levels");
  }, []);

  /* Keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== "game") return;
      if (e.repeat) return;
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (lane >= 0) { e.preventDefault(); engineRef.current?.tap(lane); return; }
      if (e.key === " ") { e.preventDefault(); togglePause(); }
      if (e.key === "Escape") quit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, togglePause, quit]);

  useEffect(() => () => engineRef.current?.stop(), []);

  const chunky = "border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#DB2777]";
  const btn = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#140A12] dark:to-[#1E0E1A] text-[#161B3A] dark:text-[#F1EDFF]">
      <style>{`
        @keyframes ik-float1{0%,100%{transform:translate(0,0) rotate(6deg)}50%{transform:translate(16px,-22px) rotate(18deg)}}
        @keyframes ik-float2{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-18px,16px) rotate(-12deg)}}
        @keyframes ik-eq{0%{height:25%}100%{height:100%}}
        @keyframes ik-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes ik-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ik-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .ik-screen{animation:ik-fade .35s ease}
        .ik-star-lit{animation:ik-pop .5s ease}
        .ik-logo{animation:ik-pulse 1.4s ease-in-out infinite}
        .ik-eq span{display:block;width:8px;border-radius:3px 3px 0 0;border:2.5px solid #161B3A;box-shadow:2px 2px 0 #161B3A;animation:ik-eq 1s ease-in-out infinite alternate}
      `}</style>
      {/* Dekorasi melayang */}
      <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#FF6B6B] border-4 border-[#161B3A] dark:border-white/25 rounded-3xl" style={{ animation: "ik-float1 9s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#38BDF8] border-4 border-[#161B3A] dark:border-white/25 rounded-full" style={{ animation: "ik-float2 10s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#FBBF24] border-4 border-[#161B3A] dark:border-white/25 rounded-2xl" style={{ animation: "ik-float1 11s ease-in-out infinite" }} />
      <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#4ADE80] border-4 border-[#161B3A] dark:border-white/25 rounded-[30%_70%_70%_30%]" style={{ animation: "ik-float2 8s ease-in-out infinite" }} />

      <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`ik-logo w-11 h-11 bg-[#FF6B6B] rounded-2xl ${chunky} !shadow-[4px_4px_0_#DB2777] flex items-center justify-center`}>
              <Music4 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-xl leading-none font-game-display">Irama Kata</div>
              <div className="text-[11px] font-semibold opacity-60 mt-0.5">Ritme + ketangkasan bahasa</div>
            </div>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className={`${btn} w-11 h-11 bg-white border-2 border-slate-200 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50`}
            aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* ---------- MULAI ---------- */}
        {screen === "start" && (
          <div className={`ik-screen bg-white dark:bg-gradient-to-br dark:from-[#221420] dark:to-[#2C1E2A] rounded-3xl ${chunky} p-6 text-center`}>
            <span className="inline-block px-4 py-1.5 bg-[#FBBF24] border-[3px] border-[#161B3A] dark:border-white/25 rounded-full font-extrabold text-xs shadow-[3px_3px_0_#DB2777] mb-4">
              Sesi 60 detik · 9 level
            </span>
            {/* Equalizer */}
            <div className="ik-eq flex gap-1.5 items-end h-10 justify-center mb-4">
              <span style={{ background: "#FF6B6B", animationDelay: "-.2s" }} />
              <span style={{ background: "#FBBF24", animationDelay: "-.5s" }} />
              <span style={{ background: "#4ADE80", animationDelay: "-.8s" }} />
              <span style={{ background: "#38BDF8", animationDelay: "-.3s" }} />
              <span style={{ background: "#FF6B6B", animationDelay: "-.6s" }} />
              <span style={{ background: "#FBBF24", animationDelay: "-.1s" }} />
              <span style={{ background: "#4ADE80", animationDelay: "-.9s" }} />
            </div>
            <h1 className="font-extrabold text-4xl mb-2">Ketuk Kata yang <span className="text-[#FF6B6B]">Tepat!</span></h1>
            <p className="opacity-70 text-sm max-w-sm mx-auto mb-5">
              Kata-kata jatuh di 4 jalur. Ketuk hanya kata yang <b>sesuai aturan tingkat</b> saat menyentuh garis — biarkan sisanya lewat. Salah ketuk, rentetan hangus!
            </p>
            <div className="flex justify-center gap-2 mb-1">
              {["D", "F", "J", "K"].map((k, i) => (
                <div key={k} className="w-11 h-11 flex items-center justify-center font-extrabold text-lg rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 shadow-[3px_3px_0_#DB2777]" style={{ background: LANE_COLORS[i], color: i === 0 ? "#fff" : "#161B3A" }}>
                  {k}
                </div>
              ))}
            </div>
            <p className="text-[11px] opacity-60 mb-5">atau ketuk jalurnya langsung di layar sentuh</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button className={`${btn} px-6 py-3.5 bg-[#FF6B6B] text-white text-lg`} onClick={() => setScreen("levels")}>
                <Play className="w-5 h-5" /> Main Sekarang
              </button>
              <button className={`${btn} px-5 py-3.5 bg-white dark:bg-[#221420]`} onClick={() => startLevel(1)}>
                Langsung Level 1
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-6 text-center">
              <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#DB2777]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Pas</div>
                <div className="font-extrabold text-lg">+100</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#DB2777]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Bagus</div>
                <div className="font-extrabold text-lg">+50</div>
              </div>
              <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[3px_3px_0_#DB2777]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Meleset</div>
                <div className="font-extrabold text-lg">-1 Nyawa</div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- PILIH LEVEL ---------- */}
        {screen === "levels" && (
          <div className={`ik-screen bg-white dark:bg-gradient-to-br dark:from-[#221420] dark:to-[#2C1E2A] rounded-3xl ${chunky} p-5`}>
            <div className="flex items-center justify-between mb-4">
            <button className={`${btn} w-12 h-12 bg-white border-2 border-slate-200 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50`} onClick={() => setScreen("start")} aria-label="Kembali">
              <X className="w-5 h-5 text-[#161B3A] dark:text-[#F1EDFF] text-[#161B3A] dark:text-[#F1EDFF]" />
            </button>
              <h2 className="font-extrabold text-2xl">Pilih Tingkat</h2>
              <div className="w-11" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LEVELS.map((lv) => {
                const unlocked = saved.unlocked.includes(lv.id);
                const best = saved.best[lv.id] || 0;
                const st = starsFor(best);
                return (
                  <button
                    key={lv.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && startLevel(lv.id)}
                    className={`text-left rounded-2xl border-4 border-[#161B3A] dark:border-white/25 p-3.5 transition-transform ${
                      unlocked ? "shadow-[5px_5px_0_#DB2777] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-[5px_5px_0_#9CA3AF] dark:bg-slate-700/60 dark:text-[#4A1838]"
                    }`}
                    style={unlocked ? { background: lv.color, color: lv.color === "#FBBF24" || lv.color === "#F59E0B" || lv.color === "#4ADE80" || lv.color === "#38BDF8" ? "#161B3A" : "#fff" } : undefined}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-extrabold text-2xl leading-none">#{lv.id}</span>
                      {unlocked
                        ? <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/15">{RULES[lv.rule].label.replace("Ketuk ", "")}</span>
                        : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="font-extrabold text-sm leading-tight mb-0.5">{lv.name}</div>
                    <div className="text-[10px] font-semibold opacity-75 mb-1.5">{lv.duration} dtk</div>
                    {unlocked ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star key={i} className="w-4 h-4" fill={i <= st ? "currentColor" : "none"} style={{ opacity: i <= st ? 1 : 0.35 }} />
                        ))}
                        {best > 0 && <span className="text-[10px] font-extrabold ml-1.5 opacity-80">{best}</span>}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold">Selesaikan tingkat sebelumnya</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------- MAIN ---------- */}
        {screen === "game" && (
          <div className="ik-screen flex flex-col items-center">
            {/* HUD */}
            <div className="w-full max-w-[480px] grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-[#161B3A] text-white px-3 py-1.5 shadow-[3px_3px_0_#DB2777]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Skor</div>
                <span ref={(el) => { hudRef.current.score = el; }} className="font-extrabold text-lg leading-none">0</span>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-[#FBBF24] px-3 py-1.5 shadow-[3px_3px_0_#DB2777]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Rentetan</div>
                <span ref={(el) => { hudRef.current.combo = el; }} className="font-extrabold text-lg leading-none">0×</span>
              </div>
              <div className="rounded-xl border-[3px] border-[#161B3A] dark:border-white/25 bg-[#FF6B6B] px-3 py-1.5 shadow-[3px_3px_0_#DB2777]">
                <div className="text-[9px] font-extrabold uppercase text-white/80">Nyawa</div>
                <div ref={(el) => { hudRef.current.lives = el; }} className="flex gap-0.5">
                  {[0, 1, 2].map((i) => <Heart key={i} className="w-4 h-4 text-white" fill="currentColor" />)}
                </div>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full max-w-[480px] rounded-2xl border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#DB2777] touch-none"
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * W;
                engineRef.current?.tap(Math.max(0, Math.min(3, Math.floor(x / (W / 4)))));
              }}
            />

            {/* Tombol jalur sentuh */}
            <div className="w-full max-w-[480px] grid grid-cols-4 gap-2 mt-3 md:hidden">
              {["D", "F", "J", "K"].map((k, i) => (
                <button
                  key={k}
                  className="py-4 rounded-2xl border-4 border-[#161B3A] dark:border-white/25 font-extrabold text-lg shadow-[4px_4px_0_#DB2777] active:translate-y-1 active:shadow-none"
                  style={{ background: LANE_COLORS[i], color: i === 0 ? "#fff" : "#161B3A" }}
                  onPointerDown={(e) => { e.preventDefault(); engineRef.current?.tap(i); }}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="w-full max-w-[480px] flex items-center justify-between mt-3">
              <button className={`${btn} w-12 h-12 bg-white/90 dark:bg-white/20 border-2 dark:border-white/25 hover:bg-white dark:hover:bg-white/30`} onClick={quit} aria-label="Keluar">
                <X className="w-5 h-5 text-[#161B3A] dark:text-[#F1EDFF] text-[#161B3A] dark:text-[#F1EDFF]" />
              </button>
              <div className="hidden md:block text-xs font-semibold opacity-60">
                Tombol <span className="font-mono font-extrabold">D F J K</span> · Spasi = jeda
              </div>
              <button className={`${btn} w-11 h-11 bg-white border-2 border-slate-200 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50`} onClick={togglePause} aria-label={paused ? "Lanjut" : "Jeda"}>
                {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* ---------- HASIL ---------- */}
        {screen === "result" && result && (
          <div className={`ik-screen bg-white dark:bg-gradient-to-br dark:from-[#221420] dark:to-[#2C1E2A] rounded-3xl ${chunky} p-6 text-center`}>
            <h2 className="font-extrabold text-3xl mb-1" style={{ color: result.gameOver ? "#FF6B6B" : result.acc >= 90 ? "#10B981" : "#161B3A" }}>
              {result.gameOver ? "Nyawa Habis!" : result.acc >= 90 ? "Sempurna!" : "Level Selesai!"}
            </h2>
            <p className="opacity-70 text-sm mb-4">
              {result.gameOver ? "Coba lagi — makin sering main makin tajam refleks bahasamu." : "Kerja bagus! Kejar skor lebih tinggi?"}
            </p>

            <div className="flex justify-center gap-1.5 mb-4">
              {[1, 2, 3].map((i) => (
                <Star
                  key={i}
                  className={`w-12 h-12 ${i <= result.stars ? "ik-star-lit" : ""}`}
                  style={i <= result.stars ? { animationDelay: `${i * 0.15}s` } : undefined}
                  fill={i <= result.stars ? "#FBBF24" : "none"}
                  stroke={i <= result.stars ? "#F59E0B" : "#D1D5DB"}
                  strokeWidth={2}
                />
              ))}
            </div>

            <div className="inline-block bg-[#161B3A] text-white rounded-2xl px-7 py-3 mb-4 shadow-[5px_5px_0_#FF6B6B]">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Skor Akhir</div>
              <div className="font-extrabold text-4xl leading-none">{result.score}</div>
            </div>

            <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto mb-4 text-center">
              <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[2px_2px_0_#DB2777]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Pas</div>
                <div className="font-extrabold text-lg">{result.stats.pas}</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[2px_2px_0_#DB2777]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Bagus</div>
                <div className="font-extrabold text-lg">{result.stats.bagus}</div>
              </div>
              <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[2px_2px_0_#DB2777]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Meleset</div>
                <div className="font-extrabold text-lg">{result.stats.meleset}</div>
              </div>
              <div className="bg-white dark:bg-[#221420] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl p-2 shadow-[2px_2px_0_#DB2777]">
                <div className="text-[9px] font-extrabold uppercase opacity-70">Salah</div>
                <div className="font-extrabold text-lg">{result.stats.salah}</div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mb-5 text-sm">
              <div className="bg-white dark:bg-[#221420] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#DB2777]">
                <Zap className="w-4 h-4 inline mr-1 text-amber-500" />
                Rentetan maks <b>{result.maxCombo}×</b>
              </div>
              <div className="bg-white dark:bg-[#221420] border-[3px] border-[#161B3A] dark:border-white/25 rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#DB2777]">
                <Trophy className="w-4 h-4 inline mr-1 text-violet-500" />
                Akurasi <b>{result.acc}%</b>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button className={`${btn} px-5 py-3 bg-white dark:bg-[#221420]`} onClick={() => startLevel(levelId)}>
                <RotateCcw className="w-4 h-4" /> Ulangi
              </button>
              {!result.gameOver && levelId < LEVELS.length && (
                <button className={`${btn} px-5 py-3 bg-[#FF6B6B] text-white`} onClick={() => startLevel(levelId + 1)}>
                  Level Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button className={`${btn} px-5 py-3 bg-[#FBBF24]`} onClick={() => setScreen("levels")}>
                Pilih Tingkat
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] opacity-50 mt-4 pb-4">
          Ketuk hanya kata yang sesuai aturan — kecepatan dan ketelitian sama pentingnya!
        </p>
      </div>
    </div>
  );
}
