"use client";

import { useState, useEffect, useRef } from "react";
import { setQuiet } from "@/lib/notif-quiet"
import { Play, Pause, X, Volume2, VolumeX, Heart, Trophy, Zap, RotateCcw, Clock, Star } from "lucide-react";

/* ---------- Bank Kata ---------- */
const KATA_BENDA = ["meja", "buku", "kursi", "sepeda", "pensil", "pohon", "burung", "rumah", "topi", "roti", "sepatu", "jemari", "kunci", "lampu", "piring", "gelas", "pintu"];
const KATA_KERJA = ["makan", "minum", "lari", "tidur", "tulis", "baca", "lompat", "duduk", "masak", "cuci", "main", "tanam", "gambar", "nyanyi", "renang", "lukis"];
const KATA_SIFAT = ["besar", "kecil", "tinggi", "rendah", "cantik", "rajin", "cepat", "panas", "dingin", "manis", "bersih", "kuat", "cerah", "lembut", "ringan", "berani"];

type RuleKey = "BENDA" | "KERJA" | "SIFAT";
const RULES: Record<RuleKey, { label: string; valid: string[]; invalid: string[] }> = {
  BENDA: { label: "KATA BENDA", valid: KATA_BENDA, invalid: [...KATA_KERJA, ...KATA_SIFAT] },
  KERJA: { label: "KATA KERJA", valid: KATA_KERJA, invalid: [...KATA_BENDA, ...KATA_SIFAT] },
  SIFAT: { label: "KATA SIFAT", valid: KATA_SIFAT, invalid: [...KATA_BENDA, ...KATA_KERJA] },
};

/* ---------- Konfigurasi game (satu sumber nilai, tanpa magic number tersebar) ---------- */
const GAME_CONFIG = {
  canvas: { w: 480, h: 720 },
  durationSec: 90,
  lives: 3,
  zelby: { w: 80, h: 80, yOffset: 85, yCatch: 100 },
  banana: {
    src: "/bananagimBC.jpeg",        // asset utama — satu visual untuk SEMUA item yang jatuh
    w: 60, h: 93,                    // ukuran draw — mengikuti rasio konten banana (573×885)
    // bbox piksel konten banana di dalam berkas 675×1200 (dihitung dari bbox piksel
    // non-putih: 54,144 → 626,1028). Crop dipakai supaya yang tampil hanya banana,
    // bukan kotak putih/abu background asset.
    crop: { sx: 54, sy: 144, sw: 573, sh: 885 },
    naturalW: 675, naturalH: 1200,
  },
  spawn: {
    initialRate: 1550,                // ms — early game longgar
    minRate: 650,                     // ms — late game rapat
    initialSpeed: 2.3,                // px/frame — early game lambat
    maxSpeed: 5.0,                    // px/frame — late game cepat
    speedJitter: 1.2,                 // variasi kecepatan antar item
    minSpawnGap: 100,                 // px — jarak horizontal minimum antar spawn berurutan
    marginX: 60,                      // px — margin spawn dari tepi kanvas
    validRatio: 0.65,
  },
  collision: { halfW: 34, halfH: 28 },// hitbox mendekati lebar visual banana (60px) → collision terasa fair
} as const;

const W = GAME_CONFIG.canvas.w, H = GAME_CONFIG.canvas.h;
const DURASI_GAME = GAME_CONFIG.durationSec;

