"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Crosshair,
  Heart,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import KuisTempurPhaserWorld, {
  type PhaserArenaEntity,
  type PhaserArenaState,
} from "@/components/game/KuisTempurPhaserWorld";
import KuisTempurDisplayShell, {
  KuisTempurDisplayChoice,
  type KuisTempurDisplayMode,
} from "@/components/game/KuisTempurDisplayShell";
import { QUESTION_BANK_EXPANDED, type BankQuestion } from "@/lib/game/question-bank";
import {
  KUIS_TEMPUR_CHARACTERS,
  getKuisTempurCharacter,
  normalizeKuisTempurCharacterId,
  type KuisTempurCharacterId,
} from "@/lib/game/kuis-tempur-characters";
import { kuisTempurAudio } from "@/lib/game/kuis-tempur-audio";
import { setQuiet } from "@/lib/notif-quiet";

const SOLO_DURATION = 180;
const QUESTION_SECONDS = 15;
const MAX_AMMO = 6;
const PLAYER_ID = "solo-player";
const BOT_NAMES = ["Raka", "Sari", "Bima", "Nisa"];
const BOT_CHARACTER_IDS: KuisTempurCharacterId[] = ["bagas", "bu-ratmi", "pak-empu", "pendaki"];
const BOT_SPAWNS = [
  { x: 1020, y: 270 },
  { x: 1080, y: 610 },
  { x: 360, y: 590 },
  { x: 330, y: 260 },
];

