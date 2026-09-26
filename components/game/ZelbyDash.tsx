"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { setQuiet } from "@/lib/notif-quiet";
import GameBackButton from "@/components/game/GameBackButton";
import {
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  Heart,
  Trophy,
  Zap,
  RotateCcw,
  Clock,
  Star,
  ChevronRight,
} from "lucide-react";

/* ---------- Bank Kata ---------- */
const KATA_BENDA = [
  "meja","buku","kursi","sepeda","pensil","pohon","burung","rumah",
  "topi","roti","sepatu","jemari","kunci","lampu","piring","gelas","pintu",
];
const KATA_KERJA = [
  "makan","minum","lari","tidur","tulis","baca","lompat","duduk",
  "masak","cuci","main","tanam","gambar","nyanyi","renang","lukis",
];
const KATA_SIFAT = [
  "besar","kecil","tinggi","rendah","cantik","rajin","cepat","panas",
  "dingin","manis","bersih","kuat","cerah","lembut","ringan","berani",
];

type RuleKey = "BENDA" | "KERJA" | "SIFAT";
const RULES: Record<
  RuleKey,
  { label: string; color: string; valid: string[]; invalid: string[] }
> = {
  BENDA: {
    label: "KATA BENDA",
    color: "#38BDF8",
    valid: KATA_BENDA,
    invalid: [...KATA_KERJA, ...KATA_SIFAT],
  },
  KERJA: {
    label: "KATA KERJA",
    color: "#34D399",
    valid: KATA_KERJA,
    invalid: [...KATA_BENDA, ...KATA_SIFAT],
  },
  SIFAT: {
    label: "KATA SIFAT",
    color: "#F87171",
    valid: KATA_SIFAT,
    invalid: [...KATA_BENDA, ...KATA_KERJA],
  },
};

/* ---------- Game Config ---------- */
const GAME_CONFIG = {
  canvas: { w: 480, h: 720 },
  durationSec: 90,
  lives: 3,
  zelby: { w: 80, h: 80, yOffset: 85, yCatch: 100 },
  banana: {
    src: "/pisangzelby2.png",
    /* pisangzelby2.png is 960x540 landscape. We draw a cropped region
       centered on the banana body. Adjust crop to fit the actual banana sprite. */
    crop: { sx: 0, sy: 0, sw: 960, sh: 540 },
    naturalW: 960,
    naturalH: 540,
    /* Display size on canvas — landscape ratio preserved */
    drawW: 90,
    drawH: 50,
  },
  spawn: {
    initialRate: 1550,
    minRate: 650,
    initialSpeed: 2.3,
    maxSpeed: 5.0,
    speedJitter: 1.2,
    minSpawnGap: 110,
    marginX: 60,
    validRatio: 0.65,
  },
  collision: { halfW: 38, halfH: 22 },
  /* Star thresholds */
  stars: { two: 200, three: 400 },
  /* Streak system */
  streak: {
    threshold: 5, // streak N activates level up
    maxLevel: 5,
    speedBonus: 0.15, // per level
  },
} as const;

const W = GAME_CONFIG.canvas.w;
const H = GAME_CONFIG.canvas.h;
const DURASI_GAME = GAME_CONFIG.durationSec;

/* ---------- Audio ---------- */
let audioCtx: AudioContext | null = null;
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    } catch {
      /* noop */
    }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function playTone(
  muted: boolean,
  freq: number,
  type: OscillatorType,
  dur: number,
  gain: number,
  slideTo?: number
) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo)
    osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/* ---------- Types ---------- */
type Item = {
  id: number;
  x: number;
  y: number;
  word: string;
  valid: boolean;
  speed: number;
  age: number;
  caught: boolean;
  missed: boolean;
  wobblePhase: number;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  shape: "circle" | "star" | "leaf";
};
type FloatText = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  size: number;
};
/* ---------- Helpers ---------- */

