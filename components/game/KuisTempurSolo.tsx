"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock3,
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
import KuisTempurCharacterPortrait from "@/components/game/KuisTempurCharacterPortrait";
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
  KUIS_TEMPUR_PLAYABLE_CHARACTERS,
  getKuisTempurCharacter,
  normalizeKuisTempurCharacterId,
  type KuisTempurCharacterId,
} from "@/lib/game/kuis-tempur-characters";
import { KUIS_TEMPUR_MONSTERS, type KuisTempurMonsterId } from "@/lib/game/kuis-tempur-monsters";
import { kuisTempurAudio } from "@/lib/game/kuis-tempur-audio";
import { setQuiet } from "@/lib/notif-quiet";

const SOLO_DURATION = 180;
const QUESTION_SECONDS = 15;
const MAX_AMMO = 6;
const PLAYER_ID = "solo-player";
const BOT_MONSTER_IDS: KuisTempurMonsterId[] = ["korog", "korog-perang", "golem-batu", "korog-bayangan"];
const BOT_SPAWNS = [
  { x: 900, y: 245 },
  { x: 1130, y: 285 },
  { x: 930, y: 465 },
  { x: 1180, y: 485 },
];

const CHARACTER_COPY: Partial<Record<KuisTempurCharacterId, { quote: string; traitA: string; traitB: string }>> = {
  arga: { quote: "Berani, pantang menyerah, selalu siap belajar.", traitA: "Pantang menyerah", traitB: "Suka tantangan" },
  "ki-jaka": { quote: "Ilmu membuka jalan, kerendahan hati menjaga arah.", traitA: "Bijaksana", traitB: "Tenang di arena" },
  "bu-ratmi": { quote: "Hal kecil yang baik bisa membawa perubahan besar.", traitA: "Penuh semangat", traitB: "Selalu mendukung" },
  "bu-sari": { quote: "Bahasa yang baik melahirkan masa depan yang baik.", traitA: "Cermat", traitB: "Cinta pengetahuan" },
  "eyang-kartala": { quote: "Setiap tempat punya cerita, setiap cerita punya makna.", traitA: "Penuh pengalaman", traitB: "Pemandu cerita" },
  "pak-empu": { quote: "Ketekunan menempa bukan hanya besi, tapi juga diri.", traitA: "Teguh", traitB: "Disiplin" },
};

