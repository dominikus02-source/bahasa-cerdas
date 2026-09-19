/**
 * Test Session Engine Main Bersama — pola QA repo (tsx standalone).
 * Jalankan: npx tsx scripts/test-main-bersama-session-engine.ts
 * Clock fake (deterministik). Engine memegang runtime state sendiri —
 * repository in-memory TIDAK dibutuhkan di tahap ini.
 */
import { FakeClock } from "../src/main-bersama/domain/types/clock"
import type { MainQuestionSnapshot } from "../src/main-bersama/domain/entities/question"
import type { MainSession } from "../src/main-bersama/domain/entities/session"
import { SessionEngine } from "../src/main-bersama/application/services/session-engine"

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

// ─── Helpers ────────────────────────────────────────────────

let questionCounter = 0
function makeQuestion(over: Partial<MainQuestionSnapshot> = {}): MainQuestionSnapshot {
  questionCounter++
  return {
    id: `q-${questionCounter}`,
    sourceQuestionId: `bank-${questionCounter}`,
    type: "single-choice",
    prompt: `Pertanyaan ${questionCounter}?`,
    options: [
      { id: "a", text: "Opsi A" },
      { id: "b", text: "Opsi B" },
      { id: "c", text: "Opsi C" },
    ],
    correctOptionId: "a",
    explanation: "Karena A.",
    ...over,
  }
}

function makeEngine(
  snapshotCount = 2,
  roundDurationMs = 30_000,
): { engine: SessionEngine; clock: FakeClock } {
  const clock = new FakeClock()
  const snapshots = Array.from({ length: snapshotCount }, () => makeQuestion())
  const session: MainSession = {
    id: `ses-${Math.random().toString(36).slice(2, 8)}`,
    pin: "123456",
    teacherId: "teacher-1",
    classId: "class-1",
    className: "VII-A",
    gameMode: "jelajah-kata",
    phase: "preparing",
    currentRoundIndex: null,
    totalRounds: snapshots.length,
    createdAt: clock.now(),
  }
  const engine = new SessionEngine({
    session,
    questions: { sessionId: session.id, gameMode: "jelajah-kata", snapshots },
    clock,
    roundDurationMs,
  })
  return { engine, clock }
}

/** Bawa engine sampai round aktif terbuka (preparing → lobby → question). */
function startFirstRound(engine: SessionEngine) {
  engine.openLobby()
  for (const p of ["p1", "p2", "p3"]) {
    engine.joinPlayer({ playerId: p, displayName: p })
  }
  return engine.openRound()
}

// ─── Tests ──────────────────────────────────────────────────