/* ---------- Component ---------- */
export default function ZelbyDash() {
  const [screen, setScreen] = useState<"start" | "game" | "over">("start");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<{
    score: number;
    lives: number;
    combo: number;
    waktu: number;
    level: number;
  }>({ score: 0, lives: GAME_CONFIG.lives, combo: 0, waktu: DURASI_GAME, level: 1 });
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [finalStars, setFinalStars] = useState(0);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const mutedRef = useRef(false);
  const zelbyImgRef = useRef<HTMLImageElement | null>(null);
  const zelbyCelebrateImgRef = useRef<HTMLImageElement | null>(null);
  const bananaImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const imagesLoaded = useRef(false);

  useEffect(() => {
    setQuiet(screen === "game");
    return () => setQuiet(false);
  }, [screen]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zelby-highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (screen !== "start") return;
    try {
      localStorage.setItem("zelby-highscore", String(highScore));
    } catch {
      /* noop */
    }
  }, [highScore, screen]);

  /* Load Zelby idle + celebrate */
  useEffect(() => {
    const idle = new Image();
    idle.src = "/junior/karakter/zelby_idle.webp";
    const cele = new Image();
    cele.src = "/junior/karakter/zelby_celebrate.webp";
    let loaded = 0;
    const onload = () => {
      loaded++;
      if (loaded >= 2) imagesLoaded.current = true;
    };
    idle.onload = onload;
    cele.onload = onload;
    zelbyImgRef.current = idle;
    zelbyCelebrateImgRef.current = cele;
  }, []);

  /* Load pisangzelby2.png */
  useEffect(() => {
    const img = new Image();
    img.src = GAME_CONFIG.banana.src;
    img.onload = () => {
      bananaImgRef.current = img;
    };
    bananaImgRef.current = img;
  }, []);

  /* Load Hutan Kata scene background (gameplay canvas only) */
  useEffect(() => {
    const img = new Image();
    img.src = "/images/bg_petualangankata.png";
    bgImgRef.current = img;
  }, []);

  /* Screen flash effect */
  const flash = useCallback(
    (color: string) => {
      setScreenFlash(color);
      setTimeout(() => setScreenFlash(null), 200);
    },
    []
  );

  /* ============= ENGINE ============= */
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
    streak: number = 0;
    level: number = 1;
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
    lastHud: {
      score: number;
      lives: number;
      combo: number;
      waktu: number;
      level: number;
    } = {
      score: 0,
      lives: GAME_CONFIG.lives,
      combo: 0,
      waktu: DURASI_GAME,
      level: 1,
    };

    /* Parallax offset (kept for future scene motion; no visual output) */
    parallaxOffset: number = 0;

    /* Mist particles */
    mistParticles: {
      x: number;
      y: number;
      w: number;
      alpha: number;
      speed: number;
    }[] = [];
    mistTimer: number = 0;

    /* Light rays */
    lightRays: {
      x: number;
      w: number;
      alpha: number;
      angle: number;
    }[] = [];

    constructor(rule: RuleKey) {
      this.rule = rule;
      // init light rays
      for (let i = 0; i < 5; i++) {
        this.lightRays.push({
          x: 60 + Math.random() * (W - 120),
          w: 20 + Math.random() * 30,
          alpha: 0.03 + Math.random() * 0.04,
          angle: -0.15 + Math.random() * 0.3,
        });
      }
    }

    start() {
      ensureAudio();
      this.running = true;
      this.lastFrame = performance.now();
      this.lastTimerTick = this.lastFrame;
      requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
      this.running = false;
    }

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
      const isValid = Math.random() < GAME_CONFIG.spawn.validRatio;
      const pool = isValid ? valid : invalid;
      const word = pool[Math.floor(Math.random() * pool.length)];
      const { marginX, minSpawnGap } = GAME_CONFIG.spawn;

      let x = marginX + Math.random() * (W - marginX * 2);
      if (this.lastSpawnX !== null && Math.abs(x - this.lastSpawnX) < minSpawnGap) {
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
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }

    burst(
      x: number,
      y: number,
      color: string,
      count: number,
      shape: Particle["shape"] = "circle"
    ) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 5;
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 2,
          color,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          size: 3 + Math.random() * 5,
          shape,
        });
      }
    }

    float(x: number, y: number, text: string, color: string, size: number = 20) {
      this.floatTexts.push({ x, y, text, color, life: 50, size });
    }

    applyDifficulty() {
      const elapsed = DURASI_GAME - this.waktuSisa;
      const p = Math.min(1, elapsed / DURASI_GAME);
      const { spawn } = GAME_CONFIG;
      this.spawnRate =
        spawn.initialRate + (spawn.minRate - spawn.initialRate) * Math.pow(p, 1.5);
      this.baseSpeed =
        spawn.initialSpeed + (spawn.maxSpeed - spawn.initialSpeed) * Math.pow(p, 1.4);
    }

    loop(now: number) {
      if (!this.running) return;
      const dt = now - this.lastFrame;
      this.lastFrame = now;

      if (!this.paused) {
        // Timer
        if (now - this.lastTimerTick >= 1000) {
          this.waktuSisa--;
          this.lastTimerTick = now;
          if (this.waktuSisa <= 0) {
            this.gameOver();
            return;
          }
        }

        this.applyDifficulty();

        // Spawn
        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnRate) {
          this.spawn();
          this.spawnTimer = 0;
        }

        // Zelby movement with lerp
        this.zelbyX += (this.targetX - this.zelbyX) * 0.22;

        // Frenzy
        if (this.frenzy > 0) {
          this.frenzy -= dt;
          this.bgHue = (this.bgHue + 2) % 360;
        } else {
          this.bgHue = 140;
        }

        // Parallax scroll
        this.parallaxOffset += 0.3 * (1 + this.level * 0.1);

        // Mist spawn
        this.mistTimer += dt;
        if (this.mistTimer > 3000) {
          this.mistTimer = 0;
          this.mistParticles.push({
            x: -40,
            y: 100 + Math.random() * (H - 250),
            w: 60 + Math.random() * 80,
            alpha: 0.08 + Math.random() * 0.06,
            speed: 0.15 + Math.random() * 0.2,
          });
        }

        // Update mist
        for (let i = this.mistParticles.length - 1; i >= 0; i--) {
          const m = this.mistParticles[i];
          m.x += m.speed;
          m.alpha -= 0.0002;
          if (m.x > W + 60 || m.alpha <= 0) this.mistParticles.splice(i, 1);
        }

        // Collision detection
        const { collision } = GAME_CONFIG;
        const zelbyY = H - GAME_CONFIG.zelby.yCatch;

        for (let i = this.items.length - 1; i >= 0; i--) {
          const it = this.items[i];
          if (it.caught || it.missed) continue;
          it.y += it.speed * (dt / 16);
          it.age += dt;

          if (
            it.y > zelbyY - collision.halfH &&
            it.y < zelbyY + collision.halfH &&
            Math.abs(it.x - this.zelbyX) < collision.halfW
          ) {
            it.caught = true;
            this.items.splice(i, 1);

            if (it.valid) {
              // Correct catch
              this.combo++;
              this.streak++;
              this.maxCombo = Math.max(this.maxCombo, this.combo);

              // Level up based on streak
              if (
                this.streak >= GAME_CONFIG.streak.threshold &&
                this.level < GAME_CONFIG.streak.maxLevel
              ) {
                this.level++;
                this.streak = 0;
                this.baseSpeed += GAME_CONFIG.streak.speedBonus;
                playTone(mutedRef.current, 523, "sine", 0.15, 0.2, 784);
                this.float(W / 2, H / 2 - 60, `LEVEL ${this.level}!`, "#A78BFA", 28);
                this.burst(W / 2, H / 2 - 60, "#A78BFA", 20, "star");
                flash("#A78BFA");
              }

              const points =
                (this.frenzy > 0 ? 20 : 10) + Math.floor(this.combo / 5) * 5;
              this.score += points;

              if (this.combo === 10 && this.frenzy <= 0) {
                this.frenzy = 5000;
                playTone(mutedRef.current, 800, "square", 0.5, 0.2, 1600);
                flash("#FBBF24");
              } else {
                playTone(
                  mutedRef.current,
                  600 + this.combo * 20,
                  "sine",
                  0.1,
                  0.15,
                  900
                );
              }

              this.burst(it.x, it.y, "#FBBF24", 10, "star");
              this.float(it.x, it.y - 26, `+${points}`, "#FBBF24", 22);
            } else {
              // Wrong catch
              this.combo = 0;
              this.streak = 0;
              this.lives--;
              this.shake = 15;
              playTone(mutedRef.current, 150, "sawtooth", 0.3, 0.2, 80);
              this.burst(it.x, it.y, "#EF4444", 15, "circle");
              flash("#EF4444");
              if (this.lives <= 0) {
                this.gameOver();
                return;
              }
            }
          } else if (it.y > H + 50) {
            it.missed = true;
            this.items.splice(i, 1);
            if (it.valid) {
              this.combo = 0;
              this.streak = 0;
              this.lives--;
              this.shake = 10;
              playTone(mutedRef.current, 200, "triangle", 0.2, 0.15, 100);
              if (this.lives <= 0) {
                this.gameOver();
                return;
              }
            } else {
              this.score += 5;
              playTone(mutedRef.current, 400, "sine", 0.05, 0.1);
              this.float(it.x, H - 60, "+5", "#4ADE80", 18);
            }
          }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3;
          p.life--;
          if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update float texts
        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
          const f = this.floatTexts[i];
          f.y -= 0.7;
          f.life--;
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
      // Calculate stars
      let stars = 1;
      if (this.score >= GAME_CONFIG.stars.three) stars = 3;
      else if (this.score >= GAME_CONFIG.stars.two) stars = 2;
      setFinalStars(stars);
      setTimeout(() => setScreen("over"), 400);
    }

    updateHud() {
      const h = {
        score: this.score,
        lives: this.lives,
        combo: this.combo,
        waktu: this.waktuSisa,
        level: this.level,
      };
      if (
        h.score === this.lastHud.score &&
        h.lives === this.lastHud.lives &&
        h.combo === this.lastHud.combo &&
        h.waktu === this.lastHud.waktu &&
        h.level === this.lastHud.level
      )
        return;
      this.lastHud = h;
      setHud(h);
    }

    render() {
      const c = canvasRef.current?.getContext("2d");
      if (!c) return;

      c.save();
      if (this.shake > 0.5) {
        c.translate(
          (Math.random() - 0.5) * this.shake,
          (Math.random() - 0.5) * this.shake
        );
      }

      /* ========== BACKGROUND — HUTAN KATA SCENE ========== */
      /* Artwork bg_petualangankata.png (1024x1536, 2:3) matches the canvas
         aspect (480x720, 2:3): drawn 1:1, no stretch, no crop. The treehouse,
         BC identity, waterfall, river and path stay fully visible. While the
         image loads, a deep forest base fill keeps frames clean. */

      // Base fill (visible only before the artwork finishes loading)
      c.fillStyle = "#0E2417";
      c.fillRect(0, 0, W, H);

      // Scene artwork — layer 1, behind everything gameplay
      const bgImg = bgImgRef.current;
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        c.drawImage(bgImg, 0, 0, W, H);
      }

      // Light rays from canopy gaps
      c.save();
      for (const ray of this.lightRays) {
        c.save();
        c.translate(ray.x, 0);
        c.rotate(ray.angle);
        const rayGrad = c.createLinearGradient(0, 0, 0, H * 0.7);
        rayGrad.addColorStop(0, `rgba(200,220,160,${ray.alpha})`);
        rayGrad.addColorStop(1, "rgba(200,220,160,0)");
        c.fillStyle = rayGrad;
        c.fillRect(-ray.w / 2, 0, ray.w, H * 0.7);
        c.restore();
      }
      c.restore();

      // Mist/fog
      c.save();
      for (const m of this.mistParticles) {
        const mistGrad = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.w);
        mistGrad.addColorStop(0, `rgba(180,200,180,${m.alpha})`);
        mistGrad.addColorStop(1, "rgba(180,200,180,0)");
        c.fillStyle = mistGrad;
        c.fillRect(m.x - m.w, m.y - m.w * 0.4, m.w * 2, m.w * 0.8);
      }
      c.restore();

      /* ========== RULE BANNER ========== */
      c.fillStyle = "rgba(10, 20, 40, 0.85)";
      c.beginPath();
      if (c.roundRect) c.roundRect(30, 16, W - 60, 44, 12);
      else c.rect(30, 16, W - 60, 44);
      c.fill();
      c.strokeStyle = RULES[this.rule].color;
      c.lineWidth = 2;
      c.stroke();
      c.font = "800 16px system-ui, sans-serif";
      c.fillStyle = RULES[this.rule].color;
      c.textAlign = "center";
      c.fillText(`TANGKAP: ${RULES[this.rule].label}`, W / 2, 44);

      /* ========== ITEMS — pisangzelby2.png + WORD ON BANANA ========== */
      const bananaImg = bananaImgRef.current;
      const bananaReady =
        !!bananaImg && bananaImg.complete && bananaImg.naturalWidth > 0;
      const { crop, naturalW, naturalH, drawW, drawH } = GAME_CONFIG.banana;

      for (const it of this.items) {
        if (it.caught || it.missed) continue;
        c.save();
        c.translate(it.x, it.y);

        // Spawn pop-in + gentle wobble
        const pop = Math.min(1, 0.35 + it.age / 130);
        c.scale(pop, pop);
        const wobble = Math.sin(it.y * 0.025 + it.wobblePhase) * 0.12;
        c.rotate(wobble);

        if (bananaReady) {
          const useCrop =
            bananaImg.naturalWidth === naturalW &&
            bananaImg.naturalHeight === naturalH;
          if (useCrop) {
            c.drawImage(
              bananaImg,
              crop.sx,
              crop.sy,
              crop.sw,
              crop.sh,
              -drawW / 2,
              -drawH / 2,
              drawW,
              drawH
            );
          } else {
            c.drawImage(
              bananaImg,
              -drawW / 2,
              -drawH / 2,
              drawW,
              drawH
            );
          }
        } else {
          // Fallback banana shape
          c.fillStyle = "#FBBF24";
          c.beginPath();
          c.ellipse(0, 0, drawW / 2, drawH / 2, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#D4A017";
          c.lineWidth = 2;
          c.stroke();
        }

        /* WORD drawn ON the banana body — natural text placement */
        const wordLen = it.word.length;
        const fontSize = wordLen > 6 ? 11 : wordLen > 4 ? 13 : 15;

        // Text background — subtle rounded rect that follows banana body
        const pillW = wordLen * fontSize * 0.58 + 12;
        const pillH = fontSize + 8;
        c.fillStyle = "rgba(255,255,255,0.88)";
        c.beginPath();
        if (c.roundRect)
          c.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
        else c.rect(-pillW / 2, -pillH / 2, pillW, pillH);
        c.fill();

        // Subtle border matching banana theme
        c.strokeStyle = "rgba(200,160,30,0.35)";
        c.lineWidth = 1;
        c.stroke();

        // Word text
        c.fillStyle = "#1A1200";
        c.font = `800 ${fontSize}px system-ui, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(it.word, 0, 1);

        c.restore();
      }

      /* ========== ZELBY CHARACTER ========== */
      const zX = this.zelbyX;
      const zY = H - GAME_CONFIG.zelby.yOffset;
      const zScale = this.frenzy > 0 ? 1.2 : 1;
      const img =
        this.frenzy > 0
          ? zelbyCelebrateImgRef.current
          : zelbyImgRef.current;

      if (img && imagesLoaded.current) {
        c.save();
        c.translate(zX, zY);
        c.scale(zScale, zScale);
        const iw = GAME_CONFIG.zelby.w;
        const ih = GAME_CONFIG.zelby.h;

        // Shadow under Zelby
        c.fillStyle = "rgba(0,0,0,0.2)";
        c.beginPath();
        c.ellipse(0, ih / 2 + 4, iw * 0.4, 4, 0, 0, Math.PI * 2);
        c.fill();

        // Zelby image
        c.drawImage(img, -iw / 2, -ih / 2, iw, ih);

        // Frenzy glow ring
        if (this.frenzy > 0) {
          c.shadowColor = "#FF6B6B";
          c.shadowBlur = 20;
          c.strokeStyle = "rgba(255,107,107,0.5)";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, 44, 0, Math.PI * 2);
          c.stroke();
          c.shadowBlur = 0;
        }

        // Level indicator under Zelby
        if (this.level > 1) {
          c.font = "700 9px system-ui, sans-serif";
          c.fillStyle = "#A78BFA";
          c.textAlign = "center";
          c.fillText(`LV.${this.level}`, 0, ih / 2 + 14);
        }

        c.restore();
      } else {
        // Fallback: simple tarsius
        c.save();
        c.translate(zX, zY);
        c.scale(zScale, zScale);
        c.fillStyle = "#8B5CF6";
        c.beginPath();
        c.arc(0, 0, 28, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#E9C46A";
        c.beginPath();
        c.arc(0, -2, 18, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#161B3A";
        c.beginPath();
        c.arc(-6, -6, 4, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(6, -6, 4, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#161B3A";
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 4, 5, 0, Math.PI);
        c.stroke();
        c.restore();
      }

      /* ========== PARTICLES ========== */
      for (const p of this.particles) {
        c.globalAlpha = Math.min(1, p.life / (p.maxLife * 0.4));
        c.fillStyle = p.color;
        if (p.shape === "star") {
          // Star shape
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.life * 0.1);
          c.beginPath();
          for (let j = 0; j < 5; j++) {
            const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = j % 2 === 0 ? p.size : p.size * 0.45;
            if (j === 0) c.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else c.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          c.closePath();
          c.fill();
          c.restore();
        } else {
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;

      /* ========== FLOAT TEXTS ========== */
      for (const f of this.floatTexts) {
        c.globalAlpha = Math.min(1, f.life / 15);
        c.font = `900 ${f.size}px system-ui, sans-serif`;
        c.fillStyle = f.color;
        c.textAlign = "center";
        c.fillText(f.text, f.x, f.y);
      }
      c.globalAlpha = 1;

      /* ========== FRENZY BANNER ========== */
      if (this.frenzy > 0) {
        c.save();
        c.font = "900 28px system-ui, sans-serif";
        c.fillStyle = "#FF6B6B";
        c.textAlign = "center";
        c.shadowColor = "#FF6B6B";
        c.shadowBlur = 15;
        c.fillText("FRENZY MODE! 2X SKOR!", W / 2, H - 140);
        c.shadowBlur = 0;
        c.restore();
      }

      /* ========== COMBO BANNER ========== */
      if (this.combo >= 3) {
        c.save();
        c.font = "900 22px system-ui, sans-serif";
        c.fillStyle = "#4ADE80";
        c.textAlign = "center";
        c.shadowColor = "#4ADE80";
        c.shadowBlur = 10;
        c.fillText(`${this.combo}x RENTETAN!`, W / 2, 95);
        c.shadowBlur = 0;
        c.restore();
      }

      c.restore(); // main save
    }
  }

  /* ========== START GAME ========== */
  const startGame = useCallback(
    (rule: RuleKey) => {
      ensureAudio();
      setScreen("game");
      setPaused(false);
      setHud({
        score: 0,
        lives: GAME_CONFIG.lives,
        combo: 0,
        waktu: DURASI_GAME,
        level: 1,
      });
      setFinalScore(0);
      setFinalStars(0);
      engineRef.current?.stop();
      const eng = new Engine(rule);
      engineRef.current = eng;
      requestAnimationFrame(() => eng.start());
    },
    []
  );

  const togglePause = useCallback(() => {
    const g = engineRef.current;
    if (!g || !g.running) return;
    const next = !g.paused;
    g.setPaused(next);
    setPaused(next);
  }, []);

  const quit = useCallback(() => {
    engineRef.current?.stop();
    setPaused(false);
    setScreen("start");
  }, []);

  const handlePointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!engineRef.current || engineRef.current.paused) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      engineRef.current.move(x);
    },
    []
  );

  const chunky =
    "border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#0891B2]";
  const btn = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  return (
    <div className="game-env game-env-zelby fixed inset-0 z-[60] overflow-y-auto game-env-bg bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] dark:from-[#061214] dark:to-[#0A1C20] text-[#161B3A] dark:text-[#F1EDFF]">
      <style>{`
        @keyframes pk-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pk-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes pk-star1{0%{transform:scale(0) rotate(0)}50%{transform:scale(1.3) rotate(180deg)}100%{transform:scale(1) rotate(360deg)}}
        @keyframes pk-star2{0%{transform:scale(0) rotate(0)}60%{transform:scale(1.2) rotate(200deg)}100%{transform:scale(1) rotate(360deg)}}
        @keyframes pk-star3{0%{transform:scale(0) rotate(0)}70%{transform:scale(1.1) rotate(240deg)}100%{transform:scale(1) rotate(360deg)}}
        .pk-screen{animation:pk-fade .35s ease}
        .pk-pop{animation:pk-pop .5s ease}
        .pk-star1{animation:pk-star1 .5s ease .1s both}
        .pk-star2{animation:pk-star2 .5s ease .3s both}
        .pk-star3{animation:pk-star3 .5s ease .5s both}
      `}</style>

      {/* Screen flash overlay */}
      {screenFlash && (
        <div
          className="fixed inset-0 z-[70] pointer-events-none transition-opacity duration-200"
          style={{ backgroundColor: screenFlash, opacity: 0.25 }}
        />
      )}

      <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <GameBackButton href="/arena/game" label="Kembali ke Arena" title="Kembali ke Arena" />
            <div className="w-11 h-11 rounded-2xl overflow-hidden border-4 border-[#161B3A] dark:border-white/25 shadow-[4px_4px_0_#0891B2] shrink-0 bg-white dark:bg-[#0C2228] pk-pop">
              <img
                src="/junior/karakter/zelby_happy.webp"
                alt="Zelby"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-extrabold text-xl leading-none font-game-display">
                Petualangan Hutan Kata
              </div>
              <div className="text-[11px] font-semibold opacity-60 mt-0.5">
                Tangkap kata yang benar!
              </div>
            </div>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className={`${btn} game-sound-btn w-11 h-11 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50 dark:hover:bg-slate-700`}
            aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          >
            {muted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* ========== START SCREEN ========== */}
        {screen === "start" && (
          <div className={`pk-screen game-env-card bg-white dark:bg-gradient-to-br dark:from-[#0C2228] dark:to-[#142E34] rounded-3xl ${chunky} p-6 text-center w-full max-w-md`}>
            <div className="w-24 h-24 mx-auto mb-3 rounded-3xl overflow-hidden border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#0891B2]">
              <img
                src="/junior/karakter/zelby_wave.webp"
                alt="Zelby si Tarsius"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-extrabold text-3xl mb-2 font-game-display">
              Petualangan Hutan Kata
            </h1>
            <p className="opacity-70 text-sm mb-1">
              Bantu Zelby menangkap <strong>kata yang benar</strong> dan
              hindari yang salah!
            </p>
            <p className="opacity-60 text-xs mb-5">
              <Clock className="w-3 h-3 inline mr-1" />
              90 detik &middot;{" "}
              <Heart className="w-3 h-3 inline mx-1" />3 nyawa &middot;{" "}
              <Zap className="w-3 h-3 inline mx-1" />
              rentetan = level naik
            </p>

            {highScore > 0 && (
              <div className="mb-4 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl text-sm font-bold text-amber-700 flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" /> Skor Tertinggi: {highScore}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => startGame("BENDA")}
                className={`${btn} w-full px-5 py-4 bg-sky-400 text-white text-lg`}
              >
                <Zap className="w-5 h-5" /> Kata Benda
              </button>
              <button
                onClick={() => startGame("KERJA")}
                className={`${btn} w-full px-5 py-4 bg-emerald-400 text-lg`}
              >
                <Zap className="w-5 h-5" /> Kata Kerja
              </button>
              <button
                onClick={() => startGame("SIFAT")}
                className={`${btn} w-full px-5 py-4 bg-red-400 text-white text-lg`}
              >
                <Star className="w-5 h-5" /> Kata Sifat
              </button>
            </div>
          </div>
        )}

        {/* ========== GAME SCREEN ========== */}
        {screen === "game" && (
          <div className="pk-screen w-full flex flex-col items-center">
            {/* HUD — compact, themed */}
            <div className="w-full max-w-[480px] grid grid-cols-5 gap-1.5 mb-3">
              <div className="rounded-xl bg-[#161B3A] text-white px-2 py-1.5 shadow-[3px_3px_0_#0891B2] border-[3px] border-[#161B3A] dark:border-white/25">
                <div className="text-[7px] font-extrabold uppercase opacity-70">Skor</div>
                <div className="font-extrabold text-base leading-none">{hud.score}</div>
              </div>
              <div className="rounded-xl bg-[#FBBF24] px-2 py-1.5 shadow-[3px_3px_0_#0891B2] border-[3px] border-[#161B3A] dark:border-white/25">
                <div className="text-[7px] font-extrabold uppercase opacity-70">Kombo</div>
                <div className="font-extrabold text-base leading-none">{hud.combo}x</div>
              </div>
              <div className="rounded-xl bg-[#FF6B6B] text-white px-2 py-1.5 shadow-[3px_3px_0_#0891B2] border-[3px] border-[#161B3A] dark:border-white/25">
                <div className="text-[7px] font-extrabold uppercase opacity-70">Nyawa</div>
                <div className="flex gap-0.5 mt-0.5">
                  {[0, 1, 2].map((i) => (
                    <Heart
                      key={i}
                      size={12}
                      fill={i < hud.lives ? "currentColor" : "none"}
                    />
                  ))}
                </div>
              </div>
              <div
                className={`rounded-xl px-2 py-1.5 shadow-[3px_3px_0_#0891B2] border-[3px] border-[#161B3A] dark:border-white/25 ${
                  hud.waktu <= 10
                    ? "bg-red-500 text-white"
                    : "bg-white dark:bg-[#0C2228]"
                }`}
              >
                <div className="text-[7px] font-extrabold uppercase opacity-70">Waktu</div>
                <div className="font-extrabold text-base leading-none">{hud.waktu}s</div>
              </div>
              <div className="rounded-xl bg-[#A78BFA] text-white px-2 py-1.5 shadow-[3px_3px_0_#0891B2] border-[3px] border-[#161B3A] dark:border-white/25">
                <div className="text-[7px] font-extrabold uppercase opacity-70">Level</div>
                <div className="font-extrabold text-base leading-none">{hud.level}</div>
              </div>
            </div>

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full max-w-[480px] rounded-2xl border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#0891B2] touch-none"
              onPointerDown={handlePointer}
              onPointerMove={handlePointer}
            />

            {/* Controls */}
            <div className="w-full max-w-[480px] flex justify-between mt-4">
              <GameBackButton onClick={quit} label="Kembali" title="Kembali ke menu Petualangan Hutan Kata" />
              <p className="text-xs font-bold opacity-60 self-center flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Geser jari untuk mengendalikan Zelby
              </p>
              <button
                onClick={togglePause}
                className={`${btn} game-sound-btn w-12 h-12 text-[#161B3A] dark:text-[#F1EDFF] hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white`}
                aria-label={paused ? "Lanjutkan" : "Jeda"}
              >
                {paused ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========== GAME OVER SCREEN ========== */}
        {screen === "over" && (
          <div className={`pk-screen bg-white dark:bg-gradient-to-br dark:from-[#0C2228] dark:to-[#142E34] rounded-3xl ${chunky} p-6 text-center w-full max-w-md`}>
            <div className="w-24 h-24 mx-auto mb-3 rounded-3xl overflow-hidden border-4 border-[#161B3A] dark:border-white/25 shadow-[6px_6px_0_#0891B2]">
              <img
                src="/junior/karakter/zelby_celebrate.webp"
                alt="Zelby"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="font-extrabold text-3xl mb-1 font-game-display">
              Permainan Selesai!
            </h2>
            <p className="opacity-70 text-sm mb-4">
              Zelby sangat senang belajar bareng kamu hari ini!
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  size={36}
                  className={
                    s <= finalStars
                      ? s === 1
                        ? "pk-star1 text-[#FBBF24] fill-[#FBBF24]"
                        : s === 2
                        ? "pk-star2 text-[#FBBF24] fill-[#FBBF24]"
                        : "pk-star3 text-[#FBBF24] fill-[#FBBF24]"
                      : "text-gray-200 fill-gray-200 dark:text-gray-600 dark:fill-gray-600"
                  }
                />
              ))}
            </div>

            {/* Score card */}
            <div className="bg-[#161B3A] text-white rounded-2xl px-6 py-4 mb-4 shadow-[5px_5px_0_#FBBF24]">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                Total Skor
              </div>
              <div className="font-extrabold text-5xl leading-none">{finalScore}</div>
            </div>

            {finalScore > 0 && finalScore >= highScore && (
              <div className="mb-3 text-sm font-extrabold text-amber-600 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-2 pk-pop flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" /> Skor Tertinggi Baru!
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => startGame("BENDA")}
                className={`${btn} px-5 py-3 bg-white dark:bg-[#0C2228]`}
              >
                <RotateCcw className="w-4 h-4" /> Main Lagi
              </button>
              <button
                onClick={() => setScreen("start")}
                className={`${btn} px-5 py-3 bg-[#FBBF24] hover:brightness-110`}
              >
                Pilih Pelajaran
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