type Phase = "select" | "play" | "result";
type QuestionView = {
  id: string;
  prompt: string;
  options: { text: string; correct: boolean }[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function CharacterPortrait({
  characterId,
  hero = false,
}: {
  characterId: string;
  hero?: boolean;
}) {
  const character = getKuisTempurCharacter(characterId);
  const size = hero
    ? "h-[230px] w-[230px] sm:h-[300px] sm:w-[300px]"
    : "h-14 w-14";

  if (character.source === "arga") {
    return (
      <div className={`${size} flex items-center justify-center overflow-hidden rounded-[30%]`}>
        <div
          aria-label={character.name}
          className={hero ? "h-[142%] w-[142%] drop-shadow-[0_30px_40px_rgba(0,0,0,.45)]" : "h-full w-full"}
          style={{
            backgroundImage: "url(/game/rpg/characters/sheet-char-arga-walk-down.png)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "800% 100%",
            backgroundPosition: "0% 0%",
          }}
        />
      </div>
    );
  }

  const frame = character.frame!;
  const runtime = character.source === "runtime-atlas";
  const column = frame.x / frame.width;

  return (
    <div className={`${size} flex items-center justify-center overflow-hidden rounded-[30%]`}>
      <div
        aria-label={character.name}
        className={`${runtime ? "aspect-[3/2]" : "aspect-square"} ${
          hero ? (runtime ? "w-[300%]" : "w-[245%]") : "w-full"
        } max-w-none drop-shadow-[0_30px_40px_rgba(0,0,0,.45)]`}
        style={{
          backgroundImage: `url(${character.atlasUrl})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: runtime ? "400% 500%" : "400% 100%",
          backgroundPosition: `${(column / 3) * 100}% 0%`,
        }}
      />
    </div>
  );
}

function makeQuestion(question: BankQuestion): QuestionView {
  return {
    id: question.soal,
    prompt: question.soal,
    options: question.opsi.map((text, index) => ({
      text,
      correct: index === question.jawaban,
    })),
  };
}

function initialEntities(characterId: KuisTempurCharacterId): PhaserArenaEntity[] {
  const player: PhaserArenaEntity = {
    id: PLAYER_ID,
    name: "Kamu",
    kind: "human",
    characterId,
    x: 700,
    y: 470,
    hp: 100,
    hpMax: 100,
    ammo: 0,
    score: 0,
    kills: 0,
    deaths: 0,
    correct: 0,
    wrong: 0,
    combo: 0,
    alive: true,
    connected: true,
    color: "#22d3ee",
  };

  const bots = BOT_NAMES.map<PhaserArenaEntity>((name, index) => ({
    id: `solo-bot-${index + 1}`,
    name,
    kind: "bot",
    characterId: BOT_CHARACTER_IDS[index],
    x: BOT_SPAWNS[index].x,
    y: BOT_SPAWNS[index].y,
    hp: 70,
    hpMax: 70,
    ammo: 99,
    score: 0,
    kills: 0,
    deaths: 0,
    correct: 0,
    wrong: 0,
    combo: 0,
    alive: true,
    connected: true,
    color: ["#fb7185", "#f59e0b", "#a78bfa", "#34d399"][index],
  }));

  return [player, ...bots];
}

export default function KuisTempurSolo({ backHref = "/arena/game/kuis-tempur" }: { backHref?: string }) {
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedCharacterId, setSelectedCharacterId] = useState<KuisTempurCharacterId>("arga");
  const [arena, setArena] = useState<PhaserArenaState>({
    seq: 1,
    timeLeft: SOLO_DURATION,
    entities: initialEntities("arga"),
  });
  const [question, setQuestion] = useState<QuestionView | null>(null);
  const [questionTime, setQuestionTime] = useState(QUESTION_SECONDS);
  const [lockedAnswer, setLockedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [hitEvent, setHitEvent] = useState<{ seq: number; fromId: string; targetId: string; damage: number } | null>(null);
  const [muted, setMuted] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [finalStats, setFinalStats] = useState({ score: 0, kills: 0, correct: 0, wrong: 0, combo: 0 });
  const [resultReason, setResultReason] = useState<"survive" | "ko">("survive");
  const [displayChoiceOpen, setDisplayChoiceOpen] = useState(false);
  const [preferredDisplayMode, setPreferredDisplayMode] = useState<KuisTempurDisplayMode>("normal");

  const arenaRef = useRef(arena);
  const questionDeckRef = useRef<BankQuestion[]>([]);
  const hitSeqRef = useRef(0);
  const gameSessionIdRef = useRef("");
  const endingRef = useRef(false);
  const finalRushPlayedRef = useRef(false);
  const botAttackTickRef = useRef(0);

  const player = arena.entities.find((entity) => entity.id === PLAYER_ID) || arena.entities[0];
  const level = Math.max(1, 1 + Math.floor((player?.kills || 0) / 3));
  const selectedCharacter = getKuisTempurCharacter(selectedCharacterId);

  useEffect(() => {
    arenaRef.current = arena;
  }, [arena]);

  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? normalizeKuisTempurCharacterId(window.localStorage.getItem("kuis-tempur-character"))
      : "arga";
    setSelectedCharacterId(saved);
    setArena((current) => ({
      ...current,
      entities: initialEntities(saved),
    }));
    setMuted(kuisTempurAudio.isMuted());
  }, []);

  useEffect(() => {
    setQuiet(phase === "play");
    return () => setQuiet(false);
  }, [phase]);

  const chooseCharacter = useCallback((id: KuisTempurCharacterId) => {
    setSelectedCharacterId(id);
    try {
      window.localStorage.setItem("kuis-tempur-character", id);
    } catch {}
    void kuisTempurAudio.unlock();
    kuisTempurAudio.play("countdown");
  }, []);

  const nextQuestion = useCallback(() => {
    if (questionDeckRef.current.length === 0) {
      questionDeckRef.current = [...QUESTION_BANK_EXPANDED].sort(() => Math.random() - 0.5);
    }
    const next = questionDeckRef.current.pop();
    if (!next) return;
    setQuestion(makeQuestion(next));
    setQuestionTime(QUESTION_SECONDS);
    setLockedAnswer(null);
    setFeedback(null);
  }, []);

  const persistXp = useCallback(async (stats: typeof finalStats, survived: boolean) => {
    const score = stats.score + stats.kills * 30 + stats.correct * 8 + (survived ? 80 : 0);
    try {
      const response = await fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          correct: stats.correct,
          wrong: stats.wrong,
          maxStreak: stats.combo,
          gameType: "RIMBA_KATA",
          gameSessionId: gameSessionIdRef.current,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setXpEarned(data?.xpEarned ?? data?.xp ?? score);
    } catch {
      setXpEarned(0);
    }
  }, []);

  const finishGame = useCallback((reason: "survive" | "ko") => {
    if (endingRef.current) return;
    endingRef.current = true;
    const current = arenaRef.current;
    const me = current.entities.find((entity) => entity.id === PLAYER_ID);
    const stats = {
      score: me?.score || 0,
      kills: me?.kills || 0,
      correct: me?.correct || 0,
      wrong: me?.wrong || 0,
      combo: me?.combo || 0,
    };
    setFinalStats(stats);
    setResultReason(reason);
    setPhase("result");
    kuisTempurAudio.play(reason === "survive" ? "victory" : "ko");
    void persistXp(stats, reason === "survive");
  }, [persistXp]);

  const startGame = useCallback(() => {
    void kuisTempurAudio.unlock();
    endingRef.current = false;
    finalRushPlayedRef.current = false;
    botAttackTickRef.current = 0;
    gameSessionIdRef.current = crypto.randomUUID();
    questionDeckRef.current = [...QUESTION_BANK_EXPANDED].sort(() => Math.random() - 0.5);
    setArena({
      seq: 1,
      timeLeft: SOLO_DURATION,
      entities: initialEntities(selectedCharacterId),
    });
    setFeedback(null);
    setHitEvent(null);
    setXpEarned(null);
    setFinalStats({ score: 0, kills: 0, correct: 0, wrong: 0, combo: 0 });
    setResultReason("survive");
    setPhase("play");
    nextQuestion();
    kuisTempurAudio.play("countdown");
  }, [nextQuestion, selectedCharacterId]);

  const chooseDisplayAndStart = useCallback((mode: KuisTempurDisplayMode) => {
    setPreferredDisplayMode(mode);
    setDisplayChoiceOpen(false);
    startGame();
  }, [startGame]);

  const updatePlayer = useCallback((updater: (entity: PhaserArenaEntity) => PhaserArenaEntity) => {
    setArena((current) => ({
      ...current,
      seq: current.seq + 1,
      entities: current.entities.map((entity) => entity.id === PLAYER_ID ? updater(entity) : entity),
    }));
  }, []);

  const registerHit = useCallback((fromId: string, targetId: string, damage: number) => {
    setHitEvent({ seq: ++hitSeqRef.current, fromId, targetId, damage });
  }, []);

  const handleMove = useCallback((position: { x: number; y: number }) => {
    updatePlayer((me) => ({
      ...me,
      x: clamp(position.x, 54, 1346),
      y: clamp(position.y, 76, 794),
    }));
  }, [updatePlayer]);

  const respawnBot = useCallback((botId: string) => {
    window.setTimeout(() => {
      if (endingRef.current) return;
      setArena((current) => {
        const me = current.entities.find((entity) => entity.id === PLAYER_ID);
        const currentLevel = Math.max(1, 1 + Math.floor((me?.kills || 0) / 3));
        const index = Math.max(0, Number(botId.split("-").at(-1) || 1) - 1);
        const hp = 70 + (currentLevel - 1) * 8;
        return {
          ...current,
          seq: current.seq + 1,
          entities: current.entities.map((entity) =>
            entity.id === botId
              ? {
                  ...entity,
                  x: BOT_SPAWNS[index % BOT_SPAWNS.length].x,
                  y: BOT_SPAWNS[index % BOT_SPAWNS.length].y,
                  hp,
                  hpMax: hp,
                  alive: true,
                  respawnIn: undefined,
                }
              : entity
          ),
        };
      });
      kuisTempurAudio.play("respawn");
    }, 1500);
  }, []);

  const handleShoot = useCallback((targetId: string) => {
    const current = arenaRef.current;
    const me = current.entities.find((entity) => entity.id === PLAYER_ID);
    const target = current.entities.find((entity) => entity.id === targetId);
    if (!me?.alive || !target?.alive || me.ammo <= 0) return;

    const distance = Math.hypot(target.x - me.x, target.y - me.y);
    if (distance > 560) {
      setFeedback({ correct: false, text: "Dekati musuh agar tembakan masuk." });
      return;
    }

    const damage = 28 + Math.min(12, level * 2);
    const remaining = Math.max(0, target.hp - damage);
    const ko = remaining <= 0;

    setArena((snapshot) => ({
      ...snapshot,
      seq: snapshot.seq + 1,
      entities: snapshot.entities.map((entity) => {
        if (entity.id === PLAYER_ID) {
          return {
            ...entity,
            ammo: Math.max(0, entity.ammo - 1),
            score: entity.score + (ko ? 240 : 25),
            kills: entity.kills + (ko ? 1 : 0),
          };
        }
        if (entity.id === targetId) {
          return {
            ...entity,
            hp: remaining,
            alive: !ko,
            deaths: entity.deaths + (ko ? 1 : 0),
            respawnIn: ko ? 1.5 : undefined,
          };
        }
        return entity;
      }),
    }));

    registerHit(PLAYER_ID, targetId, damage);
    kuisTempurAudio.play("shot");
    if (ko) {
      kuisTempurAudio.play("ko");
      respawnBot(targetId);
    }
  }, [level, registerHit, respawnBot]);

  const damagePlayer = useCallback((damage: number, fromId: string) => {
    let shouldFinish = false;
    setArena((current) => ({
      ...current,
      seq: current.seq + 1,
      entities: current.entities.map((entity) => {
        if (entity.id !== PLAYER_ID || !entity.alive) return entity;
        const hp = Math.max(0, entity.hp - damage);
        if (hp <= 0) shouldFinish = true;
        return {
          ...entity,
          hp,
          alive: hp > 0,
          deaths: entity.deaths + (hp <= 0 ? 1 : 0),
          combo: hp <= 0 ? 0 : entity.combo,
        };
      }),
    }));
    registerHit(fromId, PLAYER_ID, damage);
    if (shouldFinish) window.setTimeout(() => finishGame("ko"), 260);
  }, [finishGame, registerHit]);

  const answerQuestion = useCallback((index: number) => {
    if (!question || lockedAnswer !== null || phase !== "play") return;
    const option = question.options[index];
    if (!option) return;
    setLockedAnswer(index);

    if (option.correct) {
      updatePlayer((me) => ({
        ...me,
        ammo: Math.min(MAX_AMMO, me.ammo + 1),
        score: me.score + 100 + me.combo * 15,
        correct: me.correct + 1,
        combo: me.combo + 1,
      }));
      setFeedback({ correct: true, text: "Benar! Energi +1" });
      kuisTempurAudio.play("correct");
    } else {
      updatePlayer((me) => ({
        ...me,
        wrong: me.wrong + 1,
        combo: 0,
      }));
      setFeedback({ correct: false, text: "Belum tepat. Tetap bergerak!" });
      kuisTempurAudio.play("wrong");
      const bot = arenaRef.current.entities.find((entity) => entity.kind === "bot" && entity.alive);
      if (bot) damagePlayer(8, bot.id);
    }

    window.setTimeout(nextQuestion, 650);
  }, [damagePlayer, lockedAnswer, nextQuestion, phase, question, updatePlayer]);

  useEffect(() => {
    if (phase !== "play") return;
    const timer = window.setInterval(() => {
      setArena((current) => {
        const next = Math.max(0, current.timeLeft - 1);
        if (next === 30 && !finalRushPlayedRef.current) {
          finalRushPlayedRef.current = true;
          kuisTempurAudio.play("finalRush");
        }
        if (next <= 0) window.setTimeout(() => finishGame("survive"), 0);
        return { ...current, seq: current.seq + 1, timeLeft: next };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishGame, phase]);

  useEffect(() => {
    if (phase !== "play" || lockedAnswer !== null) return;
    if (questionTime <= 0) {
      setLockedAnswer(-1);
      setFeedback({ correct: false, text: "Waktu habis. Soal berikutnya!" });
      updatePlayer((me) => ({ ...me, wrong: me.wrong + 1, combo: 0 }));
      kuisTempurAudio.play("wrong");
      const bot = arenaRef.current.entities.find((entity) => entity.kind === "bot" && entity.alive);
      if (bot) damagePlayer(8, bot.id);
      window.setTimeout(() => {
        if (!endingRef.current) nextQuestion();
      }, 650);
      return;
    }
    const timeout = window.setTimeout(() => setQuestionTime((value) => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [damagePlayer, lockedAnswer, nextQuestion, phase, questionTime, updatePlayer]);

  useEffect(() => {
    if (phase !== "play") return;
    const ai = window.setInterval(() => {
      const current = arenaRef.current;
      const me = current.entities.find((entity) => entity.id === PLAYER_ID);
      if (!me?.alive) return;

      botAttackTickRef.current += 1;
      const attacker = current.entities
        .filter((entity) => entity.kind === "bot" && entity.alive)
        .reduce<PhaserArenaEntity | null>((nearest, entity) => {
          if (!nearest) return entity;
          const nearestDistance = Math.hypot(nearest.x - me.x, nearest.y - me.y);
          const entityDistance = Math.hypot(entity.x - me.x, entity.y - me.y);
          return entityDistance < nearestDistance ? entity : nearest;
        }, null);

      setArena((snapshot) => ({
        ...snapshot,
        seq: snapshot.seq + 1,
        entities: snapshot.entities.map((entity) => {
          if (entity.kind !== "bot" || !entity.alive) return entity;
          const dx = me.x - entity.x;
          const dy = me.y - entity.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const step = distance > 190 ? 28 : 8;
          const jitter = (Math.random() - 0.5) * 22;
          return {
            ...entity,
            x: clamp(entity.x + (dx / distance) * step + jitter, 70, 1330),
            y: clamp(entity.y + (dy / distance) * step + jitter * 0.35, 90, 770),
          };
        }),
      }));

      if (botAttackTickRef.current % 2 === 0 && attacker) {
        const distance = Math.hypot(attacker.x - me.x, attacker.y - me.y);
        if (distance < 470) damagePlayer(6 + Math.min(8, level), attacker.id);
      }
    }, 850);
    return () => window.clearInterval(ai);
  }, [damagePlayer, level, phase]);

  const accuracy = useMemo(() => {
    const total = finalStats.correct + finalStats.wrong;
    return total ? Math.round((finalStats.correct / total) * 100) : 0;
  }, [finalStats]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    kuisTempurAudio.setMuted(next);
    if (!next) void kuisTempurAudio.unlock();
  }, [muted]);

  if (phase === "select") {
    return (
      <main className="fixed inset-0 z-[70] overflow-y-auto bg-[#040914] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(34,211,238,.18),transparent_28%),radial-gradient(circle_at_15%_10%,rgba(99,102,241,.18),transparent_24%),radial-gradient(circle_at_85%_14%,rgba(244,63,94,.18),transparent_24%),linear-gradient(180deg,#07142d,#040914_72%)]" />
        <div className="relative mx-auto min-h-full max-w-6xl px-4 py-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => window.location.assign(backHref)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[.06] px-4 py-2.5 text-sm font-black text-white/85 backdrop-blur transition hover:bg-white/10"
            >
              <ArrowLeft size={17} /> Kembali
            </button>
            <div className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black tracking-[.16em] text-emerald-200">
              MODE LATIHAN · LAWAN BOT
            </div>
          </div>

          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[.045] shadow-[0_30px_90px_rgba(0,0,0,.34)] backdrop-blur">
            <div className="grid min-h-[540px] lg:grid-cols-2">
              <div className="relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_44%,rgba(34,211,238,.19),transparent_32%),linear-gradient(180deg,#0a1730,#06101d)] p-6 text-center">
                <div className="absolute inset-x-12 bottom-20 h-24 rounded-[50%] bg-cyan-300/10 blur-2xl" />
                <div className="relative z-10 w-full text-left">
                  <div className="text-[10px] font-black tracking-[.22em] text-cyan-300">LAWAN BOT</div>
                  <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">Pilih petarungmu.</h1>
                </div>

                <div className="relative mt-3 flex flex-1 items-center justify-center">
                  <div
                    className="absolute inset-10 rounded-full opacity-40 blur-3xl"
                    style={{ backgroundColor: selectedCharacter.accent }}
                  />
                  <CharacterPortrait characterId={selectedCharacterId} hero />
                </div>
                <div className="-mt-4 rounded-full border border-white/10 bg-slate-950/70 px-4 py-1.5 text-[9px] font-black tracking-[.18em] text-cyan-200">
                  PETARUNG TERPILIH
                </div>
                <div className="mt-2 text-4xl font-black tracking-[-.03em]">{selectedCharacter.name}</div>
                <div className="mt-1 text-xs font-black tracking-[.15em] text-slate-400">
                  {selectedCharacter.role.toUpperCase()}
                </div>
              </div>

              <div className="flex flex-col bg-[#050b16]/95 p-5 sm:p-6">
                <div>
                  <div className="text-[10px] font-black tracking-[.2em] text-slate-500">KAMPUNG KATA · SOLO</div>
                  <h2 className="mt-2 text-2xl font-black">Jawab. Isi energi. Tempur.</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                    Bergerak di arena, jawab soal untuk mendapatkan amunisi, lalu dekati dan tembak bot. Tidak ada stat berbayar—semua karakter setara.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-white/8 bg-white/[.04] p-3">
                    <Shield className="mx-auto text-emerald-300" size={20} />
                    <div className="mt-2 text-[9px] font-black text-slate-500">HP</div>
                    <div className="text-sm font-black">100</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[.04] p-3">
                    <Zap className="mx-auto text-amber-300" size={20} />
                    <div className="mt-2 text-[9px] font-black text-slate-500">AMUNISI</div>
                    <div className="text-sm font-black">DARI SOAL</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[.04] p-3">
                    <Crosshair className="mx-auto text-rose-300" size={20} />
                    <div className="mt-2 text-[9px] font-black text-slate-500">WAKTU</div>
                    <div className="text-sm font-black">3 MENIT</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-[9px] font-black tracking-[.16em] text-slate-500">
                    <span>ROSTER KARAKTER</span>
                    <span>9 PILIHAN</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {KUIS_TEMPUR_CHARACTERS.map((character) => {
                      const active = character.id === selectedCharacterId;
                      return (
                        <button
                          key={character.id}
                          onClick={() => chooseCharacter(character.id)}
                          className={`min-w-[86px] rounded-2xl border p-2 text-center transition ${
                            active
                              ? "border-cyan-300/55 bg-cyan-300/12 shadow-[0_0_22px_rgba(34,211,238,.14)]"
                              : "border-white/8 bg-white/[.035] opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="flex justify-center"><CharacterPortrait characterId={character.id} /></div>
                          <div className={`mt-1 truncate text-[9px] font-black ${active ? "text-cyan-100" : "text-slate-500"}`}>
                            {character.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setDisplayChoiceOpen(true)}
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 px-5 py-4 text-base font-black text-[#2c0d00] shadow-[0_16px_38px_rgba(244,63,94,.18)] transition hover:-translate-y-0.5"
                >
                  <Zap size={19} /> MASUK KAMPUNG KATA
                </button>
              </div>
            </div>
          </section>
        </div>
        {displayChoiceOpen && (
          <KuisTempurDisplayChoice
            title="Siap masuk Kampung Kata?"
            onChoose={chooseDisplayAndStart}
          />
        )}
      </main>
    );
  }

  if (phase === "result") {
    return (
      <main className="fixed inset-0 z-[70] overflow-y-auto bg-[#040914] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(245,158,11,.17),transparent_30%),linear-gradient(180deg,#09132a,#040914_70%)]" />
        <div className="relative mx-auto flex min-h-full max-w-3xl items-center justify-center px-4 py-8">
          <section className="w-full rounded-[34px] border border-white/10 bg-white/[.055] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,.38)] backdrop-blur sm:p-8">
            <div className="mx-auto flex w-fit items-center justify-center rounded-[32px] border border-amber-300/15 bg-amber-300/8 p-2">
              <CharacterPortrait characterId={selectedCharacterId} hero />
            </div>
            <div className="-mt-8 text-[10px] font-black tracking-[.2em] text-amber-300">
              {resultReason === "survive" ? "MISI SELESAI" : "PERTEMPURAN SELESAI"}
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              {resultReason === "survive" ? "Kamu bertahan sampai akhir!" : "Bangkit dan coba lagi."}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
              {selectedCharacter.name} mencatat {finalStats.kills} KO dengan akurasi {accuracy}%.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["SKOR", finalStats.score],
                ["KO", finalStats.kills],
                ["BENAR", finalStats.correct],
                ["SALAH", finalStats.wrong],
                ["XP", xpEarned == null ? "…" : `+${xpEarned}`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-white/8 bg-white/[.04] p-4">
                  <div className="text-[9px] font-black tracking-[.15em] text-slate-500">{label}</div>
                  <div className="mt-1 text-2xl font-black">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={startGame}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-4 font-black text-[#2c0d00]"
              >
                <RotateCcw size={18} /> MAIN LAGI
              </button>
              <button
                onClick={() => setPhase("select")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[.06] px-6 py-4 font-black text-white"
              >
                <Trophy size={18} /> GANTI PETARUNG
              </button>
              <Link
                href={backHref}
                className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[.04] px-6 py-4 font-black text-slate-300"
              >
                KEMBALI
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <KuisTempurDisplayShell preferredMode={preferredDisplayMode}>
    <main className="fixed inset-0 z-[70] overflow-hidden bg-[#030712] text-white">
      <div className="absolute inset-0">
        <KuisTempurPhaserWorld
          code="SOLO"
          userId={PLAYER_ID}
          arena={arena}
          feedback={feedback}
          hitEvent={hitEvent}
          onMove={handleMove}
          onShoot={handleShoot}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setPhase("select")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-slate-950/72 text-white shadow-lg backdrop-blur"
              aria-label="Keluar dari latihan"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={toggleMute}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-slate-950/72 text-white shadow-lg backdrop-blur"
              aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-2xl border border-emerald-300/15 bg-slate-950/76 px-3 py-2 shadow-xl backdrop-blur">
              <div className="text-[8px] font-black tracking-[.15em] text-slate-500">HP</div>
              <div className="mt-0.5 flex items-center gap-1 text-sm font-black text-emerald-200">
                <Heart size={13} className="fill-emerald-300" /> {player?.hp || 0}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-300/15 bg-slate-950/76 px-3 py-2 shadow-xl backdrop-blur">
              <div className="text-[8px] font-black tracking-[.15em] text-slate-500">AMUNISI</div>
              <div className="mt-0.5 text-sm font-black text-amber-200">{player?.ammo || 0}/{MAX_AMMO}</div>
            </div>
            <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/76 px-3 py-2 shadow-xl backdrop-blur">
              <div className="text-[8px] font-black tracking-[.15em] text-slate-500">SKOR</div>
              <div className="mt-0.5 text-sm font-black text-cyan-200">{player?.score || 0}</div>
            </div>
            <div className="rounded-2xl border border-violet-300/15 bg-slate-950/76 px-3 py-2 shadow-xl backdrop-blur">
              <div className="text-[8px] font-black tracking-[.15em] text-slate-500">WAKTU</div>
              <div className="mt-0.5 text-sm font-black text-violet-200">
                {Math.floor(arena.timeLeft / 60)}:{String(arena.timeLeft % 60).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[76px] z-20 -translate-x-1/2">
        <div className="rounded-full border border-white/10 bg-slate-950/68 px-4 py-2 text-center shadow-lg backdrop-blur">
          <div className="text-[8px] font-black tracking-[.18em] text-cyan-300">LEVEL {level}</div>
          <div className="text-[10px] font-bold text-slate-300">
            {player?.kills || 0} KO · {player?.combo || 0}× combo
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-height: 520px) and (orientation: landscape) {
          .solo-question-wrap { padding: .35rem .55rem !important; }
          .solo-question-panel { border-radius: 18px !important; padding: .55rem !important; }
          .solo-question-head { margin-bottom: .35rem !important; }
          .solo-question-prompt { font-size: .72rem !important; line-height: 1rem !important; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .solo-question-option { min-height: 38px !important; padding: .35rem .55rem !important; font-size: .68rem !important; }
          .solo-question-option-badge { height: 1.35rem !important; width: 1.35rem !important; border-radius: .45rem !important; font-size: .52rem !important; }
          .solo-question-progress { margin-top: .4rem !important; }
          .solo-question-feedback { margin-top: .25rem !important; font-size: .58rem !important; }
        }
      `}</style>
      <div className="solo-question-wrap pointer-events-none absolute inset-x-0 bottom-0 z-30 p-2 sm:p-4">
        <section className="solo-question-panel pointer-events-auto mx-auto max-w-5xl rounded-[26px] border border-white/12 bg-[#07111f]/94 p-3 shadow-[0_-18px_55px_rgba(0,0,0,.34)] backdrop-blur-xl sm:p-4">
          <div className="solo-question-head mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black tracking-[.18em] text-amber-300">SOAL AMUNISI</div>
              <div className="solo-question-prompt mt-1 text-sm font-black leading-snug text-white sm:text-base">{question?.prompt}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`text-xl font-black ${questionTime <= 5 ? "text-rose-300" : "text-cyan-200"}`}>{questionTime}s</div>
              <div className="text-[8px] font-black tracking-wider text-slate-500">JAWAB CEPAT</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {question?.options.map((option, index) => {
              const revealed = lockedAnswer !== null;
              const chosen = lockedAnswer === index;
              const stateClass = revealed
                ? option.correct
                  ? "border-emerald-300/50 bg-emerald-300/14 text-emerald-50"
                  : chosen
                    ? "border-rose-300/50 bg-rose-300/12 text-rose-50"
                    : "border-white/6 bg-white/[.025] text-slate-500"
                : "border-white/10 bg-white/[.055] text-white hover:border-cyan-300/35 hover:bg-cyan-300/[.07]";
              return (
                <button
                  key={`${question.id}-${index}`}
                  disabled={lockedAnswer !== null}
                  onClick={() => answerQuestion(index)}
                  className={`solo-question-option flex min-h-[52px] items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-black transition active:scale-[.985] sm:text-sm ${stateClass}`}
                >
                  <span className="solo-question-option-badge grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-current/25 bg-black/10 text-[10px]">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="line-clamp-2">{option.text}</span>
                </button>
              );
            })}
          </div>

          <div className="solo-question-progress mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${questionTime <= 5 ? "bg-rose-400" : "bg-cyan-300"}`}
              style={{ width: `${(questionTime / QUESTION_SECONDS) * 100}%` }}
            />
          </div>

          {feedback && (
            <div className={`solo-question-feedback mt-2 flex items-center justify-center gap-2 text-[10px] font-black tracking-wide ${
              feedback.correct ? "text-emerald-300" : "text-rose-300"
            }`}>
              <Sparkles size={13} /> {feedback.text}
            </div>
          )}
        </section>
      </div>
    </main>
    </KuisTempurDisplayShell>
  );
}