type Phase = "select" | "play" | "result";
type QuestionView = {
  id: string;
  prompt: string;
  options: { text: string; correct: boolean }[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
    x: 520,
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

  const bots = BOT_MONSTER_IDS.map<PhaserArenaEntity>((monsterId, index) => {
    const monster = KUIS_TEMPUR_MONSTERS.find((entry) => entry.id === monsterId)!;
    return {
    id: `solo-bot-${index + 1}`,
    name: monster.name,
    kind: "bot",
    monsterId,
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
    color: monster.accent,
  };
  });

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
      setFeedback({ correct: true, text: "Benar! Peluru +1" });
      kuisTempurAudio.play("correct");
    } else {
      updatePlayer((me) => ({
        ...me,
        wrong: me.wrong + 1,
        combo: 0,
      }));
      setFeedback({ correct: false, text: "Belum tepat. Tidak mendapat peluru." });
      kuisTempurAudio.play("wrong");
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
      setFeedback({ correct: false, text: "Waktu habis. Tidak mendapat peluru." });
      updatePlayer((me) => ({ ...me, wrong: me.wrong + 1, combo: 0 }));
      kuisTempurAudio.play("wrong");
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
          const botIndex = Math.max(0, Number(entity.id.split("-").at(-1) || 1) - 1);
          const ringAngles = [-1.0, -0.35, 0.35, 1.0];
          const angle = ringAngles[botIndex % ringAngles.length];
          const radius = entity.id === attacker?.id ? 190 : 265;
          const desiredX = clamp(me.x + Math.cos(angle) * radius, 90, 1310);
          const desiredY = clamp(me.y + Math.sin(angle) * radius, 110, 745);
          const dx = desiredX - entity.x;
          const dy = desiredY - entity.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const step = Math.min(distance, entity.id === attacker?.id ? 22 : 16);
          return {
            ...entity,
            x: clamp(entity.x + (dx / distance) * step, 70, 1330),
            y: clamp(entity.y + (dy / distance) * step, 90, 770),
          };
        }),
      }));

      if (botAttackTickRef.current % 2 === 0 && attacker) {
        const distance = Math.hypot(attacker.x - me.x, attacker.y - me.y);
        if (distance < 300) damagePlayer(6 + Math.min(8, level), attacker.id);
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
    const copy = CHARACTER_COPY[selectedCharacterId] || CHARACTER_COPY.arga!;
    return (
      <main className="fixed inset-0 z-[70] overflow-y-auto bg-[#031020] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: "url('/game/kuis-tempur/assets/world/base/arena_base_01.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(2,12,27,.96)_0%,rgba(3,14,29,.86)_44%,rgba(4,10,22,.97)_100%),radial-gradient(circle_at_22%_35%,rgba(14,165,233,.16),transparent_30%),radial-gradient(circle_at_83%_18%,rgba(245,158,11,.14),transparent_28%)]" />

        <div className="relative mx-auto min-h-full max-w-[1480px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              onClick={() => window.location.assign(backHref)}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/45 px-5 py-2.5 text-sm font-black text-white shadow-lg backdrop-blur-xl transition hover:bg-white/10"
            >
              <ArrowLeft size={18} /> Kembali
            </button>
            <div className="rounded-full border border-cyan-200/30 bg-cyan-300/[.09] px-4 py-2 text-[10px] font-black tracking-[.2em] text-cyan-100 backdrop-blur-xl">
              MODE LATIHAN · LAWAN BOT
            </div>
          </div>

          <section className="overflow-hidden rounded-[34px] border border-cyan-100/15 bg-[#061325]/88 shadow-[0_34px_100px_rgba(0,0,0,.48)] backdrop-blur-xl">
            <div className="grid min-h-[600px] lg:grid-cols-[.95fr_1.15fr]">
              <div className="relative flex min-h-[560px] flex-col overflow-hidden border-b border-white/10 px-6 pb-4 pt-5 lg:border-b-0 lg:border-r lg:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_40%,rgba(14,165,233,.18),transparent_30%),linear-gradient(180deg,rgba(5,35,67,.64),rgba(3,13,27,.9))]" />
                <div className="relative z-10 max-w-xl">
                  <div className="text-[11px] font-black tracking-[.26em] text-cyan-300">LAWAN BOT</div>
                  <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl lg:text-6xl">
                    Pilih <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">Petarungmu</span>
                  </h1>
                  <p className="mt-3 max-w-lg text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                    Setiap petarung punya cerita dan gaya sendiri. Semua kekuatan setara—pilih karakter yang paling kamu suka.
                  </p>
                </div>

                <div className="relative z-10 mt-3 flex flex-1 items-end justify-center lg:justify-start">
                  <div
                    className="absolute bottom-14 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-25 blur-[70px] lg:left-[32%]"
                    style={{ backgroundColor: selectedCharacter.accent }}
                  />
                  <KuisTempurCharacterPortrait
                    characterId={selectedCharacterId}
                    hero
                    className="relative z-10 lg:ml-10 lg:scale-[.96]"
                  />

                  <div className="absolute bottom-5 left-1/2 z-20 w-[min(92%,430px)] -translate-x-1/2 rounded-[26px] border border-white/12 bg-[#06101d]/82 p-4 shadow-2xl backdrop-blur-xl lg:left-auto lg:right-2 lg:w-[280px] lg:translate-x-0">
                    <div className="text-3xl font-black tracking-tight">{selectedCharacter.name}</div>
                    <div className="mt-0.5 text-sm font-black text-amber-300">{selectedCharacter.role}</div>
                    <p className="mt-2 text-xs font-semibold italic leading-5 text-slate-300">“{copy.quote}”</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.06] px-3 py-2 text-[10px] font-black text-amber-100">{copy.traitA}</div>
                      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] px-3 py-2 text-[10px] font-black text-cyan-100">{copy.traitB}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col bg-[#040b16]/94 p-5 sm:p-6 lg:p-7">
                <div className="rounded-[26px] border border-white/10 bg-white/[.035] p-5">
                  <div className="text-[10px] font-black tracking-[.2em] text-slate-500">KAMPUNG KATA · SOLO</div>
                  <h2 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">Jawab. Dapat amunisi. Tempur.</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                    Jawaban benar memberi peluru. Bergerak di arena, pilih monster, lalu serang. Tidak ada stat berbayar—semua petarung setara.
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/45 p-3 text-center">
                      <Heart className="mx-auto text-emerald-300" size={24} fill="currentColor" />
                      <div className="mt-2 text-[9px] font-black tracking-[.16em] text-slate-500">HP</div>
                      <div className="text-lg font-black">100</div>
                    </div>
                    <div className="rounded-2xl border border-amber-300/20 bg-slate-950/45 p-3 text-center">
                      <Zap className="mx-auto text-amber-300" size={24} fill="currentColor" />
                      <div className="mt-2 text-[9px] font-black tracking-[.16em] text-slate-500">AMUNISI</div>
                      <div className="text-sm font-black">DARI SOAL</div>
                    </div>
                    <div className="rounded-2xl border border-rose-300/20 bg-slate-950/45 p-3 text-center">
                      <Clock3 className="mx-auto text-rose-300" size={24} />
                      <div className="mt-2 text-[9px] font-black tracking-[.16em] text-slate-500">WAKTU</div>
                      <div className="text-sm font-black">3 MENIT</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="text-[10px] font-black tracking-[.2em] text-slate-500">PILIH KARAKTER</div>
                  <div className="text-[10px] font-black tracking-[.16em] text-cyan-300">{KUIS_TEMPUR_PLAYABLE_CHARACTERS.length} KARAKTER</div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                  {KUIS_TEMPUR_PLAYABLE_CHARACTERS.map((character) => {
                    const active = character.id === selectedCharacterId;
                    return (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => chooseCharacter(character.id)}
                        className={`group overflow-hidden rounded-2xl border p-1.5 text-center transition ${
                          active
                            ? "border-amber-300/80 bg-amber-300/[.12] shadow-[0_0_0_2px_rgba(251,191,36,.12),0_12px_28px_rgba(245,158,11,.14)]"
                            : "border-white/10 bg-white/[.035] hover:border-cyan-200/30 hover:bg-white/[.07]"
                        }`}
                      >
                        <div className="relative flex h-[92px] items-end justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_70%,rgba(56,189,248,.16),transparent_45%),linear-gradient(180deg,rgba(30,41,59,.6),rgba(2,6,23,.45))]">
                          <KuisTempurCharacterPortrait characterId={character.id} compact className="scale-[1.28] origin-bottom" />
                        </div>
                        <div className="mt-1.5 truncate text-[10px] font-black text-white">{character.name}</div>
                        <div className={`truncate text-[8px] font-bold ${active ? "text-amber-300" : "text-slate-500"}`}>{character.role}</div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setDisplayChoiceOpen(true)}
                  className="mt-auto flex w-full items-center justify-center gap-3 rounded-[22px] bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 px-5 py-4 text-base font-black text-[#2d1000] shadow-[0_18px_44px_rgba(244,63,94,.22)] transition hover:-translate-y-0.5 sm:text-lg"
                >
                  <Crosshair size={21} /> MASUK KAMPUNG KATA
                </button>
              </div>
            </div>
          </section>
        </div>

        {displayChoiceOpen && (
          <KuisTempurDisplayChoice
            title="Pilih tampilan sebelum bertempur"
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
              <KuisTempurCharacterPortrait characterId={selectedCharacterId} hero />
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
        <div className="mx-auto flex max-w-[1500px] items-start justify-between gap-3">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setPhase("select")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-slate-950/72 px-4 text-sm font-black text-white shadow-lg backdrop-blur-xl"
              aria-label="Kembali ke pemilihan petarung"
            >
              <ArrowLeft size={18} /> <span className="hidden sm:inline">Kembali</span>
            </button>
            <button
              onClick={toggleMute}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/72 text-white shadow-lg backdrop-blur-xl"
              aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/78 px-3 py-2 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-1.5">
                <Heart size={15} className="fill-emerald-300 text-emerald-300" />
                <div>
                  <div className="text-[7px] font-black tracking-[.16em] text-slate-500">HP</div>
                  <div className="text-sm font-black text-white">{player?.hp || 0}</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-slate-950/78 px-3 py-2 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-1.5">
                <Zap size={15} className="fill-amber-300 text-amber-300" />
                <div>
                  <div className="text-[7px] font-black tracking-[.16em] text-slate-500">AMUNISI</div>
                  <div className="text-sm font-black text-white">{player?.ammo || 0}/{MAX_AMMO}</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/78 px-3 py-2 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-300" />
                <div>
                  <div className="text-[7px] font-black tracking-[.16em] text-slate-500">SKOR</div>
                  <div className="text-sm font-black text-white">{player?.score || 0}</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-rose-300/20 bg-slate-950/78 px-3 py-2 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-1.5">
                <Clock3 size={15} className="text-rose-300" />
                <div>
                  <div className="text-[7px] font-black tracking-[.16em] text-slate-500">WAKTU</div>
                  <div className="text-sm font-black text-white">
                    {Math.floor(arena.timeLeft / 60)}:{String(arena.timeLeft % 60).padStart(2, "0")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center gap-2 sm:top-4">
        <div className="rounded-[18px] border border-amber-300/30 bg-slate-950/78 px-7 py-2 text-center shadow-xl backdrop-blur-xl">
          <div className="text-[9px] font-black tracking-[.22em] text-amber-300">LEVEL {level}</div>
          <div className="text-[10px] font-bold text-slate-300">{player?.kills || 0} KO · {player?.combo || 0}× combo</div>
        </div>
        <div className="rounded-full border border-white/12 bg-slate-950/70 px-4 py-1.5 text-[10px] font-black text-white shadow-lg backdrop-blur-xl">
          💡 Jawab untuk dapat amunisi!
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
        <section className="solo-question-panel pointer-events-auto mx-auto max-w-[1280px] rounded-[28px] border border-cyan-100/30 bg-[linear-gradient(115deg,rgba(8,68,79,.88),rgba(144,102,16,.76),rgba(8,35,50,.9))] p-3 shadow-[0_-18px_55px_rgba(0,0,0,.34)] backdrop-blur-xl sm:p-4">
          <div className="solo-question-head mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black tracking-[.18em] text-amber-300">SOAL AMUNISI</div>
              <div className="solo-question-prompt mt-1 text-sm font-black leading-snug text-white sm:text-base">{question?.prompt}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`flex items-center justify-end gap-1 text-xl font-black ${questionTime <= 5 ? "text-rose-300" : "text-amber-200"}`}>
                <Clock3 size={17} /> {questionTime}s
              </div>
              <div className="text-[8px] font-black tracking-wider text-white/50">JAWAB CEPAT</div>
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
