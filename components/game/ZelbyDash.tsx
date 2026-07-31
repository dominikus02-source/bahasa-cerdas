"use client";

import { useState, useEffect, useRef } from "react";
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

const W = 480, H = 720;
const DURASI_GAME = 90;

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

type Item = { id: number; x: number; y: number; word: string; valid: boolean; speed: number; caught: boolean; missed: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number };

export default function ZelbyDash() {
  const [screen, setScreen] = useState<"start" | "game" | "over">("start");
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ score: 0, lives: 3, combo: 0, waktu: DURASI_GAME });
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const mutedRef = useRef(false);
  const zelbyImgRef = useRef<HTMLImageElement | null>(null);
  const zelbyCelebrateImgRef = useRef<HTMLImageElement | null>(null);
  const imagesLoaded = useRef(false);

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
    idle.src = "/arena-junior/karakter/zelby_idle.webp";
    const cele = new Image();
    cele.src = "/arena-junior/karakter/zelby_celebrate.webp";
    let loaded = 0;
    const onload = () => { loaded++; if (loaded >= 2) imagesLoaded.current = true; };
    idle.onload = onload;
    cele.onload = onload;
    zelbyImgRef.current = idle;
    zelbyCelebrateImgRef.current = cele;
  }, []);

  class Engine {
    rule: RuleKey;
    items: Item[] = [];
    particles: Particle[] = [];
    zelbyX: number = W / 2;
    targetX: number = W / 2;
    score: number = 0;
    lives: number = 3;
    combo: number = 0;
    maxCombo: number = 0;
    spawnTimer: number = 0;
    spawnRate: number = 1500;
    baseSpeed: number = 2.5;
    running: boolean = false;
    paused: boolean = false;
    lastFrame: number = 0;
    itemId: number = 0;
    shake: number = 0;
    frenzy: number = 0;
    bgHue: number = 140;
    waktuSisa: number = DURASI_GAME;
    lastTimerTick: number = 0;

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

    spawn() {
      const { valid, invalid } = RULES[this.rule];
      const isValid = Math.random() < 0.65;
      const pool = isValid ? valid : invalid;
      const word = pool[Math.floor(Math.random() * pool.length)];

      this.items.push({
        id: this.itemId++,
        x: 60 + Math.random() * (W - 120),
        y: -50,
        word,
        valid: isValid,
        speed: this.baseSpeed + Math.random() * 1.5,
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

        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnRate) {
          this.spawn();
          this.spawnTimer = 0;
          if (this.spawnRate > 700) this.spawnRate -= 4;
          this.baseSpeed += 0.002;
        }

        this.zelbyX += (this.targetX - this.zelbyX) * 0.2;

        if (this.frenzy > 0) {
          this.frenzy -= dt;
          this.bgHue = (this.bgHue + 2) % 360;
        } else {
          this.bgHue = 140;
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
          const it = this.items[i];
          if (it.caught || it.missed) continue;
          it.y += it.speed * (dt / 16);
          const zelbyY = H - 100;

          if (it.y > zelbyY - 30 && it.y < zelbyY + 30 && Math.abs(it.x - this.zelbyX) < 45) {
            it.caught = true;
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
            if (it.valid) {
              this.combo = 0;
              this.lives--;
              this.shake = 10;
              playTone(mutedRef.current, 200, "triangle", 0.2, 0.15, 100);
              if (this.lives <= 0) { this.gameOver(); return; }
            } else {
              this.score += 5;
              playTone(mutedRef.current, 400, "sine", 0.05, 0.1);
            }
          }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--;
          if (p.life <= 0) this.particles.splice(i, 1);
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

    updateHud() {
      setHud({ score: this.score, lives: this.lives, combo: this.combo, waktu: this.waktuSisa });
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

      /* Items — kartu lebih besar dengan teks terbaca */
      for (const it of this.items) {
        if (it.caught || it.missed) continue;
        c.save();
        c.translate(it.x, it.y);
        c.rotate(it.y * 0.02);

        const bw = 90, bh = 50;
        const hw = bw / 2, hh = bh / 2;

        if (it.valid) {
          /* Pisang emas dengan efek glossy */
          c.fillStyle = "#FBBF24";
          c.beginPath();
          c.moveTo(-hw + 8, -hh);
          c.quadraticCurveTo(0, -hh - 14, hw - 8, -hh);
          c.quadraticCurveTo(hw + 4, -hh + 10, hw - 4, hh);
          c.quadraticCurveTo(0, hh + 6, -hw + 4, hh);
          c.quadraticCurveTo(-hw - 4, -hh + 10, -hw + 8, -hh);
          c.fill();
          c.strokeStyle = "#161B3A";
          c.lineWidth = 3;
          c.stroke();

          /* Gloss */
          c.fillStyle = "rgba(255,255,255,0.25)";
          c.beginPath();
          c.ellipse(-8, -hh + 10, 14, 6, -0.3, 0, Math.PI * 2);
          c.fill();
        } else {
          /* Kartu gelap untuk kata salah */
          c.fillStyle = "#3a3f5c";
          c.beginPath();
          if (c.roundRect) c.roundRect(-hw, -hh, bw, bh, 12);
          else c.rect(-hw, -hh, bw, bh);
          c.fill();
          c.strokeStyle = "#2A2350";
          c.lineWidth = 3;
          c.stroke();
        }

        /* White pill background untuk teks */
        c.fillStyle = it.valid ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.15)";
        c.beginPath();
        if (c.roundRect) c.roundRect(-30, -10, 60, 22, 11);
        else c.rect(-30, -10, 60, 22);
        c.fill();

        c.rotate(-it.y * 0.02);
        c.fillStyle = it.valid ? "#161B3A" : "#FFF";
        c.font = "800 16px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(it.word, 0, 1);
        c.restore();
      }

      /* Zelby (Tarsius) dari gambar */
      const zX = this.zelbyX, zY = H - 85;
      const zScale = this.frenzy > 0 ? 1.3 : 1;
      const img = this.frenzy > 0 ? zelbyCelebrateImgRef.current : zelbyImgRef.current;

      if (img && imagesLoaded.current) {
        c.save();
        c.translate(zX, zY);
        c.scale(zScale, zScale);
        const iw = 80, ih = 80;
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
        c.fillText(`${this.combo} COMBO!`, W / 2, 100);
      }

      c.restore();
    }
  }

  const startGame = (rule: RuleKey) => {
    ensureAudio();
    setScreen("game");
    setHud({ score: 0, lives: 3, combo: 0, waktu: DURASI_GAME });
    engineRef.current?.stop();
    const eng = new Engine(rule);
    engineRef.current = eng;
    requestAnimationFrame(() => eng.start());
  };

  const togglePause = () => {
    const g = engineRef.current;
    if (!g || !g.running) return;
    g.setPaused(!g.paused);
  };

  const quit = () => {
    engineRef.current?.stop();
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
                src="/arena-junior/karakter/zelby_happy.webp"
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
                src="/arena-junior/karakter/zelby_wave.webp"
                alt="Zelby si Tarsius"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-extrabold text-3xl mb-2 font-game-display">Petualangan Hutan Kata</h1>
            <p className="opacity-70 text-sm mb-1">
              Bantu si cerdik Zelby menangkap <strong>kata yang benar</strong> dan hindari yang salah!
            </p>
            <p className="opacity-60 text-xs mb-6">
              <Clock className="w-3 h-3 inline mr-1" />90 detik &middot; <Heart className="w-3 h-3 inline mx-1" />3 nyawa &middot; <Zap className="w-3 h-3 inline mx-1" />combo untuk skor tinggi
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
                <div className="text-[8px] font-extrabold uppercase opacity-70">Combo</div>
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
              <button onClick={togglePause} className={`${btn} w-12 h-12 bg-white`} aria-label={engineRef.current?.paused ? "Lanjutkan" : "Jeda"}>
                {engineRef.current?.paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER — tanpa emoji */}
        {screen === "over" && (
          <div className={`ik-screen bg-white rounded-3xl ${chunky} p-6 text-center w-full max-w-md`}>
            <div className="w-24 h-24 mx-auto mb-3 rounded-3xl overflow-hidden border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A]">
              <img
                src="/arena-junior/karakter/zelby_celebrate.webp"
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
