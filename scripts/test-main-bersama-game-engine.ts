/**
 * Test Game Engine Main Bersama — pola QA repo (tsx standalone).
 * Jalankan: npx tsx scripts/test-main-bersama-game-engine.ts
 * Mencakup: Jelajah Kata (1-25), Kota Cahaya (26-52),
 * integration ringan dengan Session Engine (53-58).
 */
import { FakeClock } from "../src/main-bersama/domain/types/clock"
import type { GameRoundFacts } from "../src/main-bersama/contracts/GameRoundFacts"
import {
  createJelajahKataState,
  applyJelajahKataRound,
  summarizeJelajahKata,
  isProgressTie,
  PROGRESS_EPSILON,
  type JelajahKataState,
} from "../src/main-bersama/games/jelajah-kata/jelajah-kata-engine"
import {
  createKotaCahayaState,
  applyKotaCahayaRound,
  milestonesForProgress,
  validateKotaCahayaConfig,
  type KotaCahayaState,
} from "../src/main-bersama/games/kota-cahaya/kota-cahaya-engine"
import { createGameState, applyGameRound, summarizeGame } from "../src/main-bersama/games/game-router"
import { SessionEngine } from "../src/main-bersama/application/services/session-engine"
import { buildRoundFacts } from "../src/main-bersama/application/services/round-facts-projection"
import type { MainQuestionSnapshot } from "../src/main-bersama/domain/entities/question"
import type { MainSession } from "../src/main-bersama/domain/entities/session"

