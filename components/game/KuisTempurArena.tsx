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
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { gameSocket } from "@/lib/game/socket";
import { setQuiet } from "@/lib/notif-quiet";
import KuisTempurPhaserWorld from "@/components/game/KuisTempurPhaserWorld";
import { kuisTempurAudio } from "@/lib/game/kuis-tempur-audio";

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

type KillFeedEntry = {
  id: string;
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
};

type ArenaRematchStatus = {
  readyIds: string[];
  readyCount: number;
  totalCount: number;
  requiredCount: number;
  starting: boolean;
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function ResultAvatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-10 w-10" : "h-14 w-14";
  return (
    <div className={`${dim} overflow-hidden rounded-[30%] border-2 border-white/20 bg-gradient-to-br from-cyan-300/30 to-violet-500/30 shadow-[0_12px_32px_rgba(0,0,0,.3)]`}>
      {src ? (
        // Avatar dapat berasal dari provider/profile berbeda.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-950/60 text-sm font-black text-white">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

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
  const [rematchStatus, setRematchStatus] = useState<ArenaRematchStatus | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const finalRushPlayedRef = useRef(false);

  useEffect(() => {
    setQuiet(true);
    return () => setQuiet(false);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const stopStart = gameSocket.onArenaStart(() => {
      setResult(null);
      setQuestion(null);
      setFeedback(null);
      setLockedAnswer(false);
      setServerMessage("");
      setRematchStatus(null);
      setCountdown(3);
    });
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
      kuisTempurAudio.play(data.correct ? "correct" : "wrong");
      setFeedback({
        correct: Boolean(data.correct),
        text: data.message || (data.correct ? `Benar! +1 amunisi · Kombo ${data.combo}×` : "Belum tepat. Cari jawaban berikutnya!"),
      });
      window.setTimeout(() => setFeedback(null), 1200);
    });
    const stopCountdown = gameSocket.onArenaCountdown((data: { seconds: number }) => {
      if (data.seconds > 0) kuisTempurAudio.play("countdown");
      setCountdown(data.seconds > 0 ? data.seconds : null);
    });
    const stopKo = gameSocket.onArenaKo((data) => {
      const id = `${Date.now()}-${data.attackerId}-${data.targetId}`;
      setKillFeed((current) => [
        { id, ...data },
        ...current,
      ].slice(0, 3));
      window.setTimeout(() => {
        setKillFeed((current) => current.filter((entry) => entry.id !== id));
      }, 2600);
    });
    const stopFinished = gameSocket.onArenaFinished((data: ArenaResult) => {
      kuisTempurAudio.play("victory");
      setResult(data);
      setQuestion(null);
      setCountdown(null);
      setRematchStatus(null);
      setKillFeed([]);
    });
    const stopRematch = gameSocket.onArenaRematchStatus((data: ArenaRematchStatus) => {
      setRematchStatus(data);
    });
    const stopError = gameSocket.onError((data: { message?: string }) => {
      setServerMessage(data?.message || "Koneksi arena bermasalah.");
    });

    gameSocket.arenaReady({ code, userId });

    return () => {
      stopStart();
      stopState();
      stopQuestion();
      stopFeedback();
      stopCountdown();
      stopKo();
      stopFinished();
      stopRematch();
      stopError();
    };
  }, [code, userId]);

  const me = useMemo(() => arena.entities.find((entity) => entity.id === userId), [arena, userId]);
  const humans = useMemo(() => arena.entities.filter((entity) => entity.kind === "human"), [arena]);

  useEffect(() => {
    if (arena.timeLeft > 30) {
      finalRushPlayedRef.current = false;
      return;
    }
    if (arena.timeLeft > 0 && !finalRushPlayedRef.current) {
      finalRushPlayedRef.current = true;
      kuisTempurAudio.play("finalRush");
    }
  }, [arena.timeLeft]);

  const toggleSound = useCallback(() => {
    void kuisTempurAudio.unlock();
    const next = !soundMuted;
    kuisTempurAudio.setMuted(next);
    setSoundMuted(next);
  }, [soundMuted]);

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

  const requestRematch = useCallback(() => {
    if (!result || rematchStatus?.starting || rematchStatus?.readyIds.includes(userId)) return;
    gameSocket.arenaRematch({ code, userId });
  }, [code, rematchStatus, result, userId]);

  const shootNearest = useCallback(() => {
    if (!me?.alive || !me.ammo) return;
    const targets = arena.entities
      .filter((entity) => entity.alive && entity.connected !== false && entity.id !== userId)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    if (targets[0]) gameSocket.arenaShoot({ code, userId, targetId: targets[0].id });
  }, [arena.entities, code, me, userId]);

  const secondsForQuestion = question ? Math.max(0, (question.deadline - now) / 1000) : 0;
  const questionProgress = question ? Math.max(0, Math.min(1, secondsForQuestion / Math.max(1, question.timeLimit))) : 0;
  const rankedResults = useMemo(
    () => (result ? result.results.slice().sort((a, b) => a.rank - b.rank) : []),
    [result]
  );
  const winner = rankedResults[0];
  const podiumRows = [rankedResults[1], rankedResults[0], rankedResults[2]].filter(Boolean);
  const myResult = rankedResults.find((row) => row.playerId === userId);

  return (
    <main
      className="fixed inset-0 z-[80] overflow-hidden bg-[#030712] text-white"
      onPointerDownCapture={() => void kuisTempurAudio.unlock()}
    >
      <style>{`
        @keyframes ktArenaPulse{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.05);opacity:1}}
        @keyframes ktArenaPop{0%{transform:translateY(18px) scale(.97);opacity:0}100%{transform:none;opacity:1}}
        .kt-arena-pop{animation:ktArenaPop .25s ease-out}
        .kt-arena-pulse{animation:ktArenaPulse 1.1s ease-in-out infinite}
        .kt-topbar{padding-top:max(.5rem,env(safe-area-inset-top))}
        .kt-question-panel{bottom:max(.5rem,env(safe-area-inset-bottom))}
        @media (max-height:620px) and (orientation:landscape){
          .kt-question-panel{
            left:auto!important;
            right:max(.45rem,env(safe-area-inset-right))!important;
            width:min(62vw,520px)!important;
            padding:.55rem .65rem!important;
            border-radius:18px!important;
          }
          .kt-question-meta{margin-bottom:.3rem!important}
          .kt-question-title{margin-top:.42rem!important;font-size:.73rem!important;line-height:1rem!important}
          .kt-answer-grid{margin-top:.45rem!important;gap:.35rem!important}
          .kt-answer{padding:.48rem .55rem!important;font-size:.68rem!important;line-height:.9rem!important;border-radius:12px!important}
          .kt-answer-key{height:1.25rem!important;width:1.25rem!important;font-size:.55rem!important}
          .kt-question-feedback{margin-top:.35rem!important;padding:.35rem .55rem!important}
        }
        @media (prefers-reduced-motion:reduce){.kt-arena-pop,.kt-arena-pulse{animation:none!important}}
      `}</style>

      <div className="kt-topbar absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pb-2 sm:px-4">
        <button
          onClick={onExit}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/65 backdrop-blur"
          aria-label="Keluar dari arena"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={toggleSound}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/65 text-white/75 backdrop-blur"
          aria-label={soundMuted ? "Nyalakan suara Kuis Tempur" : "Matikan suara Kuis Tempur"}
        >
          {soundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
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

      {killFeed.length > 0 && !result && (
        <div className="pointer-events-none absolute left-1/2 top-[78px] z-20 flex w-[min(92vw,360px)] -translate-x-1/2 flex-col items-center gap-1.5">
          {killFeed.map((entry) => (
            <div
              key={entry.id}
              className="kt-arena-pop max-w-full truncate rounded-full border border-white/12 bg-slate-950/75 px-3 py-1.5 text-[10px] font-black shadow-lg backdrop-blur"
            >
              <span className={entry.attackerId === userId ? "text-cyan-200" : "text-amber-200"}>
                {entry.attackerId === userId ? "Kamu" : entry.attackerName}
              </span>
              <span className="mx-1.5 text-slate-500">KO</span>
              <span className={entry.targetId === userId ? "text-rose-200" : "text-slate-200"}>
                {entry.targetId === userId ? "Kamu" : entry.targetName}
              </span>
            </div>
          ))}
        </div>
      )}

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
        <section className="kt-question-panel kt-arena-pop absolute inset-x-2 z-30 mx-auto max-w-3xl rounded-[26px] border border-white/15 bg-[#071020]/95 p-3 shadow-[0_22px_65px_rgba(0,0,0,.55)] backdrop-blur-xl sm:inset-x-4 sm:p-4">
          <div className="kt-question-meta mb-2 flex items-center justify-between gap-3">
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
          <h2 className="kt-question-title mt-3 text-sm font-black leading-5 sm:text-base">{question.text}</h2>
          <div className="kt-answer-grid mt-3 grid grid-cols-2 gap-2">
            {question.options.map((option, index) => (
              <button
                key={`${question.id}-${index}`}
                onClick={() => answer(index)}
                disabled={lockedAnswer}
                className="kt-answer rounded-2xl border border-white/12 bg-white/[.07] px-3 py-3 text-left text-xs font-black leading-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 active:scale-[.99] disabled:opacity-50 sm:text-sm"
              >
                <span className="kt-answer-key mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-[10px] text-cyan-200">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>
          {feedback && (
            <div className={`kt-question-feedback mt-2 rounded-xl px-3 py-2 text-center text-xs font-black ${feedback.correct ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
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
        <div className="absolute inset-0 z-50 overflow-y-auto bg-[#020617]/96 p-4 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-300/10 blur-[90px]" />
            <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-[90px]" />
            <div className="absolute bottom-[-200px] right-[-80px] h-[460px] w-[460px] rounded-full bg-violet-500/10 blur-[100px]" />
            {Array.from({ length: 18 }, (_, index) => (
              <span
                key={index}
                className="absolute h-1.5 w-1.5 rounded-full bg-amber-200/70"
                style={{
                  left: `${8 + ((index * 17) % 86)}%`,
                  top: `${6 + ((index * 23) % 72)}%`,
                  transform: `rotate(${index * 29}deg) scale(${0.7 + (index % 4) * 0.18})`,
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto flex min-h-full max-w-3xl items-center justify-center py-6">
            <section className="w-full">
              <div className="text-center">
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-4 py-1.5 text-[10px] font-black tracking-[.22em] text-amber-200">
                  <Sparkles size={13} /> PERTEMPURAN SELESAI
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Juara Arena</h1>
                <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-slate-400 sm:text-sm">
                  Jawaban benar mengisi energimu. KO, kombo, dan akurasi menentukan siapa yang berdiri paling atas.
                </p>
              </div>

              {winner && (
                <div className="kt-arena-pop relative mx-auto mt-6 max-w-md overflow-hidden rounded-[30px] border border-amber-200/25 bg-gradient-to-b from-amber-300/15 via-[#172033] to-[#09101f] p-5 text-center shadow-[0_30px_90px_rgba(0,0,0,.5)]">
                  <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-amber-300/10 blur-3xl" />
                  <div className="relative">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 text-amber-950 shadow-[0_0_32px_rgba(253,224,71,.35)]">
                      <Trophy size={22} fill="currentColor" />
                    </div>
                    <div className="mt-3 flex justify-center">
                      <div className="relative">
                        <ResultAvatar name={winner.playerName} src={winner.avatarUrl} size="lg" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-2.5 py-0.5 text-[9px] font-black tracking-wider text-amber-950">
                          #1
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl font-black">{winner.playerName}</div>
                    <div className="mt-1 text-4xl font-black tracking-tight text-amber-200">{winner.score}</div>
                    <div className="mt-1 text-[10px] font-black tracking-[.18em] text-slate-400">SKOR ARENA</div>
                    <div className="mt-4 flex justify-center gap-2 text-[10px] font-black">
                      <span className="rounded-full bg-rose-400/10 px-3 py-1.5 text-rose-200">{winner.kills} KO</span>
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-emerald-200">{winner.correct} BENAR</span>
                      <span className="rounded-full bg-violet-400/10 px-3 py-1.5 text-violet-200">×{winner.maxStreak} KOMBO</span>
                    </div>
                  </div>
                </div>
              )}

              {podiumRows.length > 1 && (
                <div className="mx-auto mt-4 grid max-w-xl grid-cols-3 items-end gap-2 sm:gap-3">
                  {podiumRows.map((row) => {
                    const isWinner = row.rank === 1;
                    return (
                      <div
                        key={row.playerId}
                        className={`rounded-[22px] border px-2 py-3 text-center sm:px-3 ${
                          isWinner
                            ? "min-h-[142px] border-amber-200/25 bg-amber-300/10"
                            : "min-h-[116px] border-white/10 bg-white/[.05]"
                        }`}
                      >
                        <div className="flex justify-center">
                          <ResultAvatar name={row.playerName} src={row.avatarUrl} size={isWinner ? "md" : "sm"} />
                        </div>
                        <div className={`mt-2 text-xs font-black ${isWinner ? "text-amber-200" : "text-slate-300"}`}>#{row.rank}</div>
                        <div className="mt-0.5 truncate text-xs font-black">{row.playerId === userId ? "Kamu" : row.playerName}</div>
                        <div className="mt-1 text-sm font-black text-cyan-200">{row.score}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {myResult && (
                <div className="mx-auto mt-5 max-w-xl rounded-[26px] border border-cyan-300/20 bg-cyan-300/[.07] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black tracking-[.2em] text-cyan-200/70">HASIL KAMU</div>
                      <div className="mt-0.5 text-xl font-black">Peringkat #{myResult.rank}</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-300/10 px-3 py-2 text-right">
                      <div className="text-[9px] font-black tracking-widest text-emerald-300/70">XP</div>
                      <div className="text-lg font-black text-emerald-200">+{myResult.xpEarned}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[
                      ["KO", myResult.kills],
                      ["BENAR", myResult.correct],
                      ["SALAH", myResult.wrong],
                      ["KOMBO", `×${myResult.maxStreak}`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-950/35 px-2 py-2.5 text-center">
                        <div className="text-base font-black">{value}</div>
                        <div className="mt-0.5 text-[8px] font-black tracking-wider text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rankedResults.length > 3 && (
                <div className="mx-auto mt-4 max-w-xl space-y-1.5">
                  {rankedResults.slice(3).map((row) => (
                    <div
                      key={row.playerId}
                      className={`grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2 ${
                        row.playerId === userId ? "border-cyan-300/25 bg-cyan-300/[.07]" : "border-white/8 bg-white/[.035]"
                      }`}
                    >
                      <div className="text-center text-xs font-black text-slate-500">#{row.rank}</div>
                      <div className="min-w-0 truncate text-xs font-black">{row.playerId === userId ? `${row.playerName} · Kamu` : row.playerName}</div>
                      <div className="text-xs font-black text-cyan-200">{row.score}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mx-auto mt-5 max-w-xl">
                {rematchStatus && (
                  <div className="mb-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-xs font-black">
                      <span className="text-slate-400">REMATCH</span>
                      <span className={rematchStatus.starting ? "text-emerald-200" : "text-cyan-200"}>
                        {rematchStatus.starting
                          ? "Memulai ronde baru..."
                          : `${rematchStatus.readyCount}/${rematchStatus.totalCount} siap · butuh ${rematchStatus.requiredCount}`}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width]"
                        style={{
                          width: `${Math.min(
                            100,
                            (rematchStatus.readyCount / Math.max(1, rematchStatus.requiredCount)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-[1.2fr_.8fr] gap-3">
                <button
                  onClick={requestRematch}
                  disabled={
                    Boolean(rematchStatus?.starting) ||
                    Boolean(rematchStatus?.readyIds.includes(userId))
                  }
                  className="rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 py-4 text-sm font-black text-[#2d0b00] shadow-[0_16px_40px_rgba(251,146,60,.25)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:grayscale disabled:opacity-60"
                >
                  <Swords size={17} className="mr-1.5 inline" />
                  {rematchStatus?.starting
                    ? "MENYIAPKAN..."
                    : rematchStatus?.readyIds.includes(userId)
                      ? "MENUNGGU PEMAIN..."
                      : "MAIN LAGI"}
                </button>
                <button
                  onClick={onExit}
                  className="rounded-2xl border border-white/12 bg-white/[.06] py-4 text-sm font-black text-slate-200"
                >
                  <ArrowLeft size={16} className="mr-1.5 inline" /> Kembali
                </button>
                </div>
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