/* ---------- Audio ---------- */
let audioCtx: AudioContext | null = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function playTone(muted: boolean, freq: number, type: OscillatorType, dur: number, gain: number, slideTo?: number) {
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
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

type Item = { id: number; x: number; y: number; word: string; valid: boolean; speed: number; age: number; caught: boolean; missed: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number };
type FloatText = { x: number; y: number; text: string; color: string; life: number };

export default function ZelbyDash() {
  const [screen, setScreen] = useState<"start" | "game" | "over">("start");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<{ score: number; lives: number; combo: number; waktu: number }>({ score: 0, lives: GAME_CONFIG.lives, combo: 0, waktu: DURASI_GAME });
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const mutedRef = useRef(false);
  const zelbyImgRef = useRef<HTMLImageElement | null>(null);
  const zelbyCelebrateImgRef = useRef<HTMLImageElement | null>(null);
  const bananaImgRef = useRef<HTMLImageElement | null>(null);
  const imagesLoaded = useRef(false);

  // NOTIFICATION 1.0 — game quiet mode: reward global tidak menutupi gameplay;
  // reset otomatis saat keluar game/unmount (tidak ada quiet tersisa).
  useEffect(() => {
    setQuiet(screen === "game")
    return () => setQuiet(false)
  }, [screen]);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zelby-highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    } catch { }
  }, []);

  useEffect(() => {
    if (screen !== "start") return;
    try { localStorage.setItem("zelby-highscore", String(highScore)); } catch { }
  }, [highScore, screen]);

  useEffect(() => {
    const idle = new Image();
    idle.src = "/junior/karakter/zelby_idle.webp";
    const cele = new Image();
    cele.src = "/junior/karakter/zelby_celebrate.webp";
    let loaded = 0;
    const onload = () => { loaded++; if (loaded >= 2) imagesLoaded.current = true; };
    idle.onload = onload;
    cele.onload = onload;
    zelbyImgRef.current = idle;
    zelbyCelebrateImgRef.current = cele;
  }, []);

  // Banana asset tunggal (bananagimBC.jpeg) — semua item jatuh memakai visual yang sama.
  useEffect(() => {
    const img = new Image();
    img.src = GAME_CONFIG.banana.src;
    img.onload = () => { bananaImgRef.current = img; };
    bananaImgRef.current = img;
  }, []);

  class Engine {
    rule: RuleKey;
    items: Item[] = [];
    particles: Particle[] = [];
    floatTexts: FloatText[] = [];
    zelbyX: number = W / 2;
    targetX: number = W / 2;
    score: number = 0;
    lives: number = GAME_CONFIG.lives;
    combo: number = 0;
    maxCombo: number = 0;
    spawnTimer: number = 0;
    spawnRate: number = GAME_CONFIG.spawn.initialRate;
    baseSpeed: number = GAME_CONFIG.spawn.initialSpeed;
    lastSpawnX: number | null = null;
    running: boolean = false;
    paused: boolean = false;
    lastFrame: number = 0;
    itemId: number = 0;
    shake: number = 0;
    frenzy: number = 0;
    bgHue: number = 140;
    waktuSisa: number = DURASI_GAME;
    lastTimerTick: number = 0;
    lastHud: { score: number; lives: number; combo: number; waktu: number } = { score: 0, lives: GAME_CONFIG.lives, combo: 0, waktu: DURASI_GAME };

    constructor(rule: RuleKey) {
      this.rule = rule;
    }

    start() {
      ensureAudio();
      this.running = true;
      this.lastFrame = performance.now();
      this.lastTimerTick = this.lastFrame;
      requestAnimationFrame((t) => this.loop(t));
    }

    stop() { this.running = false; }

    setPaused(p: boolean) {
      this.paused = p;
      if (!p) {
        this.lastFrame = performance.now();
        this.lastTimerTick = this.lastFrame;
      }
    }

    move(x: number) {
      this.targetX = Math.max(40, Math.min(W - 40, x));
    }

    /* Spawn yang fair: jarak horizontal minimum dari spawn sebelumnya,
       margin dari tepi — tidak ada posisi mustahil atau tembok kata. */
    spawn() {
      const { valid, invalid } = RULES[this.rule];
      const isValid = Math.random() < GAME_CONFIG.spawn.validRatio;
      const pool = isValid ? valid : invalid;
      const word = pool[Math.floor(Math.random() * pool.length)];
      const { marginX, minSpawnGap } = GAME_CONFIG.spawn;

      let x = marginX + Math.random() * (W - marginX * 2);
      if (this.lastSpawnX !== null && Math.abs(x - this.lastSpawnX) < minSpawnGap) {
        // dorong ke sisi yang jauh dari spawn sebelumnya; clamp agar tidak keluar kanvas
        x = x < this.lastSpawnX ? x - minSpawnGap : x + minSpawnGap;
        if (x < marginX) x = this.lastSpawnX + minSpawnGap;
        if (x > W - marginX) x = this.lastSpawnX - minSpawnGap;
        x = Math.max(marginX, Math.min(W - marginX, x));
      }
      this.lastSpawnX = x;

      this.items.push({
        id: this.itemId++,
        x,
        y: -60,
        word,
        valid: isValid,
        speed: this.baseSpeed + Math.random() * GAME_CONFIG.spawn.speedJitter,
        age: 0,
        caught: false,
        missed: false,
      });
    }

    burst(x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 5;
        this.particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, color, life: 30 + Math.random() * 20, size: 4 + Math.random() * 6 });
      }
    }

    float(x: number, y: number, text: string, color: string) {
      this.floatTexts.push({ x, y, text, color, life: 45 });
    }

    /* Difficulty bertahap berbasis waktu (bukan lompatan):
       early longgar → mid menantang → late cepat, dengan kurva ease-in. */
    applyDifficulty() {
      const elapsed = DURASI_GAME - this.waktuSisa;
      const p = Math.min(1, elapsed / DURASI_GAME);
      const { spawn } = GAME_CONFIG;
      this.spawnRate = spawn.initialRate + (spawn.minRate - spawn.initialRate) * Math.pow(p, 1.5);
      this.baseSpeed = spawn.initialSpeed + (spawn.maxSpeed - spawn.initialSpeed) * Math.pow(p, 1.4);
    }

    loop(now: number) {
      if (!this.running) return;
      const dt = now - this.lastFrame;
      this.lastFrame = now;

      if (!this.paused) {
        if (now - this.lastTimerTick >= 1000) {
          this.waktuSisa--;
          this.lastTimerTick = now;
          if (this.waktuSisa <= 0) { this.gameOver(); return; }
        }

        this.applyDifficulty();
        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnRate) {
          this.spawn();
          this.spawnTimer = 0;
        }

        this.zelbyX += (this.targetX - this.zelbyX) * 0.2;

        if (this.frenzy > 0) {
          this.frenzy -= dt;
          this.bgHue = (this.bgHue + 2) % 360;
        } else {
          this.bgHue = 140;
        }

        const { collision } = GAME_CONFIG;
        const zelbyY = H - GAME_CONFIG.zelby.yCatch;

        for (let i = this.items.length - 1; i >= 0; i--) {
          const it = this.items[i];
          if (it.caught || it.missed) continue;
          it.y += it.speed * (dt / 16);
          it.age += dt;

          if (it.y > zelbyY - collision.halfH && it.y < zelbyY + collision.halfH && Math.abs(it.x - this.zelbyX) < collision.halfW) {
            it.caught = true;
            this.items.splice(i, 1);
            if (it.valid) {
              this.combo++;
              this.maxCombo = Math.max(this.maxCombo, this.combo);
              const points = (this.frenzy > 0 ? 20 : 10) + Math.floor(this.combo / 5) * 5;
              this.score += points;
              if (this.combo === 10 && this.frenzy <= 0) {
                this.frenzy = 5000;
                playTone(mutedRef.current, 800, "square", 0.5, 0.2, 1600);
              } else {
                playTone(mutedRef.current, 600 + this.combo * 20, "sine", 0.1, 0.15, 900);
              }
              this.burst(it.x, it.y, "#FBBF24", 10);
              this.float(it.x, it.y - 26, `+${points}`, "#FBBF24");
            } else {
              this.combo = 0;
              this.lives--;
              this.shake = 15;
              playTone(mutedRef.current, 150, "sawtooth", 0.3, 0.2, 80);
              this.burst(it.x, it.y, "#EF4444", 15);
              if (this.lives <= 0) { this.gameOver(); return; }
            }
          } else if (it.y > H + 50) {
            it.missed = true;
            this.items.splice(i, 1);
            if (it.valid) {
              this.combo = 0;
              this.lives--;
              this.shake = 10;
              playTone(mutedRef.current, 200, "triangle", 0.2, 0.15, 100);
              if (this.lives <= 0) { this.gameOver(); return; }
            } else {
              this.score += 5;
              playTone(mutedRef.current, 400, "sine", 0.05, 0.1);
              this.float(it.x, H - 60, "+5", "#4ADE80");
            }
          }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--;
          if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
          const f = this.floatTexts[i];
          f.y -= 0.7; f.life--;
          if (f.life <= 0) this.floatTexts.splice(i, 1);
        }

        this.shake *= 0.8;
      }

      this.render();
      this.updateHud();
      requestAnimationFrame((t) => this.loop(t));
    }

    gameOver() {
      this.running = false;
      setFinalScore(this.score);
      setHighScore((prev) => Math.max(prev, this.score));
      setTimeout(() => setScreen("over"), 400);
    }

    /* HUD hanya di-update saat nilai berubah — hindari re-render React 60fps. */
    updateHud() {
      const h = { score: this.score, lives: this.lives, combo: this.combo, waktu: this.waktuSisa };
      if (h.score === this.lastHud.score && h.lives === this.lastHud.lives && h.combo === this.lastHud.combo && h.waktu === this.lastHud.waktu) return;
      this.lastHud = h;
      setHud(h);
    }

    render() {
      const c = canvasRef.current?.getContext("2d");
      if (!c) return;

      c.save();
      if (this.shake > 0.5) {
        c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      }

      /* Background */
      const grad = c.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#1E1840");
      grad.addColorStop(0.5, "#1A2A3E");
      grad.addColorStop(1, "#162318");
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);

      /* Hutan dekorasi — pepohonan di kiri & kanan */
      c.save();
      // Pohon kiri
      c.fillStyle = "#0D1F12";
      const treeW = 50;
      for (let ty = 0; ty < H; ty += 90) {
        const sway = Math.sin(ty * 0.003 + performance.now() * 0.0005) * 4;
        c.fillRect(sway, ty, treeW + sway * 0.3, 90);
      }
      // Pohon kanan
      for (let ty = 0; ty < H; ty += 90) {
        const sway = Math.sin(ty * 0.003 + performance.now() * 0.0005 + 1) * 4;
        c.fillRect(W - treeW + sway, ty, treeW - sway * 0.3, 90);
      }
      // Daun-daun di batang
      c.fillStyle = "#1A3A22";
      for (let ty = 20; ty < H; ty += 90) {
        for (let side = 0; side < 2; side++) {
          const bx = side === 0 ? 30 : W - 30;
          const offset = Math.sin(ty * 0.05 + performance.now() * 0.002) * 8;
          c.beginPath();
          c.ellipse(bx + (side === 0 ? -1 : 1) * (16 + offset), ty + offset * 0.5, 18, 12, side === 0 ? -0.3 : 0.3, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();

      /* Lebat/ranting di bawah — semak */
      c.save();
      const groundY = H - 40;
      const leafColors = ["#0D2818", "#1A3A2A", "#2D5A3E", "#1F4D2E"];
      for (let gx = 0; gx <= W; gx += 24) {
        const h = 30 + Math.sin(gx * 0.15) * 18 + Math.sin(gx * 0.07) * 10;
        c.fillStyle = leafColors[Math.floor(gx / 48) % leafColors.length];
        c.beginPath();
        c.ellipse(gx, groundY + 10 - h * 0.5, 22, h * 0.6, 0, 0, Math.PI * 2);
        c.fill();
      }
      // Lapisan semak depan
      c.fillStyle = "#0A1F10";
      c.beginPath();
      c.moveTo(0, H);
      for (let gx = 0; gx <= W; gx += 10) {
        c.lineTo(gx, H - 20 - Math.sin(gx * 0.12) * 14 - Math.sin(gx * 0.04) * 8);
      }
      c.lineTo(W, H);
      c.closePath();
      c.fill();
      c.restore();

      /* Sulur gantung dari atas */
      c.save();
      c.strokeStyle = "#1A3A22";
      c.lineWidth = 2;
      for (let vx = 40; vx < W - 40; vx += 80) {
        c.beginPath();
        c.moveTo(vx, 0);
        const len = 40 + Math.sin(vx * 0.1) * 25;
        c.quadraticCurveTo(vx + 20 * Math.sin(vx * 0.05), len * 0.5, vx + 4 * Math.sin(vx * 0.08), len);
        c.stroke();
        // Daun kecil di ujung sulur
        c.fillStyle = "#2D5A3E";
        c.beginPath();
        c.ellipse(vx + 4 * Math.sin(vx * 0.08), len, 6, 4, 0.5, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();

      /* Rule banner */
      c.fillStyle = "rgba(22, 27, 58, 0.9)";
      c.beginPath();
      if (c.roundRect) c.roundRect(40, 20, W - 80, 50, 15);
      else c.rect(40, 20, W - 80, 50);
      c.fill();
      c.font = "800 18px system-ui, sans-serif";
      c.fillStyle = "#FBBF24";
      c.textAlign = "center";
      c.fillText(`TANGKAP: ${RULES[this.rule].label}`, W / 2, 52);

      /* Items — SEMUA item memakai banana yang sama (satu warna, satu asset).
         Pemain membaca kata, bukan warna, untuk memutuskan menangkap atau menghindar. */
      const bananaImg = bananaImgRef.current;
      const bananaReady = !!bananaImg && bananaImg.complete && bananaImg.naturalWidth > 0;
      const { w: bw, h: bh } = GAME_CONFIG.banana;

      for (const it of this.items) {
        if (it.caught || it.missed) continue;
        c.save();
        c.translate(it.x, it.y);
        // Spawn pop-in halus + goyangan ringan (bukan spin penuh) agar teks tetap terbaca
        const pop = Math.min(1, 0.35 + it.age / 130);
        c.scale(pop, pop);
        c.rotate(Math.sin(it.y * 0.03 + it.id) * 0.18);

        if (bananaReady) {
          /* Banana asset asli — identik untuk kata benar & salah.
             Crop konten banana dari berkas (guard: jika asset diganti,
             gambar utuh supaya tidak pernah tampak kosong). */
          const { crop, naturalW, naturalH } = GAME_CONFIG.banana;
          const useCrop = bananaImg.naturalWidth === naturalW && bananaImg.naturalHeight === naturalH;
          if (useCrop) c.drawImage(bananaImg, crop.sx, crop.sy, crop.sw, crop.sh, -bw / 2, -bh / 2, bw, bh);
          else c.drawImage(bananaImg, -bw / 2, -bh / 2, bw, bh);
        } else {
          /* Fallback saat asset belum termuat: bentuk banana sama untuk semua item */
          c.fillStyle = "#FBBF24";
          c.beginPath();
          c.moveTo(-bw / 2 + 8, -bh / 2);
          c.quadraticCurveTo(0, -bh / 2 - 10, bw / 2 - 8, -bh / 2);
          c.quadraticCurveTo(bw / 2 + 4, -bh / 2 + 8, bw / 2 - 4, bh / 2);
          c.quadraticCurveTo(0, bh / 2 + 6, -bw / 2 + 4, bh / 2);
          c.quadraticCurveTo(-bw / 2 - 4, -bh / 2 + 8, -bw / 2 + 8, -bh / 2);
          c.fill();
          c.strokeStyle = "#161B3A";
          c.lineWidth = 3;
          c.stroke();
          c.fillStyle = "rgba(255,255,255,0.25)";
          c.beginPath();
          c.ellipse(-8, -bh / 2 + 10, 14, 6, -0.3, 0, Math.PI * 2);
          c.fill();
        }

        /* Pill putih untuk teks kata — kontras tinggi di atas banana */
        c.fillStyle = "rgba(255,255,255,0.9)";
        c.beginPath();
        if (c.roundRect) c.roundRect(-37, -14, 74, 28, 14);
        else c.rect(-37, -14, 74, 28);
        c.fill();
        c.strokeStyle = "rgba(22,27,58,0.35)";
        c.lineWidth = 2;
        c.stroke();

        c.fillStyle = "#161B3A";
        c.font = "800 17px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(it.word, 0, 1);
        c.restore();
      }

      /* Zelby (Tarsius) dari gambar */
      const zX = this.zelbyX, zY = H - GAME_CONFIG.zelby.yOffset;
      const zScale = this.frenzy > 0 ? 1.3 : 1;
      const img = this.frenzy > 0 ? zelbyCelebrateImgRef.current : zelbyImgRef.current;

      if (img && imagesLoaded.current) {
        c.save();
        c.translate(zX, zY);
        c.scale(zScale, zScale);
        const iw = GAME_CONFIG.zelby.w, ih = GAME_CONFIG.zelby.h;
        c.drawImage(img, -iw / 2, -ih / 2, iw, ih);

        /* Cahaya saat frenzy */
        if (this.frenzy > 0) {
          c.shadowColor = "#FF6B6B";
          c.shadowBlur = 20;
          c.strokeStyle = "rgba(255,107,107,0.5)";
          c.lineWidth = 3;
          c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.stroke();
          c.shadowBlur = 0;
        }
        c.restore();
      } else {
        /* Fallback: lingkaran */
        c.save();
        c.translate(zX, zY);
        c.scale(zScale, zScale);
        c.fillStyle = "#8B5CF6";
        c.beginPath(); c.arc(0, 0, 28, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#E9C46A";
        c.beginPath(); c.arc(0, -2, 18, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#161B3A";
        c.beginPath(); c.arc(-6, -6, 4, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(6, -6, 4, 0, Math.PI * 2); c.fill();
        c.strokeStyle = "#161B3A"; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 4, 5, 0, Math.PI); c.stroke();
        c.restore();
      }

      /* Particles */
      for (const p of this.particles) {
        c.globalAlpha = Math.min(1, p.life / 30);
        c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;

      /* Floating score — feedback singkat saat skor bertambah */
      for (const f of this.floatTexts) {
        c.globalAlpha = Math.min(1, f.life / 20);
        c.font = "900 20px system-ui, sans-serif";
        c.fillStyle = f.color;
        c.textAlign = "center";
        c.fillText(f.text, f.x, f.y);
      }
      c.globalAlpha = 1;

      if (this.frenzy > 0) {
        c.font = "900 32px system-ui, sans-serif";
        c.fillStyle = "#FF6B6B";
        c.textAlign = "center";
        c.fillText("FRENZY MODE! 2X SKOR!", W / 2, H - 150);
      }

      if (this.combo >= 3) {
        c.font = "900 24px system-ui, sans-serif";
        c.fillStyle = "#4ADE80";
        c.textAlign = "center";
        c.fillText(`${this.combo} RENTETAN!`, W / 2, 100);
      }

      c.restore();
    }
  }

  const startGame = (rule: RuleKey) => {
    ensureAudio();
    setScreen("game");
    setPaused(false);
    setHud({ score: 0, lives: GAME_CONFIG.lives, combo: 0, waktu: DURASI_GAME });
    engineRef.current?.stop();
    const eng = new Engine(rule);
    engineRef.current = eng;
    requestAnimationFrame(() => eng.start());
  };

  const togglePause = () => {
    const g = engineRef.current;
    if (!g || !g.running) return;
    const next = !g.paused;
    g.setPaused(next);
    setPaused(next);
  };

  const quit = () => {
    engineRef.current?.stop();
    setPaused(false);
    setScreen("start");
  };

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || engineRef.current.paused) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    engineRef.current.move(x);
  };

  const chunky = "border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A]";
  const btn = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] text-[#161B3A]">
      <style>{`
        @keyframes ik-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ik-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
        .ik-screen{animation:ik-fade .35s ease}
        .ik-pop{animation:ik-pop .5s ease}
      `}</style>

      <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col items-center">
        {/* Header dengan Zelby asli */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border-4 border-[#161B3A] shadow-[4px_4px_0_#161B3A] shrink-0 bg-white ik-pop">
              <img
                src="/junior/karakter/zelby_happy.webp"
                alt="Zelby"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-extrabold text-xl leading-none">Petualangan Kata</div>
              <div className="text-[11px] font-semibold opacity-60 mt-0.5">Tangkap kata yang benar!</div>
            </div>
          </div>
          <button onClick={() => setMuted(m => !m)} className={`${btn} w-11 h-11 bg-white`} aria-label={muted ? "Nyalakan suara" : "Matikan suara"}>
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* START — tanpa emoji */}
        {screen === "start" && (
          <div className={`ik-screen bg-white rounded-3xl ${chunky} p-6 text-center w-full max-w-md`}>
            <div className="w-24 h-24 mx-auto mb-3 rounded-3xl overflow-hidden border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A]">
              <img
                src="/junior/karakter/zelby_wave.webp"
                alt="Zelby si Tarsius"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-extrabold text-3xl mb-2 font-game-display">Petualangan Hutan Kata</h1>
            <p className="opacity-70 text-sm mb-1">
              Bantu si cerdik Zelby menangkap <strong>kata yang benar</strong> dan hindari yang salah!
            </p>
            <p className="opacity-60 text-xs mb-6">
              <Clock className="w-3 h-3 inline mr-1" />90 detik &middot; <Heart className="w-3 h-3 inline mx-1" />3 nyawa &middot; <Zap className="w-3 h-3 inline mx-1" />rentetan untuk skor tinggi
            </p>

            {highScore > 0 && (
              <div className="mb-4 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl text-sm font-bold text-amber-700 flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" /> Skor Tertinggi: {highScore}
              </div>
            )}

            <div className="space-y-3">
              <button onClick={() => startGame("BENDA")} className={`${btn} w-full px-5 py-4 bg-sky-400 text-white text-lg`}>
                <Zap className="w-5 h-5" /> Kata Benda
              </button>
              <button onClick={() => startGame("KERJA")} className={`${btn} w-full px-5 py-4 bg-emerald-400 text-lg`}>
                <Zap className="w-5 h-5" /> Kata Kerja
              </button>
              <button onClick={() => startGame("SIFAT")} className={`${btn} w-full px-5 py-4 bg-red-400 text-white text-lg`}>
                <Star className="w-5 h-5" /> Kata Sifat
              </button>
            </div>
          </div>
        )}

        {/* GAME */}
        {screen === "game" && (
          <div className="ik-screen w-full flex flex-col items-center">
            <div className="w-full max-w-[480px] grid grid-cols-4 gap-2 mb-3">
              <div className="rounded-xl bg-[#161B3A] text-white px-2 py-2 shadow-[3px_3px_0_#161B3A] border-[3px] border-[#161B3A]">
                <div className="text-[8px] font-extrabold uppercase opacity-70">Skor</div>
                <div className="font-extrabold text-lg leading-none">{hud.score}</div>
              </div>
              <div className="rounded-xl bg-[#FBBF24] px-2 py-2 shadow-[3px_3px_0_#161B3A] border-[3px] border-[#161B3A]">
                <div className="text-[8px] font-extrabold uppercase opacity-70">Rentetan</div>
                <div className="font-extrabold text-lg leading-none">{hud.combo}x</div>
              </div>
              <div className="rounded-xl bg-[#FF6B6B] text-white px-2 py-2 shadow-[3px_3px_0_#161B3A] border-[3px] border-[#161B3A]">
                <div className="text-[8px] font-extrabold uppercase opacity-70">Nyawa</div>
                <div className="flex gap-0.5 mt-0.5">
                  {[0, 1, 2].map(i => <Heart key={i} size={14} fill={i < hud.lives ? "currentColor" : "none"} />)}
                </div>
              </div>
              <div className={`rounded-xl px-2 py-2 shadow-[3px_3px_0_#161B3A] border-[3px] border-[#161B3A] ${hud.waktu <= 10 ? "bg-red-500 text-white" : "bg-white"}`}>
                <div className="text-[8px] font-extrabold uppercase opacity-70">Waktu</div>
                <div className="font-extrabold text-lg leading-none">{hud.waktu}s</div>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full max-w-[480px] rounded-2xl border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A] touch-none"
              onPointerDown={handlePointer}
              onPointerMove={handlePointer}
            />

            <div className="w-full max-w-[480px] flex justify-between mt-4">
              <button onClick={quit} className={`${btn} w-12 h-12 bg-white`} aria-label="Keluar">
                <X className="w-5 h-5" />
              </button>
              <p className="text-xs font-bold opacity-60 self-center flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
                Gerakkan jari untuk mengendalikan Zelby
              </p>
              <button onClick={togglePause} className={`${btn} w-12 h-12 bg-white`} aria-label={paused ? "Lanjutkan" : "Jeda"}>
                {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER — tanpa emoji */}
        {screen === "over" && (
          <div className={`ik-screen bg-white rounded-3xl ${chunky} p-6 text-center w-full max-w-md`}>
            <div className="w-24 h-24 mx-auto mb-3 rounded-3xl overflow-hidden border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A]">
              <img
                src="/junior/karakter/zelby_celebrate.webp"
                alt="Zelby"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="font-extrabold text-3xl mb-1 font-game-display">Permainan Selesai!</h2>
            <p className="opacity-70 text-sm mb-6">Zelby sangat senang belajar bareng kamu hari ini!</p>

            <div className="bg-[#161B3A] text-white rounded-2xl px-6 py-4 mb-4 shadow-[5px_5px_0_#FBBF24]">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Total Skor</div>
              <div className="font-extrabold text-5xl leading-none">{finalScore}</div>
            </div>

            {finalScore > 0 && finalScore >= highScore && (
              <div className="mb-4 text-sm font-extrabold text-amber-600 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-2 ik-pop flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" /> Skor Tertinggi Baru!
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => startGame("BENDA")} className={`${btn} px-5 py-3 bg-white`}>
                <RotateCcw className="w-4 h-4" /> Main Lagi
              </button>
              <button onClick={() => setScreen("start")} className={`${btn} px-5 py-3 bg-[#FBBF24]`}>
                Pilih Pelajaran
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