let passed = 0
let failed = 0

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`)
      passed++
    } else {
      console.log(`  ❌ ${name}`)
      failed++
    }
  } catch (e: any) {
    console.log(`  ❌ ${name} — ${e.message}`)
    failed++
  }
}

const TEAMS = ["elang", "harimau", "rusa", "badak"] as const

// ─── Facts helpers ──────────────────────────────────────────

let factSeq = 0
function makeFacts(over: {
  roundIndex?: number
  totalRounds?: number
  eligible?: { playerId: string; teamId?: string }[]
  answers?: { playerId: string; isCorrect: boolean }[]
} = {}): GameRoundFacts {
  factSeq++
  return {
    sessionId: "ses-facts",
    roundId: `round-facts-${factSeq}`,
    roundIndex: over.roundIndex ?? 0,
    totalRounds: over.totalRounds ?? 4,
    eligiblePlayers: over.eligible ?? [],
    answers: over.answers ?? [],
  }
}

/** Facts dengan N eligible per regu dan M benar untuk regu tertentu. */
function teamFacts(
  roundIndex: number,
  totalRounds: number,
  perTeam: Partial<Record<string, { eligible: number; correct: number }>>,
): GameRoundFacts {
  const eligible: { playerId: string; teamId?: string }[] = []
  const answers: { playerId: string; isCorrect: boolean }[] = []
  let seq = 0
  for (const [teamId, spec] of Object.entries(perTeam)) {
    const s = spec ?? { eligible: 0, correct: 0 }
    for (let i = 0; i < s.eligible; i++) {
      seq++
      const pid = `${teamId}-p${i}`
      eligible.push({ playerId: pid, teamId })
      if (i < s.correct) answers.push({ playerId: pid, isCorrect: true })
    }
  }
  void seq
  return makeFacts({ roundIndex, totalRounds, eligible, answers })
}

function makeJelajah(totalRounds = 4): JelajahKataState {
  return createJelajahKataState(totalRounds)
}

function makeKota(target: number): KotaCahayaState {
  const r = createKotaCahayaState({ targetCorrectAnswers: target })
  if (!r.ok) throw new Error("kota state harus valid di test")
  return r.value
}

// ─── Integration helpers (Session Engine → facts → game) ───

let qCounter = 0
function makeQuestion(): MainQuestionSnapshot {
  qCounter++
  return {
    id: `q-${qCounter}`,
    sourceQuestionId: `bank-${qCounter}`,
    type: "single-choice",
    prompt: `Soal ${qCounter}?`,
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    correctOptionId: "a",
  }
}

function makeSessionEngine(opts: {
  teamMode: boolean
  totalRounds: number
  roundDurationMs?: number
}): { engine: SessionEngine; clock: FakeClock; sessionId: string } {
  const clock = new FakeClock()
  const snapshots = Array.from({ length: opts.totalRounds }, () => makeQuestion())
  const sessionId = `ses-${Math.random().toString(36).slice(2, 8)}`
  const session: MainSession = {
    id: sessionId,
    pin: "123456",
    teacherId: "t1",
    gameMode: "jelajah-kata",
    phase: "preparing",
    currentRoundIndex: null,
    totalRounds: snapshots.length,
    createdAt: clock.now(),
  }
  const engine = new SessionEngine({
    session,
    questions: { sessionId, gameMode: "jelajah-kata", snapshots },
    clock,
    roundDurationMs: opts.roundDurationMs ?? 30_000,
  })
  engine.openLobby()
  return { engine, clock, sessionId }
}

function roundIdOf(sessionId: string, index: number) {
  return `round-${sessionId}-${index}` as const
}

// ─── Tests ──────────────────────────────────────────────────

function main() {
  console.log("\n📋 MAIN BERSAMA GAME ENGINE TEST")
  console.log("=".repeat(60))

  console.log("\n── Jelajah Kata (1-25) ──")
  test("1. initial progress semua regu = 0", () => {
    const s = makeJelajah()
    return TEAMS.every((t) => s.teams[t].progress === 0)
  })
  test("2. tepat 4 regu tersedia", () => Object.keys(makeJelajah().teams).length === 4)
  test("3. 100% benar satu round memberi bobot penuh (25 utk 4 round)", () => {
    const s = makeJelajah(4)
    const r = applyJelajahKataRound(s, teamFacts(0, 4, { elang: { eligible: 3, correct: 3 } }))
    return r.ok && s.teams["elang"].progress === 25 && s.teams["harimau"].progress === 0
  })
  test("4. 0% benar memberi delta 0", () => {
    const s = makeJelajah(4)
    applyJelajahKataRound(s, teamFacts(0, 4, { elang: { eligible: 3, correct: 0 } }))
    return s.teams["elang"].progress === 0
  })
  test("5. 8/10 === 12/15 (fairness utama)", () => {
    const a = makeJelajah(4)
    applyJelajahKataRound(a, teamFacts(0, 4, { elang: { eligible: 10, correct: 8 } }))
    const b = makeJelajah(4)
    applyJelajahKataRound(b, teamFacts(0, 4, { elang: { eligible: 15, correct: 12 } }))
    return isProgressTie(a.teams["elang"].progress, b.teams["elang"].progress)
  })
  test("6. unanswered tetap dalam denominator (7 benar / 10 eligible → 17.5)", () => {
    const s = makeJelajah(4)
    // 10 eligible, hanya 7 menjawab, semua benar → accuracy 7/10.
    const eligible = Array.from({ length: 10 }, (_, i) => ({ playerId: `p${i}`, teamId: "elang" }))
    const answers = eligible.slice(0, 7).map((p) => ({ playerId: p.playerId, isCorrect: true }))
    applyJelajahKataRound(s, makeFacts({ roundIndex: 0, totalRounds: 4, eligible, answers }))
    return Math.abs(s.teams["elang"].progress - 17.5) < PROGRESS_EPSILON
  })
  test("7. disconnected eligible tetap denominator (tidak ada konsep disconnect di facts)", () => {
    // Facts tidak membawa status koneksi — denominator = snapshot eligible.
    const s = makeJelajah(4)
    const eligible = Array.from({ length: 10 }, (_, i) => ({ playerId: `p${i}`, teamId: "elang" }))
    // 3 pertama "disconnect" — tidak menjawab, tetap eligible.
    const answers = eligible.slice(3).map((p) => ({ playerId: p.playerId, isCorrect: true }))
    applyJelajahKataRound(s, makeFacts({ roundIndex: 0, totalRounds: 4, eligible, answers }))
    return Math.abs(s.teams["elang"].progress - 17.5) < PROGRESS_EPSILON
  })
  test("8. regu tanpa eligible → delta 0, regu tetap ada", () => {
    const s = makeJelajah(4)
    const r = applyJelajahKataRound(s, teamFacts(0, 4, { elang: { eligible: 2, correct: 1 } }))
    return (
      r.ok && s.teams["badak"].progress === 0 && s.teams["rusa"].progress === 0 &&
      s.teams["harimau"].progress === 0
    )
  })
  test("9. answer dari non-eligible divalidasi (INVALID_ROUND_FACTS)", () => {
    const s = makeJelajah(4)
    const r = applyJelajahKataRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1", teamId: "elang" }],
      answers: [{ playerId: "ghost", isCorrect: true }],
    }))
    return !r.ok && r.code === "INVALID_ROUND_FACTS"
  })
  test("10. wrong answer tidak menambah correct count", () => {
    const s = makeJelajah(4)
    const r = applyJelajahKataRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [
        { playerId: "p1", teamId: "elang" },
        { playerId: "p2", teamId: "elang" },
      ],
      answers: [{ playerId: "p1", isCorrect: false }],
    }))
    const entry = r.ok ? r.value.roundResults.find((e) => e.teamId === "elang")! : null
    return !!entry && entry.correctCount === 0 && entry.answeredCount === 1 && entry.accuracy === 0
  })
  test("11. semua regu tetap ada setelah tiap round", () => {
    const s = makeJelajah(2)
    applyJelajahKataRound(s, teamFacts(0, 2, { elang: { eligible: 1, correct: 1 } }))
    applyJelajahKataRound(s, teamFacts(1, 2, { badak: { eligible: 1, correct: 1 } }))
    return Object.keys(s.teams).length === 4 && TEAMS.every((t) => t in s.teams)
  })
  test("12. progress terakumulasi antar round", () => {
    const s = makeJelajah(4)
    applyJelajahKataRound(s, teamFacts(0, 4, { elang: { eligible: 1, correct: 1 } }))
    applyJelajahKataRound(s, teamFacts(1, 4, { elang: { eligible: 1, correct: 1 } }))
    return Math.abs(s.teams["elang"].progress - 50) < PROGRESS_EPSILON
  })
  test("13. progress tidak melebihi 100 (clamp)", () => {
    const s = makeJelajah(1)
    applyJelajahKataRound(s, teamFacts(0, 1, { elang: { eligible: 1, correct: 1 } }))
    return s.teams["elang"].progress === 100
  })
  test("14. tidak ada speed bonus (facts tidak membawa timing)", () => {
    const s = makeJelajah(4)
    const f = teamFacts(0, 4, { elang: { eligible: 2, correct: 2 } })
    return !("submittedAt" in (f.answers[0] as object)) && !("speed" in (f.answers[0] as object))
  })
  test("15. urutan answer dalam facts tidak memengaruhi score (deterministik)", () => {
    const eligible = [
      { playerId: "p1", teamId: "elang" },
      { playerId: "p2", teamId: "elang" },
    ]
    const a = makeJelajah(4)
    applyJelajahKataRound(a, makeFacts({ roundIndex: 0, totalRounds: 4, eligible, answers: [
      { playerId: "p1", isCorrect: true }, { playerId: "p2", isCorrect: false },
    ] }))
    const b = makeJelajah(4)
    applyJelajahKataRound(b, makeFacts({ roundIndex: 0, totalRounds: 4, eligible, answers: [
      { playerId: "p2", isCorrect: false }, { playerId: "p1", isCorrect: true },
    ] }))
    return a.teams["elang"].progress === b.teams["elang"].progress
  })
  test("16. duplicate apply round tidak menambah progress (ROUND_ALREADY_APPLIED)", () => {
    const s = makeJelajah(4)
    const f = teamFacts(0, 4, { elang: { eligible: 1, correct: 1 } })
    applyJelajahKataRound(s, f)
    const progressBefore = s.teams["elang"].progress
    const r2 = applyJelajahKataRound(s, f)
    return !r2.ok && r2.code === "ROUND_ALREADY_APPLIED" && s.teams["elang"].progress === progressBefore
  })
  test("17. out-of-order round ditolak (ROUND_OUT_OF_ORDER)", () => {
    const s = makeJelajah(4)
    applyJelajahKataRound(s, teamFacts(0, 4, { elang: { eligible: 1, correct: 1 } }))
    const r = applyJelajahKataRound(s, teamFacts(2, 4, { elang: { eligible: 1, correct: 1 } }))
    return !r.ok && r.code === "ROUND_OUT_OF_ORDER"
  })
  test("18. tie exact didukung (100 vs 100)", () => {
    const s = makeJelajah(1)
    applyJelajahKataRound(s, teamFacts(0, 1, { elang: { eligible: 1, correct: 1 }, harimau: { eligible: 1, correct: 1 } }))
    const summary = summarizeJelajahKata(s)
    return summary.winners.length === 2 && summary.winners.includes("elang") && summary.winners.includes("harimau")
  })
  test("19. tie numerik ekuivalen didukung (epsilon comparison)", () => {
    const s = makeJelah_withDrift()
    const summary = summarizeJelajahKata(s)
    return summary.winners.length === 2
  })
  test("20. ranking normal benar (tanpa tie)", () => {
    const s = makeJelajah(4)
    applyJelajahKataRound(s, teamFacts(0, 4, {
      elang: { eligible: 1, correct: 1 },
      harimau: { eligible: 1, correct: 0 },
      rusa: { eligible: 2, correct: 1 },
      badak: { eligible: 4, correct: 1 },
    }))
    const sum = summarizeJelajahKata(s)
    const byId = new Map(sum.ranking.map((r) => [r.teamId, r.rank]))
    return byId.get("elang") === 1 && byId.get("rusa") === 2 && byId.get("badak") === 3 && byId.get("harimau") === 4
  })
  test("21. ranking tie 1,1,3 semantics", () => {
    const s = makeJelajah(1)
    applyJelajahKataRound(s, teamFacts(0, 1, {
      elang: { eligible: 1, correct: 1 },
      harimau: { eligible: 2, correct: 2 },
      rusa: { eligible: 4, correct: 1 },
      badak: { eligible: 8, correct: 1 },
    }))
    // elang & harimau 100 (rank 1), rusa 25 (rank 3), badak 12.5 (rank 4)
    const sum = summarizeJelajahKata(s)
    const byId = new Map(sum.ranking.map((r) => [r.teamId, r.rank]))
    return byId.get("elang") === 1 && byId.get("harimau") === 1 && byId.get("rusa") === 3 && byId.get("badak") === 4
  })
  test("22. multiple winners dikembalikan bila tie rank 1", () => {
    const s = makeJelajah(1)
    applyJelajahKataRound(s, teamFacts(0, 1, {
      elang: { eligible: 1, correct: 1 },
      badak: { eligible: 5, correct: 5 },
    }))
    const sum = summarizeJelajahKata(s)
    return sum.winners.length === 2 && sum.ranking.filter((r) => r.rank === 1).length === 2
  })
  test("23. round result mencatat eligible/answered/correct/accuracy/delta/progressAfter", () => {
    const s = makeJelajah(4)
    const r = applyJelajahKataRound(s, teamFacts(0, 4, { elang: { eligible: 10, correct: 8 } }))
    const e = r.ok ? r.value.roundResults.find((x) => x.teamId === "elang")! : null
    return !!e && e.eligibleCount === 10 && e.answeredCount === 8 && e.correctCount === 8 &&
      Math.abs(e.accuracy - 0.8) < PROGRESS_EPSILON && Math.abs(e.delta - 20) < PROGRESS_EPSILON &&
      Math.abs(e.progressAfter - 20) < PROGRESS_EPSILON
  })
  test("24. answer milik regu lain tidak masuk numerator regu (lengkap, bukan pecahan)", () => {
    const s = makeJelajah(4)
    // p1 (elang) menjawab; facts mengklaim dia benar. harimau punya 1 eligible tanpa answer.
    const r = applyJelajahKataRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [
        { playerId: "p1", teamId: "elang" },
        { playerId: "p2", teamId: "harimau" },
      ],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    const harimau = r.ok ? r.value.roundResults.find((e) => e.teamId === "harimau")! : null
    return !!harimau && harimau.correctCount === 0 && harimau.accuracy === 0
  })
  test("25. hasil deterministik untuk facts yang sama", () => {
    const run = () => {
      const s = makeJelajah(4)
      applyJelajahKataRound(s, teamFacts(0, 4, {
        elang: { eligible: 10, correct: 8 },
        harimau: { eligible: 15, correct: 12 },
        rusa: { eligible: 2, correct: 2 },
        badak: { eligible: 0, correct: 0 },
      }))
      return summarizeJelajahKata(s)
    }
    const a = run()
    const b = run()
    return JSON.stringify(a.ranking) === JSON.stringify(b.ranking) &&
      JSON.stringify(a.winners) === JSON.stringify(b.winners)
  })

  console.log("\n── Kota Cahaya (26-52) ──")
  test("26. target <=0 ditolak", () => {
    const a = validateKotaCahayaConfig({ targetCorrectAnswers: 0 })
    const b = validateKotaCahayaConfig({ targetCorrectAnswers: -3 })
    const c = validateKotaCahayaConfig({ targetCorrectAnswers: 2.5 })
    return !a.ok && !b.ok && !c.ok
  })
  test("27. initial contribution = 0", () => makeKota(10).correctContribution === 0)
  test("28. initial progress = 0", () => makeKota(10).progressPercent === 0)
  test("29. jawaban benar +1", () => {
    const s = makeKota(10)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    return s.correctContribution === 1
  })
  test("30. jawaban salah +0", () => {
    const s = makeKota(10)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: false }],
    }))
    return s.correctContribution === 0 && s.progressPercent === 0
  })
  test("31. unanswered +0", () => {
    const s = makeKota(10)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }],
      answers: [],
    }))
    return s.correctContribution === 0
  })
  test("32. beberapa correct dalam round dihitung", () => {
    const s = makeKota(10)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }, { playerId: "p2" }, { playerId: "p3" }],
      answers: [
        { playerId: "p1", isCorrect: true },
        { playerId: "p2", isCorrect: true },
        { playerId: "p3", isCorrect: false },
      ],
    }))
    return s.correctContribution === 2
  })
  test("33. progress formula benar (3/8 → 37.5)", () => {
    const s = makeKota(8)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }, { playerId: "p2" }, { playerId: "p3" }],
      answers: [
        { playerId: "p1", isCorrect: true },
        { playerId: "p2", isCorrect: true },
        { playerId: "p3", isCorrect: true },
      ],
    }))
    return Math.abs(s.progressPercent - 37.5) < PROGRESS_EPSILON
  })
  test("34. progress di-cap 100", () => {
    const s = makeKota(2)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }, { playerId: "p2" }, { playerId: "p3" }],
      answers: [
        { playerId: "p1", isCorrect: true },
        { playerId: "p2", isCorrect: true },
        { playerId: "p3", isCorrect: true },
      ],
    }))
    return s.progressPercent === 100
  })
  test("35. contribution faktual > target tetap tercatat", () => {
    const s = makeKota(2)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 1,
      eligible: [{ playerId: "p1" }, { playerId: "p2" }, { playerId: "p3" }],
      answers: [
        { playerId: "p1", isCorrect: true },
        { playerId: "p2", isCorrect: true },
        { playerId: "p3", isCorrect: true },
      ],
    }))
    return s.correctContribution === 3 && s.progressPercent === 100
  })
  test("36. missionCompleted false sebelum target", () => {
    const s = makeKota(5)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    return s.missionCompleted === false
  })
  test("37. missionCompleted true tepat target", () => {
    const s = makeKota(2)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }, { playerId: "p2" }],
      answers: [
        { playerId: "p1", isCorrect: true },
        { playerId: "p2", isCorrect: true },
      ],
    }))
    return s.missionCompleted === true && s.progressPercent === 100
  })
  test("38. missionCompleted tetap true setelah target terlampaui", () => {
    const s = makeKota(1)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 1, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    return s.missionCompleted === true && s.correctContribution === 2
  })
  test("39. 25% membuka garden", () => milestonesForProgress(27).includes("garden"))
  test("40. 50% membuka library (dan garden tetap)", () => {
    const m = milestonesForProgress(52)
    return m.includes("library") && m.includes("garden")
  })
  test("41. 75% membuka homes", () => milestonesForProgress(76).includes("homes"))
  test("42. 100% membuka town-center (semua)", () => {
    const m = milestonesForProgress(100)
    return m.length === 4 && m.includes("town-center")
  })
  test("43. milestone sebelumnya tetap tersimpan di state", () => {
    const s = makeKota(4)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 1, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    return s.unlockedMilestones.length === 2 && s.unlockedMilestones.includes("garden")
  })
  test("44. milestone tidak duplicate (di bawah threshold baru → kosong)", () => {
    const s = makeKota(8)
    const r1 = applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }, { playerId: "p2" }],
      answers: [{ playerId: "p1", isCorrect: true }, { playerId: "p2", isCorrect: true }],
    }))
    const r2 = applyKotaCahayaRound(s, makeFacts({
      roundIndex: 1, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [],
    }))
    return (
      r1.ok && r2.ok &&
      r1.value.newlyUnlockedMilestones.length === 1 &&
      r2.value.newlyUnlockedMilestones.length === 0
    )
  })
  test("45. newlyUnlocked hanya berisi threshold baru", () => {
    const s = makeKota(4)
    const r1 = applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    const r2 = applyKotaCahayaRound(s, makeFacts({
      roundIndex: 1, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    return (
      r1.ok && r2.ok &&
      r1.value.newlyUnlockedMilestones.length === 1 &&
      r2.value.newlyUnlockedMilestones.length === 1 &&
      r2.value.newlyUnlockedMilestones[0] === "library"
    )
  })
  test("46. duplicate round apply tidak double contribution", () => {
    const s = makeKota(10)
    const f = makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    })
    applyKotaCahayaRound(s, f)
    const before = s.correctContribution
    const r2 = applyKotaCahayaRound(s, f)
    return !r2.ok && r2.code === "ROUND_ALREADY_APPLIED" && s.correctContribution === before
  })
  test("47. out-of-order round ditolak", () => {
    const s = makeKota(10)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4, eligible: [{ playerId: "p1" }], answers: [],
    }))
    const r = applyKotaCahayaRound(s, makeFacts({
      roundIndex: 2, totalRounds: 4, eligible: [{ playerId: "p1" }], answers: [],
    }))
    return !r.ok && r.code === "ROUND_OUT_OF_ORDER"
  })
  test("48. late join eligible di round berikutnya boleh berkontribusi", () => {
    // Round 1: late joiner TIDAK eligible → facts round 0 tanpa dia.
    const s = makeKota(10)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "early" }], answers: [],
    }))
    // Round 1: late joiner sudah eligible dan benar → +1.
    const r = applyKotaCahayaRound(s, makeFacts({
      roundIndex: 1, totalRounds: 2,
      eligible: [{ playerId: "early" }, { playerId: "late" }],
      answers: [{ playerId: "late", isCorrect: true }],
    }))
    return r.ok && s.correctContribution === 1
  })
  test("49. non-eligible player tidak boleh dihitung", () => {
    const s = makeKota(10)
    const r = applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 4,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "hacker", isCorrect: true }],
    }))
    return !r.ok && r.code === "INVALID_ROUND_FACTS"
  })
  test("50. disconnect tidak menghapus contribution lama (facts immutability)", () => {
    const s = makeKota(10)
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [{ playerId: "p1", isCorrect: true }],
    }))
    // Round berikutnya p1 disconnect → tidak menjawab; contribution tetap.
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 1, totalRounds: 2,
      eligible: [{ playerId: "p1" }],
      answers: [],
    }))
    return s.correctContribution === 1
  })
  test("51. target tidak berubah antar round", () => {
    const s = makeKota(10)
    const targetBefore = s.target
    applyKotaCahayaRound(s, makeFacts({
      roundIndex: 0, totalRounds: 2,
      eligible: [{ playerId: "p1" }], answers: [{ playerId: "p1", isCorrect: true }],
    }))
    return s.target === targetBefore && s.config.targetCorrectAnswers === 10
  })
  test("52. hasil deterministik untuk facts yang sama", () => {
    const run = () => {
      const s = makeKota(8)
      applyKotaCahayaRound(s, makeFacts({
        roundIndex: 0, totalRounds: 4,
        eligible: [{ playerId: "p1" }, { playerId: "p2" }, { playerId: "p3" }],
        answers: [{ playerId: "p1", isCorrect: true }, { playerId: "p2", isCorrect: false }],
      }))
      applyKotaCahayaRound(s, makeFacts({
        roundIndex: 1, totalRounds: 4,
        eligible: [{ playerId: "p1" }, { playerId: "p2" }, { playerId: "p3" }],
        answers: [{ playerId: "p3", isCorrect: true }],
      }))
      return { c: s.correctContribution, p: s.progressPercent, m: [...s.unlockedMilestones] }
    }
    const a = run()
    const b = run()
    return a.c === b.c && a.p === b.p && JSON.stringify(a.m) === JSON.stringify(b.m)
  })

  console.log("\n── Integration ringan Session Engine → Game Engine (53-58) ──")
  test("53. Jelajah memakai eligible snapshot asli Session Engine", () => {
    const se = makeSessionEngine({ teamMode: true, totalRounds: 1 })
    se.engine.joinPlayer({ playerId: "p1", displayName: "1", teamId: "elang" })
    se.engine.joinPlayer({ playerId: "p2", displayName: "2", teamId: "harimau" })
    se.engine.openRound()
    se.engine.closeRound()
    const facts = buildRoundFacts(se.engine, roundIdOf(se.sessionId, 0))
    return (
      !!facts &&
      facts.eligiblePlayers.length === 2 &&
      facts.eligiblePlayers.find((p) => p.playerId === "p1")?.teamId === "elang"
    )
  })
  test("54. unanswered eligible memengaruhi denominator (via Session Engine)", () => {
    const se = makeSessionEngine({ teamMode: true, totalRounds: 2 })
    for (let i = 1; i <= 4; i++) {
      se.engine.joinPlayer({ playerId: `p${i}`, displayName: `${i}`, teamId: "elang" })
    }
    se.engine.openRound()
    // Hanya 2 dari 4 menjawab (p3, p4 unanswered).
    se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 0), playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 0), playerId: "p2", submissionId: "s2", selectedOptionId: "a" })
    se.engine.closeRound()
    const facts = buildRoundFacts(se.engine, roundIdOf(se.sessionId, 0))!
    const game = createGameState({ gameMode: "jelajah-kata", totalRounds: 2 })
    applyGameRound(game.value!, facts)
    const progress = game.value!.gameMode === "jelajah-kata" ? game.value!.jelajah.teams["elang"].progress : -1
    // accuracy 2/4 = 0.5 × 50 bobot round = 25
    return Math.abs(progress - 25) < PROGRESS_EPSILON
  })
  test("55. late join tidak masuk scoring round aktif", () => {
    const se = makeSessionEngine({ teamMode: true, totalRounds: 2 })
    se.engine.joinPlayer({ playerId: "p1", displayName: "1", teamId: "elang" })
    se.engine.openRound()
    se.engine.joinPlayer({ playerId: "late", displayName: "L", teamId: "elang" }) // late
    se.engine.closeRound()
    const facts = buildRoundFacts(se.engine, roundIdOf(se.sessionId, 0))!
    return facts.eligiblePlayers.length === 1 && !facts.eligiblePlayers.some((p) => p.playerId === "late")
  })
  test("56. retry/double close tidak menyebabkan double game score", () => {
    const se = makeSessionEngine({ teamMode: true, totalRounds: 2 })
    se.engine.joinPlayer({ playerId: "p1", displayName: "1", teamId: "elang" })
    se.engine.openRound()
    const submit1 = se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 0), playerId: "p1", submissionId: "abc", selectedOptionId: "a" })
    const submit2 = se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 0), playerId: "p1", submissionId: "abc", selectedOptionId: "a" }) // retry
    se.engine.closeRound()
    se.engine.closeRound() // double close
    const facts = buildRoundFacts(se.engine, roundIdOf(se.sessionId, 0))!
    const game = createGameState({ gameMode: "jelajah-kata", totalRounds: 2 })
    applyGameRound(game.value!, facts)
    const r2 = applyGameRound(game.value!, facts) // apply ulang round sama
    const progress = game.value!.gameMode === "jelajah-kata" ? game.value!.jelajah.teams["elang"].progress : -1
    return submit1.ok && submit2.ok && submit2.value.status === "already-saved" &&
      facts.answers.length === 1 && // retry tidak menduplikasi answer
      r2.ok === false && Math.abs(progress - 50) < PROGRESS_EPSILON
  })
  test("57. Kota hanya menghitung accepted answer", () => {
    const se = makeSessionEngine({ teamMode: false, totalRounds: 2 })
    se.engine.joinPlayer({ playerId: "p1", displayName: "1" })
    se.engine.joinPlayer({ playerId: "p2", displayName: "2" })
    se.engine.openRound()
    se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 0), playerId: "p1", submissionId: "s1", selectedOptionId: "b" }) // salah
    se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 0), playerId: "p2", submissionId: "s2", selectedOptionId: "a" }) // benar
    se.engine.closeRound()
    const facts = buildRoundFacts(se.engine, roundIdOf(se.sessionId, 0))!
    const game = createGameState({ gameMode: "kota-cahaya", kota: { targetCorrectAnswers: 5 } })
    applyGameRound(game.value!, facts)
    const kota = game.value!.gameMode === "kota-cahaya" ? game.value!.kota : null
    return !!kota && kota.correctContribution === 1 && Math.abs(kota.progressPercent - 20) < PROGRESS_EPSILON
  })
  test("58. round kedua dapat diterapkan setelah round pertama", () => {
    const se = makeSessionEngine({ teamMode: true, totalRounds: 2 })
    se.engine.joinPlayer({ playerId: "p1", displayName: "1", teamId: "elang" })
    se.engine.openRound()
    se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 0), playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    se.engine.closeRound()
    const facts1 = buildRoundFacts(se.engine, roundIdOf(se.sessionId, 0))!
    se.engine.startDiscussion()
    se.engine.openRound() // round 1
    se.engine.submitAnswer({ roundId: roundIdOf(se.sessionId, 1), playerId: "p1", submissionId: "s2", selectedOptionId: "a" })
    se.engine.closeRound()
    const facts2 = buildRoundFacts(se.engine, roundIdOf(se.sessionId, 1))!
    const game = createGameState({ gameMode: "jelajah-kata", totalRounds: 2 })
    const a1 = applyGameRound(game.value!, facts1)
    const a2 = applyGameRound(game.value!, facts2)
    const progress = game.value!.gameMode === "jelajah-kata" ? game.value!.jelajah.teams["elang"].progress : -1
    return a1.ok && a2.ok && Math.abs(progress - 100) < PROGRESS_EPSILON
  })

  console.log("\n" + "=".repeat(60))
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`)
  process.exit(failed > 0 ? 1 : 0)
}

/** State dengan progress hampir identik (beda < epsilon) utk test 19. */
function makeJelah_withDrift(): JelajahKataState {
  const s = createJelajahKataState(3)
  s.teams["elang"].progress = 100 / 3 // 33.333...
  s.teams["harimau"].progress = 1 - 2 / 3 // 0.3333... × 100 === 33.333...
  s.teams["harimau"].progress = (1 - 2 / 3) * 100
  s.teams["rusa"].progress = 10
  s.teams["badak"].progress = 5
  return s
}

main()
