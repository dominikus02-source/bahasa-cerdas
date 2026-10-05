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
import KuisTempurPhaserWorld from "@/components/game/KuisTempurPhaserWorld";

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
  connected?: boolean;
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

const WORLD_W = 1400;
const WORLD_H = 840;

export default function KuisTempurArena({
  code,
  userId,
  onExit,
}: {
  code: string;
  userId: string;
  onExit: () => void;
}) {
  const stateRef = useRef<ArenaState>({ seq: 0, timeLeft: 180, entities: [] });

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
      stopCountdown();
      stopFinished();
      stopError();
    };
  }, [code, userId]);

  const me = useMemo(() => arena.entities.find((entity) => entity.id === userId), [arena, userId]);
  const humans = useMemo(() => arena.entities.filter((entity) => entity.kind === "human"), [arena]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!me?.alive || result) return;
      const step = 110;
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
      .filter((entity) => entity.alive && entity.connected !== false && entity.id !== userId)
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

      <KuisTempurPhaserWorld
        code={code}
        userId={userId}
        arena={arena}
        feedback={feedback}
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
