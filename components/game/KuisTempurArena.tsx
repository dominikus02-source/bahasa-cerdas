"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Crosshair,
  Heart,
  Loader2,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import { gameSocket } from "@/lib/game/socket";
import { setQuiet } from "@/lib/notif-quiet";

type ArenaEntity = {
  id: string;
  name: string;
  kind: "human" | "bot";
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  ammo: number;
  score: number;
  kills: number;
  deaths: number;
  correct: number;
  wrong: number;
  combo: number;
  alive: boolean;
  avatarUrl?: string | null;
  color?: string;
  respawnIn?: number;
};

type ArenaState = {
  seq: number;
  timeLeft: number;
  entities: ArenaEntity[];
};

type ArenaQuestion = {
  id: string;
  index: number;
  text: string;
  options: string[];
  timeLimit: number;
  deadline: number;
};

type ArenaResult = {
  results: Array<{
    playerId: string;
    playerName: string;
    avatarUrl?: string | null;
    rank: number;
    score: number;
    kills: number;
    deaths: number;
    correct: number;
    wrong: number;
    maxStreak: number;
    xpEarned: number;
  }>;
};

type HitFx = { fromId: string; targetId: string; expires: number; damage: number };

const WORLD_W = 1000;
const WORLD_H = 600;

export default function KuisTempurArena({
  code,
  userId,
  onExit,
}: {
  code: string;
  userId: string;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ArenaState>({ seq: 0, timeLeft: 180, entities: [] });
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const bgRef = useRef<HTMLImageElement | null>(null);
  const hitFxRef = useRef<HitFx[]>([]);
  const rafRef = useRef<number>(0);

  const [arena, setArena] = useState<ArenaState>(stateRef.current);
  const [question, setQuestion] = useState<ArenaQuestion | null>(null);
  const [lockedAnswer, setLockedAnswer] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [result, setResult] = useState<ArenaResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [now, setNow] = useState(Date.now());
  const [serverMessage, setServerMessage] = useState("");

  useEffect(() => {
    setQuiet(true);
    return () => setQuiet(false);
  }, []);

  useEffect(() => {
    const bg = new Image();
    bg.src = "/game/kuis-tempur/assets/world/base/arena_base_01.png";
    bgRef.current = bg;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const stopState = gameSocket.onArenaState((next: ArenaState) => {
      stateRef.current = next;
      setArena(next);
    });
    const stopQuestion = gameSocket.onArenaQuestion((next: ArenaQuestion) => {
      setQuestion(next);
      setLockedAnswer(false);
      setFeedback(null);
    });
    const stopFeedback = gameSocket.onArenaFeedback((data: { correct: boolean; ammo: number; combo: number; message?: string }) => {
      setFeedback({
        correct: Boolean(data.correct),
        text: data.message || (data.correct ? `Benar! +1 amunisi · Kombo ${data.combo}×` : "Belum tepat. Cari jawaban berikutnya!"),
      });
      window.setTimeout(() => setFeedback(null), 1200);
    });
    const stopHit = gameSocket.onArenaHit((data: { fromId: string; targetId: string; damage: number }) => {
      hitFxRef.current.push({ ...data, expires: performance.now() + 220 });
    });
    const stopCountdown = gameSocket.onArenaCountdown((data: { seconds: number }) => {
      setCountdown(data.seconds > 0 ? data.seconds : null);
    });
    const stopFinished = gameSocket.onArenaFinished((data: ArenaResult) => {
      setResult(data);
      setQuestion(null);
      setCountdown(null);
    });
    const stopError = gameSocket.onError((data: { message?: string }) => {
      setServerMessage(data?.message || "Koneksi arena bermasalah.");
    });

    gameSocket.arenaReady({ code, userId });

    return () => {
      stopState();
      stopQuestion();
      stopFeedback();
      stopHit();
      stopCountdown();
      stopFinished();
      stopError();
    };
  }, [code, userId]);

  const me = useMemo(() => arena.entities.find((entity) => entity.id === userId), [arena, userId]);
  const humans = useMemo(() => arena.entities.filter((entity) => entity.kind === "human"), [arena]);

  const getImage = useCallback((src: string) => {
    let image = imageCache.current.get(src);
    if (!image) {
      image = new Image();
      image.src = src;
      imageCache.current.set(src, image);
    }
    return image;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const W = rect.width;
      const H = rect.height;
      const bg = bgRef.current;
      ctx.clearRect(0, 0, W, H);

      if (bg?.complete && bg.naturalWidth) {
        const scale = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
        const sw = W / scale;
        const sh = H / scale;
        const sx = (bg.naturalWidth - sw) / 2;
        const sy = (bg.naturalHeight - sh) / 2;
        ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#0f5c3f");
        grad.addColorStop(0.5, "#4a7b3d");
        grad.addColorStop(1, "#174a34");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // Living world layer: vignette, paths, ambient motes and arena core.
      const nowMs = performance.now();
      const worldGlow = ctx.createRadialGradient(W * 0.5, H * 0.48, 20, W * 0.5, H * 0.48, Math.max(W, H) * 0.55);
      worldGlow.addColorStop(0, "rgba(34,211,238,.08)");
      worldGlow.addColorStop(0.55, "rgba(15,23,42,.04)");
      worldGlow.addColorStop(1, "rgba(2,6,23,.32)");
      ctx.fillStyle = worldGlow;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "#d9f99d";
      ctx.lineWidth = Math.max(2, W / 520);
      ctx.setLineDash([12, 18]);
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.52, W * 0.33, H * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      for (let i = 0; i < 24; i++) {
        const px = ((i * 137 + nowMs * (0.008 + (i % 3) * 0.003)) % 1000) / 1000 * W;
        const py = ((i * 83 + Math.sin(nowMs / 900 + i) * 55 + 900) % 600) / 600 * H;
        const alpha = 0.16 + (i % 5) * 0.035;
        ctx.fillStyle = `rgba(190,242,100,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + (i % 3) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      const state = stateRef.current;
      const byId = new Map(state.entities.map((entity) => [entity.id, entity]));

      for (const fx of hitFxRef.current) {
        const from = byId.get(fx.fromId);
        const target = byId.get(fx.targetId);
        if (!from || !target || performance.now() > fx.expires) continue;
        const ax = (from.x / WORLD_W) * W;
        const ay = (from.y / WORLD_H) * H;
        const bx = (target.x / WORLD_W) * W;
        const by = (target.y / WORLD_H) * H;
        const alpha = Math.max(0, (fx.expires - performance.now()) / 220);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = from.kind === "human" ? "#fbbf24" : "#fb7185";
        ctx.lineWidth = 4;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
      }
      hitFxRef.current = hitFxRef.current.filter((fx) => performance.now() <= fx.expires);

      state.entities.forEach((entity, index) => {
        const x = (entity.x / WORLD_W) * W;
        const y = (entity.y / WORLD_H) * H;
        const isMe = entity.id === userId;
        const accent = entity.color || (isMe ? "#22d3ee" : "#fb7185");
        const scale = Math.max(0.78, Math.min(1.1, W / 1100));
        const bob = entity.alive ? Math.sin(nowMs / 260 + index * 0.8) * 1.7 : 0;
        const bodyY = y + bob;

        ctx.save();
        if (!entity.alive) ctx.globalAlpha = 0.38;

        // Soft ground shadow.
        ctx.fillStyle = "rgba(2,8,23,.34)";
        ctx.beginPath();
        ctx.ellipse(x, y + 31 * scale, 24 * scale, 7 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player aura makes local identity readable in a crowded 10-player room.
        if (isMe && entity.alive) {
          const aura = ctx.createRadialGradient(x, bodyY, 5, x, bodyY, 42 * scale);
          aura.addColorStop(0, "rgba(34,211,238,.20)");
          aura.addColorStop(1, "rgba(34,211,238,0)");
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(x, bodyY, 42 * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stylised hero body v1. Profile photo stays as identity badge, not the whole body.
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(x - 15 * scale, bodyY - 5 * scale, 30 * scale, 31 * scale, 9 * scale);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(x - 11 * scale, bodyY + 1 * scale, 22 * scale, 19 * scale, 7 * scale);
        ctx.fill();

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(x, bodyY - 14 * scale, 13 * scale, 0, Math.PI * 2);
        ctx.fill();

        const portraitSize = 9.5 * scale;
        if (entity.avatarUrl) {
          const image = getImage(entity.avatarUrl);
          if (image.complete && image.naturalWidth) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, bodyY - 14 * scale, portraitSize, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(image, x - portraitSize, bodyY - 14 * scale - portraitSize, portraitSize * 2, portraitSize * 2);
            ctx.restore();
          }
        } else {
          ctx.fillStyle = "#e2e8f0";
          ctx.beginPath();
          ctx.arc(x, bodyY - 14 * scale, 5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Weapon / energy gauntlet.
        ctx.strokeStyle = "#fef3c7";
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x + 10 * scale, bodyY + 4 * scale);
        ctx.lineTo(x + 20 * scale, bodyY + 10 * scale);
        ctx.stroke();
        ctx.fillStyle = entity.ammo > 0 ? "#fde047" : "#64748b";
        ctx.beginPath();
        ctx.arc(x + 21 * scale, bodyY + 11 * scale, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        const hpRatio = Math.max(0, Math.min(1, entity.hp / Math.max(1, entity.hpMax)));
        ctx.fillStyle = "rgba(2,8,23,.86)";
        ctx.roundRect(x - 27, bodyY - 39 * scale, 54, 6, 3);
        ctx.fill();
        ctx.fillStyle = hpRatio > 0.45 ? "#34d399" : hpRatio > 0.2 ? "#fbbf24" : "#fb7185";
        ctx.roundRect(x - 27, bodyY - 39 * scale, 54 * hpRatio, 6, 3);
        ctx.fill();

        ctx.font = "800 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = isMe ? "#a5f3fc" : "white";
        ctx.shadowColor = "rgba(0,0,0,.85)";
        ctx.shadowBlur = 4;
        ctx.fillText(isMe ? `${entity.name} · KAMU` : entity.name, x, bodyY + 43 * scale);
        ctx.shadowBlur = 0;

        if (!entity.alive) {
          ctx.font = "900 9px system-ui, sans-serif";
          ctx.fillStyle = "#fde68a";
          ctx.fillText(`RESPAWN ${Math.max(1, Math.ceil(entity.respawnIn || 1))}s`, x, bodyY + 5);
        }

        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getImage, userId]);

  const toWorldPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(WORLD_W, ((clientX - rect.left) / rect.width) * WORLD_W)),
      y: Math.max(0, Math.min(WORLD_H, ((clientY - rect.top) / rect.height) * WORLD_H)),
      pxX: clientX - rect.left,
      pxY: clientY - rect.top,
      rect,
    };
  }, []);

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!me?.alive || result) return;
      const point = toWorldPoint(clientX, clientY);
      if (!point) return;

      let closest: { entity: ArenaEntity; distance: number } | null = null;
      for (const entity of arena.entities) {
        if (!entity.alive || entity.id === userId) continue;
        const ex = (entity.x / WORLD_W) * point.rect.width;
        const ey = (entity.y / WORLD_H) * point.rect.height;
        const dist = Math.hypot(ex - point.pxX, ey - point.pxY);
        if (!closest || dist < closest.distance) closest = { entity, distance: dist };
      }

      if (closest && closest.distance < 48 && (me.ammo || 0) > 0) {
        gameSocket.arenaShoot({ code, userId, targetId: closest.entity.id });
      } else {
        gameSocket.arenaMove({ code, userId, x: point.x, y: point.y });
      }
    },
    [arena.entities, code, me, result, toWorldPoint, userId]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!me?.alive || result) return;
      const step = 95;
      const key = event.key.toLowerCase();
      let x = me.x;
      let y = me.y;
      if (key === "w" || key === "arrowup") y -= step;
      else if (key === "s" || key === "arrowdown") y += step;
      else if (key === "a" || key === "arrowleft") x -= step;
      else if (key === "d" || key === "arrowright") x += step;
      else return;
      event.preventDefault();
      gameSocket.arenaMove({
        code,
        userId,
        x: Math.max(0, Math.min(WORLD_W, x)),
        y: Math.max(0, Math.min(WORLD_H, y)),
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code, me, result, userId]);

  const answer = useCallback(
    (answerIndex: number) => {
      if (!question || lockedAnswer || result) return;
      setLockedAnswer(true);
      gameSocket.arenaAnswer({
        code,
        userId,
        questionId: question.id,
        answerIndex,
      });
    },
    [code, lockedAnswer, question, result, userId]
  );

  const shootNearest = useCallback(() => {
    if (!me?.alive || !me.ammo) return;
    const targets = arena.entities
      .filter((entity) => entity.alive && entity.id !== userId)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    if (targets[0]) gameSocket.arenaShoot({ code, userId, targetId: targets[0].id });
  }, [arena.entities, code, me, userId]);

  const secondsForQuestion = question ? Math.max(0, (question.deadline - now) / 1000) : 0;
  const questionProgress = question ? Math.max(0, Math.min(1, secondsForQuestion / Math.max(1, question.timeLimit))) : 0;

  return (
    <main className="fixed inset-0 z-[80] overflow-hidden bg-[#030712] text-white">
      <style>{`
        @keyframes ktArenaPulse{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.05);opacity:1}}
        @keyframes ktArenaPop{0%{transform:translateY(18px) scale(.97);opacity:0}100%{transform:none;opacity:1}}
        .kt-arena-pop{animation:ktArenaPop .25s ease-out}
        .kt-arena-pulse{animation:ktArenaPulse 1.1s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.kt-arena-pop,.kt-arena-pulse{animation:none!important}}
      `}</style>

      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 py-2 sm:px-4">
        <button
          onClick={onExit}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/65 backdrop-blur"
          aria-label="Keluar dari arena"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5 sm:gap-2">
          <div className="rounded-xl border border-white/12 bg-slate-950/65 px-2 py-2 backdrop-blur">
            <div className="text-[8px] font-black tracking-widest text-slate-400">HP</div>
            <div className="mt-0.5 flex items-center gap-1 text-sm font-black">
              <Heart size={13} className="text-rose-400" fill="currentColor" />
              {Math.max(0, Math.round(me?.hp || 0))}
            </div>
          </div>
          <div className="rounded-xl border border-white/12 bg-slate-950/65 px-2 py-2 backdrop-blur">
            <div className="text-[8px] font-black tracking-widest text-slate-400">AMUNISI</div>
            <div className="mt-0.5 flex items-center gap-1 text-sm font-black text-amber-300">
              <Zap size={13} fill="currentColor" /> {me?.ammo || 0}
            </div>
          </div>
          <div className="rounded-xl border border-white/12 bg-slate-950/65 px-2 py-2 backdrop-blur">
            <div className="text-[8px] font-black tracking-widest text-slate-400">SKOR</div>
            <div className="mt-0.5 text-sm font-black text-cyan-200">{me?.score || 0}</div>
          </div>
          <div className="rounded-xl border border-white/12 bg-slate-950/65 px-2 py-2 backdrop-blur">
            <div className="text-[8px] font-black tracking-widest text-slate-400">WAKTU</div>
            <div className={`mt-0.5 text-sm font-black ${arena.timeLeft <= 20 ? "text-rose-300" : "text-white"}`}>
              {Math.max(0, Math.ceil(arena.timeLeft))}s
            </div>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={(e) => handlePointer(e.clientX, e.clientY)}
        className="absolute inset-0 h-full w-full touch-none"
      />

      <div className="pointer-events-none absolute left-3 top-[74px] z-10 w-[150px] space-y-1.5 sm:left-4 sm:w-[190px]">
        {humans
          .slice()
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((entity, index) => (
            <div key={entity.id} className="rounded-xl border border-white/12 bg-slate-950/60 px-3 py-2 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-[11px] font-black">
                  <span className="mr-1 text-amber-300">#{index + 1}</span>
                  {entity.id === userId ? "Kamu" : entity.name}
                </div>
                <div className="text-[10px] font-black text-cyan-200">{entity.score}</div>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width]"
                  style={{ width: `${Math.max(0, Math.min(100, (entity.hp / Math.max(1, entity.hpMax)) * 100))}%` }}
                />
              </div>
            </div>
          ))}
      </div>

      <button
        onClick={shootNearest}
        disabled={!me?.alive || !me?.ammo || Boolean(result)}
        className="absolute right-3 top-[78px] z-20 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/25 bg-gradient-to-br from-amber-300 to-orange-500 text-[#4a1900] shadow-[0_10px_35px_rgba(251,146,60,.35)] active:scale-95 disabled:grayscale disabled:opacity-35 sm:right-5 sm:h-20 sm:w-20"
        aria-label="Tembak target terdekat"
      >
        <Crosshair size={30} />
      </button>

      <div className="absolute right-3 top-[150px] z-20 rounded-xl border border-white/12 bg-slate-950/60 px-3 py-2 text-[10px] font-bold text-white/70 backdrop-blur sm:right-5 sm:top-[174px]">
        Tap lawan = tembak<br />Tap tanah = bergerak
      </div>

      {question && !result && (
        <section className="kt-arena-pop absolute inset-x-2 bottom-2 z-30 mx-auto max-w-3xl rounded-[26px] border border-white/15 bg-[#071020]/95 p-3 shadow-[0_22px_65px_rgba(0,0,0,.55)] backdrop-blur-xl sm:inset-x-4 sm:bottom-4 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600">
                <Sparkles size={17} />
              </div>
              <div>
                <div className="text-[9px] font-black tracking-[.2em] text-cyan-300">SOAL AMUNISI</div>
                <div className="text-[10px] font-bold text-slate-400">Benar = +1 peluru</div>
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-black ${secondsForQuestion <= 4 ? "bg-rose-400/15 text-rose-200" : "bg-white/8 text-white/80"}`}>
              {secondsForQuestion.toFixed(1)}s
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full origin-left rounded-full ${secondsForQuestion <= 4 ? "bg-rose-400" : "bg-cyan-400"}`}
              style={{ width: `${questionProgress * 100}%` }}
            />
          </div>
          <h2 className="mt-3 text-sm font-black leading-5 sm:text-base">{question.text}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {question.options.map((option, index) => (
              <button
                key={`${question.id}-${index}`}
                onClick={() => answer(index)}
                disabled={lockedAnswer}
                className="rounded-2xl border border-white/12 bg-white/[.07] px-3 py-3 text-left text-xs font-black leading-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 active:scale-[.99] disabled:opacity-50 sm:text-sm"
              >
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-[10px] text-cyan-200">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>
          {feedback && (
            <div className={`mt-2 rounded-xl px-3 py-2 text-center text-xs font-black ${feedback.correct ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
              {feedback.text}
            </div>
          )}
        </section>
      )}

      {countdown !== null && !result && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
          <div className="text-center">
            <div className="text-xs font-black tracking-[.35em] text-cyan-200">PERTEMPURAN DIMULAI</div>
            <div className="kt-arena-pulse mt-2 text-[110px] font-black leading-none text-amber-300 drop-shadow-[0_12px_35px_rgba(251,191,36,.45)]">
              {countdown}
            </div>
          </div>
        </div>
      )}

      {!me?.alive && !result && countdown === null && (
        <div className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center bg-rose-950/20">
          <div className="rounded-2xl border border-rose-200/15 bg-slate-950/75 px-6 py-4 text-center backdrop-blur">
            <div className="text-sm font-black text-rose-200">Kamu tumbang!</div>
            <div className="mt-1 text-xs font-bold text-white/60">Respawn dalam {Math.max(1, Math.ceil(me?.respawnIn || 1))} detik</div>
          </div>
        </div>
      )}

      {serverMessage && (
        <div className="absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-xl border border-rose-300/20 bg-rose-950/90 px-4 py-2 text-xs font-black text-rose-100">
          {serverMessage}
        </div>
      )}

      {result && (
        <div className="absolute inset-0 z-50 overflow-y-auto bg-[#030712]/94 p-4 backdrop-blur-md">
          <div className="mx-auto flex min-h-full max-w-xl items-center justify-center py-6">
            <section className="w-full rounded-[32px] border border-white/12 bg-gradient-to-b from-[#101b35] to-[#07101f] p-5 shadow-[0_28px_90px_rgba(0,0,0,.6)] sm:p-7">
              <div className="text-center">
                <Trophy className="mx-auto text-amber-300" size={46} fill="currentColor" />
                <div className="mt-2 text-xs font-black tracking-[.25em] text-amber-200">HASIL PERTEMPURAN</div>
                <h1 className="mt-1 text-3xl font-black">Arena selesai!</h1>
              </div>

              <div className="mt-5 space-y-2">
                {result.results.map((row) => (
                  <div
                    key={row.playerId}
                    className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-2xl border p-3 ${row.playerId === userId ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-white/[.05]"}`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black ${row.rank === 1 ? "bg-amber-300 text-amber-950" : "bg-white/10"}`}>
                      #{row.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black">{row.playerId === userId ? `${row.playerName} (Kamu)` : row.playerName}</div>
                      <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                        {row.kills} KO · {row.correct} benar · kombo {row.maxStreak}×
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-cyan-200">{row.score}</div>
                      <div className="text-[9px] font-black text-emerald-300">+{row.xpEarned} XP</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={onExit}
                  className="rounded-2xl border border-white/12 bg-white/8 py-3.5 text-sm font-black"
                >
                  <Swords size={16} className="mr-1.5 inline" /> Main lagi
                </button>
                <button
                  onClick={onExit}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 py-3.5 text-sm font-black shadow-lg shadow-blue-950/30"
                >
                  <ArrowLeft size={16} className="mr-1.5 inline" /> Kembali
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {!arena.entities.length && !result && countdown === null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-cyan-300" size={32} />
            <div className="mt-3 text-sm font-black">Sinkronisasi arena...</div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-[238px] right-3 z-10 hidden rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-[10px] font-bold text-white/55 sm:block">
        WASD / panah untuk bergerak
      </div>
    </main>
  );
}