function main() {
  console.log("\n📋 MAIN BERSAMA SESSION ENGINE TEST")
  console.log("=".repeat(60))

  console.log("\n── Lifecycle ──")
  test("1. preparing → lobby", () => {
    const { engine } = makeEngine()
    const r = engine.openLobby()
    return r.ok && engine.getPhase() === "lobby"
  })
  test("2. lobby → first question (3 peserta masuk eligible snapshot)", () => {
    const { engine } = makeEngine()
    const r = startFirstRound(engine)
    const facts = r.ok && r.value.outcome === "round-opened" ? r.value.round : null
    return (
      !!facts &&
      engine.getPhase() === "question" &&
      facts.eligiblePlayerIds.length === 3 &&
      facts.index === 0
    )
  })
  test("3. question → closed", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const r = engine.closeRound()
    return r.ok && engine.getPhase() === "closed"
  })
  test("4. closed → discussion", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.closeRound()
    const r = engine.startDiscussion()
    return r.ok && engine.getPhase() === "discussion"
  })
  test("5. discussion → next question (round 1)", () => {
    const { engine } = makeEngine(2)
    startFirstRound(engine)
    engine.closeRound()
    engine.startDiscussion()
    const r = engine.openRound()
    return (
      r.ok && r.value.outcome === "round-opened" && r.value.round.index === 1 && engine.getPhase() === "question"
    )
  })
  test("6. final discussion → summary (bukan round baru)", () => {
    const { engine } = makeEngine(2)
    startFirstRound(engine)
    engine.closeRound()
    engine.startDiscussion()
    engine.openRound() // round 1
    engine.closeRound()
    engine.startDiscussion()
    const r = engine.openRound()
    return r.ok && r.value.outcome === "summary" && engine.getPhase() === "summary"
  })
  test("7. summary → ended", () => {
    const { engine } = makeEngine(1)
    startFirstRound(engine)
    engine.closeRound()
    engine.startDiscussion()
    engine.openRound() // → summary (snapshot habis)
    const r = engine.endSession()
    return r.ok && r.value.alreadyEnded === false && engine.getPhase() === "ended"
  })
  test("8. illegal transition ditolak (preparing → question, lobby → discussion, summary → question)", () => {
    const e1 = makeEngine()
    const b = e1.engine.openRound() // preparing → question = ilegal
    e1.engine.openLobby()
    const a = e1.engine.startDiscussion() // lobby → discussion = ilegal
    const e2 = makeEngine(1)
    startFirstRound(e2.engine)
    e2.engine.closeRound()
    e2.engine.startDiscussion()
    e2.engine.openRound() // → summary
    const c = e2.engine.openRound() // summary → question = ilegal
    return !a.ok && a.code === "INVALID_PHASE" && !b.ok && b.code === "INVALID_PHASE" && !c.ok && c.code === "INVALID_PHASE"
  })

  console.log("\n── Join & Late Join ──")
  test("9. join lobby → eligibleFromRoundIndex 0", () => {
    const { engine } = makeEngine()
    engine.openLobby()
    const r = engine.joinPlayer({ playerId: "p1", displayName: "Ani" })
    return r.ok && r.value.eligibleFromRoundIndex === 0 && r.value.lateJoin === false
  })
  test("10. late join saat question N → eligibleFromRoundIndex N+1", () => {
    const { engine } = makeEngine(3)
    startFirstRound(engine)
    const r = engine.joinPlayer({ playerId: "late-1", displayName: "Late" })
    return r.ok && r.value.eligibleFromRoundIndex === 1 && r.value.lateJoin === true
  })
  test("11. late join TIDAK masuk eligible snapshot round aktif", () => {
    const { engine } = makeEngine(3)
    startFirstRound(engine)
    engine.joinPlayer({ playerId: "late-1", displayName: "Late" })
    const facts = engine.getRoundFacts("round-" + engine.sessionId + "-0")
    return !!facts && facts.eligiblePlayerIds.length === 3 && !facts.eligiblePlayerIds.includes("late-1")
  })
  test("12. join saat summary ditolak", () => {
    const { engine } = makeEngine(1)
    startFirstRound(engine)
    engine.closeRound()
    engine.startDiscussion()
    engine.openRound() // summary
    const r = engine.joinPlayer({ playerId: "p9", displayName: "New" })
    return !r.ok && r.code === "SESSION_ENDED"
  })
  test("13. join saat ended ditolak", () => {
    const { engine } = makeEngine()
    engine.openLobby()
    engine.endSession()
    const r = engine.joinPlayer({ playerId: "p9", displayName: "New" })
    return !r.ok && r.code === "SESSION_ENDED"
  })

  console.log("\n── Disconnect ──")
  test("14. disconnect tidak mengubah eligible count snapshot", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const before = engine.getRoundFacts("round-" + engine.sessionId + "-0")!.eligiblePlayerIds.length
    engine.markDisconnected("p1")
    const after = engine.getRoundFacts("round-" + engine.sessionId + "-0")!.eligiblePlayerIds.length
    return before === 3 && after === 3
  })
  test("15. reconnect memakai player yang sama (bukan duplikat)", () => {
    const { engine } = makeEngine()
    engine.openLobby()
    engine.joinPlayer({ playerId: "p1", displayName: "Ani" })
    engine.markDisconnected("p1")
    const r = engine.markConnected("p1")
    const r2 = engine.joinPlayer({ playerId: "p1", displayName: "Ani" })
    return r && r2.ok && r2.value.rejoin === true
  })
  test("16. disconnect tidak menghapus answer", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    engine.markDisconnected("p1")
    const facts = engine.getRoundFacts("round-" + engine.sessionId + "-0")!
    return facts.submittedCount === 1
  })

  console.log("\n── Answer ──")
  test("17. valid answer tersimpan", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    return r.ok && r.value.status === "saved" && engine.getRoundFacts("round-" + engine.sessionId + "-0")!.submittedCount === 1
  })
  test("18. invalid option ditolak", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "zzz" })
    return !r.ok && r.code === "INVALID_OPTION"
  })
  test("19. non-eligible player ditolak (late join submit round aktif)", () => {
    const { engine } = makeEngine(3)
    startFirstRound(engine)
    engine.joinPlayer({ playerId: "late-1", displayName: "Late" })
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "late-1", submissionId: "s9", selectedOptionId: "a" })
    return !r.ok && r.code === "PLAYER_NOT_ELIGIBLE"
  })
  test("20. wrong round ditolak (ROUND_MISMATCH)", () => {
    const { engine } = makeEngine(3)
    startFirstRound(engine)
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-9", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    return !r.ok && r.code === "ROUND_MISMATCH"
  })
  test("21. answer after close ditolak", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.closeRound()
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    return !r.ok && r.code === "ROUND_NOT_OPEN"
  })
  test("22. answer after deadline ditolak (inclusive boundary diuji)", () => {
    const { engine, clock } = makeEngine(1, 10_000)
    startFirstRound(engine)
    clock.advance(10_000) // tepat deadline → masih sah (inclusive)
    const okBoundary = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    engine.markDisconnected("p2") // pastikan p2 masih ada
    clock.advance(1) // 1 ms lewat → ditolak
    const rLate = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p2", submissionId: "s2", selectedOptionId: "b" })
    return okBoundary.ok && !rLate.ok && rLate.code === "DEADLINE_PASSED"
  })
  test("23. correctness dihitung server-side (internal, bukan ACK)", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p2", submissionId: "s2", selectedOptionId: "b" })
    const facts = engine.getRoundFacts("round-" + engine.sessionId + "-0")!
    return facts.correctCount === 1 && facts.incorrectCount === 1
  })
  test("24. ACK tidak membocorkan correctness", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    const keys = Object.keys(r.ok ? r.value : {})
    return r.ok && !keys.includes("correct") && !keys.includes("isCorrect") && !keys.includes("correctOptionId")
  })

  console.log("\n── Idempotency ──")
  test("25. retry same submission + same payload → already-saved", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const r1 = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "abc", selectedOptionId: "b" })
    const r2 = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "abc", selectedOptionId: "b" })
    return r1.ok && r1.value.status === "saved" && r2.ok && r2.value.status === "already-saved"
  })
  test("26. same submission + changed option → SUBMISSION_ID_CONFLICT (B tetap source of truth)", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "abc", selectedOptionId: "b" })
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "abc", selectedOptionId: "c" })
    const facts = engine.getRoundFacts("round-" + engine.sessionId + "-0")!
    const stored = engine.getRoundAnswers("round-" + engine.sessionId + "-0").find((a) => a.playerId === "p1")!
    return !r.ok && r.code === "SUBMISSION_ID_CONFLICT" && stored.selectedOptionId === "b"
  })
  test("27. different submission setelah answer final → ANSWER_ALREADY_EXISTS (jawaban pertama tetap)", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "abc", selectedOptionId: "b" })
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "xyz", selectedOptionId: "c" })
    const answers = engine.getRoundAnswers("round-" + engine.sessionId + "-0").filter((a) => a.playerId === "p1")
    return !r.ok && r.code === "ANSWER_ALREADY_EXISTS" && answers.length === 1 && answers[0].selectedOptionId === "b"
  })
  test("28. tidak ada duplicate answer storage (map 1:1 per player per round)", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "abc", selectedOptionId: "b" })
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "xyz", selectedOptionId: "c" })
    const facts = engine.getRoundFacts("round-" + engine.sessionId + "-0")!
    return facts.submittedCount === 1
  })

  console.log("\n── Close Round ──")
  test("29. double close tidak menggandakan perubahan (idempotent)", () => {
    const { engine, clock } = makeEngine()
    startFirstRound(engine)
    const r1 = engine.closeRound()
    clock.advance(5_000)
    const r2 = engine.closeRound()
    const round = engine.activeRound()!
    return (
      r1.ok && r2.ok && r2.value.alreadyClosed === true &&
      round.closedAt?.getTime() === r1.value.closedAt.getTime()
    )
  })
  test("30. answer existing tetap utuh setelah double close", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    engine.closeRound()
    engine.closeRound()
    const stored = engine.getRoundAnswers("round-" + engine.sessionId + "-0")
    return stored.length === 1 && stored[0].selectedOptionId === "a"
  })

  console.log("\n── Pause / Resume ──")
  test("31. pause saat question menyimpan remaining duration", () => {
    const { engine, clock } = makeEngine(1, 30_000)
    startFirstRound(engine)
    clock.advance(12_000)
    const r = engine.pause()
    const pause = engine["state"].pause
    return (
      r.ok && engine.getPhase() === "paused" &&
      !!pause && pause.fromPhase === "question" && pause.remainingMs === 18_000
    )
  })
  test("32. submission saat paused ditolak", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.pause()
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    return !r.ok && r.code === "ROUND_NOT_OPEN"
  })
  test("33. resume mengembalikan question", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.pause()
    const r = engine.resume()
    return r.ok && engine.getPhase() === "question"
  })
  test("34. deadline bergeser = resume time + sisa waktu", () => {
    const { engine, clock } = makeEngine(1, 30_000)
    startFirstRound(engine)
    clock.advance(12_000)
    const closesBefore = engine.activeRound()!.closesAt!.getTime()
    engine.pause()
    clock.advance(5 * 60_000) // pause 5 menit
    engine.resume()
    const closesAfter = engine.activeRound()!.closesAt!.getTime()
    const now = clock.now().getTime()
    return closesAfter - now === 18_000 && closesAfter !== closesBefore
  })
  test("35. pause lama tidak mengurangi answering time (18s utuh setelah 5 menit pause)", () => {
    const { engine, clock } = makeEngine(1, 30_000)
    startFirstRound(engine)
    clock.advance(12_000)
    engine.pause()
    clock.advance(5 * 60_000)
    engine.resume()
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    return r.ok
  })
  test("36. double pause aman (no-op) dan pause dari discussion restore discussion", () => {
    const { engine } = makeEngine(2)
    startFirstRound(engine)
    engine.closeRound()
    engine.startDiscussion()
    const p1 = engine.pause()
    const p2 = engine.pause()
    const r = engine.resume()
    return p1.ok && p2.ok && r.ok && engine.getPhase() === "discussion"
  })

  console.log("\n── Ending ──")
  test("37. end dari question aktif", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const r = engine.endSession()
    return r.ok && engine.getPhase() === "ended"
  })
  test("38. second end idempotent (alreadyEnded)", () => {
    const { engine } = makeEngine()
    engine.openLobby()
    const r1 = engine.endSession()
    const r2 = engine.endSession()
    return r1.ok && r2.ok && r2.value.alreadyEnded === true
  })
  test("39. answer after end ditolak", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    engine.endSession()
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    return !r.ok && r.code === "SESSION_ENDED"
  })
  test("40. next round after end ditolak", () => {
    const { engine } = makeEngine(2)
    startFirstRound(engine)
    engine.endSession()
    const r = engine.openRound()
    return !r.ok && r.code === "SESSION_ENDED"
  })

  console.log("\n── Isolation ──")
  test("41. dua session state tidak saling memengaruhi", () => {
    const a = makeEngine(2)
    const b = makeEngine(2)
    // A: 4 peserta join di lobby sebelum round dibuka.
    a.engine.openLobby()
    for (const p of ["p1", "p2", "p3", "px"]) {
      a.engine.joinPlayer({ playerId: p, displayName: p })
    }
    a.engine.openRound()
    // B: 3 peserta.
    startFirstRound(b.engine)
    const factsA = a.engine.getRoundFacts("round-" + a.engine.sessionId + "-0")!
    const factsB = b.engine.getRoundFacts("round-" + b.engine.sessionId + "-0")!
    return (
      a.engine.sessionId !== b.engine.sessionId &&
      factsA.eligiblePlayerIds.length === 4 &&
      factsB.eligiblePlayerIds.length === 3 &&
      a.engine.getPhase() === "question" &&
      b.engine.getPhase() === "question"
    )
  })
  test("42. round milik session B ditolak untuk session A (ROUND_MISMATCH)", () => {
    const a = makeEngine(2)
    const b = makeEngine(2)
    startFirstRound(a.engine)
    startFirstRound(b.engine)
    const r = a.engine.submitAnswer({
      roundId: "round-" + b.engine.sessionId + "-0",
      playerId: "p1",
      submissionId: "sX",
      selectedOptionId: "a",
    })
    return !r.ok && r.code === "ROUND_MISMATCH"
  })

  console.log("\n── Tambahan ──")
  test("43. openRound saat snapshot habis dari lobby tidak mungkin (totalRounds sinkron)", () => {
    const { engine } = makeEngine(2)
    return engine.state.session.totalRounds === 2
  })
  test("44. submit sebelum player terdaftar → PLAYER_NOT_FOUND", () => {
    const { engine } = makeEngine()
    startFirstRound(engine)
    const r = engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "ghost", submissionId: "s1", selectedOptionId: "a" })
    return !r.ok && r.code === "PLAYER_NOT_FOUND"
  })
  test("45. join saat preparing ditolak (INVALID_PHASE)", () => {
    const { engine } = makeEngine()
    const r = engine.joinPlayer({ playerId: "pEarly", displayName: "Early" })
    return !r.ok && r.code === "INVALID_PHASE"
  })
  test("46. submittedAt authoritative dari Clock server (bukan timestamp client)", () => {
    const { engine, clock } = makeEngine()
    startFirstRound(engine)
    clock.advance(3_000) // majukan jam server; client tidak punya pengaruh
    engine.submitAnswer({ roundId: "round-" + engine.sessionId + "-0", playerId: "p1", submissionId: "s1", selectedOptionId: "a" })
    const stored = engine.getRoundAnswers("round-" + engine.sessionId + "-0")[0]
    return stored.submittedAt.getTime() === clock.now().getTime()
  })

  console.log("\n" + "=".repeat(60))
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
