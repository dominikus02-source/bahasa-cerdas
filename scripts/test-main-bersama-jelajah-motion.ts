/**
 * Test logika motion Jelajah Kata 8C.1 — pure state-machine validation.
 * Pola QA repo (tsx standalone, tanpa framework test).
 *
 * Jalankan: npx tsx scripts/test-main-bersama-jelajah-motion.ts
 *
 * Validates motion state semantics without React rendering:
 *  - timing constants imported from hook (TRAVEL_MS=600, CELEBRATE_MS=800)
 *  - initial mount does NOT animate from zero
 *  - unchanged progress does NOT trigger
 *  - progress increase triggers MOVE
 *  - decrease snaps to ready (no backward animation)
 *  - phase-gating: only DISCUSSION triggers motion
 *  - timing sequence: t=0 MOVE → t=TRAVEL CELEBRATE → t=TRAVEL+CELEBRATE READY
 *  - interrupted update: old timer cannot corrupt new sequence
 *  - simultaneous teams advance together
 *  - reduced-motion bypasses choreography (deterministic ready)
 */
import { TRAVEL_MS, CELEBRATE_MS } from "../components/main-bersama/art/jelajah-motion/useTrailMotion";

const TEAMS = ["elang", "harimau", "rusa", "badak"];
const DISCUSSION = "discussion";
const SUMMARY = "summary";
const LOBBY = "lobby";
const QUESTION = "question";
const CLOSED = "closed";

// ── Timer-based simulation mirroring useTrailMotion ───────────────────────
interface TimerEntry {
  travel: number | null;
  celebrate: number | null;
}

interface SimState {
  poses: Record<string, string>;
  boosted: Record<string, boolean>;
  timers: Record<string, TimerEntry>;
  now: number;
  phase: string;
  reduced: boolean;
}

function createSim(phase: string, reduced = false): SimState {
  const poses: Record<string, string> = {};
  const boosted: Record<string, boolean> = {};
  const timers: Record<string, TimerEntry> = {};
  for (const t of TEAMS) {
    poses[t] = "ready";
    boosted[t] = false;
    timers[t] = { travel: null, celebrate: null };
  }
  return { poses, boosted, timers, now: 0, phase, reduced };
}

function updateProgress(
  sim: SimState,
  progress: Record<string, number>,
  prev: Record<string, number>,
): void {
  const motionAllowed = !sim.reduced && sim.phase === DISCUSSION;
  for (const t of TEAMS) {
    const prevP = prev[t] ?? 0;
    const nextP = progress[t] ?? 0;
    const increased = nextP > prevP && motionAllowed;
    if (increased) {
      sim.poses[t] = "move";
      sim.boosted[t] = true;
      sim.timers[t].travel = sim.now + TRAVEL_MS;
      sim.timers[t].celebrate = null;
    }
    // Non-advancing: pose stays as-is (settles via timer if already moving).
  }
}

function advance(sim: SimState, ms: number): void {
  sim.now += ms;
  for (const t of TEAMS) {
    const timer = sim.timers[t];
    if (timer.travel !== null && sim.now >= timer.travel) {
      if (sim.boosted[t]) {
        sim.poses[t] = "celebrate";
        timer.celebrate = sim.now + CELEBRATE_MS;
      }
      timer.travel = null;
    }
    if (timer.celebrate !== null && sim.now >= timer.celebrate) {
      if (sim.boosted[t]) {
        sim.poses[t] = "ready";
        sim.boosted[t] = false;
      }
      timer.celebrate = null;
    }
  }
}

function zeroProgress(): Record<string, number> {
  return Object.fromEntries(TEAMS.map((t) => [t, 0]));
}

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

// ── TIMING CONSTANTS ────────────────────────────────────────────────────────
console.log("── §0. Timing constants imported from hook ──");
check("TRAVEL_MS == 600", TRAVEL_MS === 600);
check("CELEBRATE_MS == 800 (in 650–900 spec)", CELEBRATE_MS === 800 && CELEBRATE_MS >= 650 && CELEBRATE_MS <= 900);
check("travel < celebrate (phase separation)", TRAVEL_MS < CELEBRATE_MS);

// ── TIMING SEQUENCE TESTS (§5 A–E) ────────────────────────────────────────
console.log("── A. t=0 after increase: pose=MOVE ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  check("elang = move at t=0", sim.poses.elang === "move");
  check("harimau = ready", sim.poses.harimau === "ready");
}

console.log("── B. Before TRAVEL_MS completes: pose still MOVE ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  advance(sim, 350);
  check("elang still move at t=350ms (< 600)", sim.poses.elang === "move");
}

console.log("── C. At/after TRAVEL_MS: pose=CELEBRATE ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  advance(sim, TRAVEL_MS);
  check("elang = celebrate at t=600ms", sim.poses.elang === "celebrate");
}

console.log("── D. During celebrate hold: pose=CELEBRATE ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  advance(sim, TRAVEL_MS + 300);
  check("elang = celebrate at t=900ms (< TRAVEL+CELEBRATE)", sim.poses.elang === "celebrate");
}

console.log("── E. After TRAVEL_MS + CELEBRATE_MS: pose=READY ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  // Advance past travel (600ms → celebrate fires), then past celebrate (800ms → ready).
  advance(sim, TRAVEL_MS);
  check("elang = celebrate at t=600", sim.poses.elang === "celebrate");
  advance(sim, CELEBRATE_MS);
  check("elang = ready at t=T+C", sim.poses.elang === "ready");
  check("elang boosted reset", sim.boosted.elang === false);
}

// ── PHASE GATING (§3) ─────────────────────────────────────────────────────
console.log("── F. Phase gating: LOBBY/QUESTION/CLOSED no animation ──");
{
  [LOBBY, QUESTION, CLOSED].forEach((ph) => {
    const sim = createSim(ph);
    const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
    updateProgress(sim, progress, zeroProgress());
    check(`${ph}: elang = ready (no motion)`, sim.poses.elang === "ready");
  });
}

console.log("── G. SUMMARY phase suppressed ──");
{
  const sim = createSim(SUMMARY);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  check("summary: elang = ready", sim.poses.elang === "ready");
}

// ── SIMULTANEOUS TEAMS (§5) ────────────────────────────────────────────────
console.log("── H. Two teams advance together ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" || t === "harimau" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  check("elang = move", sim.poses.elang === "move");
  check("harimau = move", sim.poses.harimau === "move");
  check("rusa = ready", sim.poses.rusa === "ready");
  check("badak = ready", sim.poses.badak === "ready");
  check("elang timer active", sim.timers.elang.travel !== null);
  check("harimau timer active", sim.timers.harimau.travel !== null);
}

console.log("── I. All four advance together ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, 60]));
  updateProgress(sim, progress, zeroProgress());
  TEAMS.forEach((t) => check(`${t} = move`, sim.poses[t] === "move"));
}

// ── INTERRUPTED UPDATE (§2) ───────────────────────────────────────────────
console.log("── J. Interrupted update: old timer cannot corrupt new sequence ──");
{
  const sim = createSim(DISCUSSION);
  const progress1 = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress1, zeroProgress());
  check("t=0: elang move", sim.poses.elang === "move");
  check("t=0: travel timer = T+600", sim.timers.elang.travel === TRAVEL_MS);

  // t=350: new state, elang 50→75 (interrupts prior travel).
  const progress2 = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 75 : 0]));
  advance(sim, 350);
  updateProgress(sim, progress2, progress1);
  check("t=350: elang still move (new travel)", sim.poses.elang === "move");
  check("t=350: timer reset to T+600 (not stale)", sim.timers.elang.travel === 350 + TRAVEL_MS);
  check("t=350: no stale celebrate pending", sim.timers.elang.celebrate === null);

  // Advance past the ORIGINAL travel time (600ms total). Should still be move.
  advance(sim, 300); // t=650, original travel would have fired at 600
  check("t=650: elang still move (past stale 600, new timer at 950)", sim.poses.elang === "move");

  // Advance to NEW travel completion (t=950).
  advance(sim, 300); // t=950
  check("t=950: elang celebrate (new travel complete)", sim.poses.elang === "celebrate");
}

// ── DUPLICATE REALTIME (§9) ───────────────────────────────────────────────
console.log("── K. Duplicate identical refetch: no retrigger ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  check("first: elang move", sim.poses.elang === "move");
  // Second update with identical progress (50→50): no increase → no new boost.
  updateProgress(sim, progress, progress);
  check("second same: elang still move (animating)", sim.poses.elang === "move");
  // Timer NOT reset (continued from first boost).
  check("timer preserved (not reset)", sim.timers.elang.travel !== null);
}

// ── RECONNECT / INITIAL MOUNT (§8) ────────────────────────────────────────
console.log("── L. Reconnect at non-zero progress: no animation ──");
{
  const sim = createSim(DISCUSSION);
  // prev == progress → no increase detected → all ready.
  const progress = Object.fromEntries(TEAMS.map((t) => [t, 75]));
  updateProgress(sim, progress, progress);
  check("reconnect (equal): all ready", TEAMS.every((t) => sim.poses[t] === "ready"));
}

// ── REDUCED MOTION (§4, §10) ───────────────────────────────────────────────
console.log("── M. Reduced motion: deterministic ready ──");
{
  const sim = createSim(DISCUSSION, true);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  TEAMS.forEach((t) => check(`${t} = ready (reduced)`, sim.poses[t] === "ready"));
  check("no timers (reduced)", sim.timers.elang.travel === null);
  check("no boosted (reduced)", sim.boosted.elang === false);
}

console.log("── N. Reduced motion: decrease snaps ──");
{
  const sim = createSim(DISCUSSION, true);
  const progress1 = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 80 : 0]));
  const progress2 = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" ? 20 : 0]));
  updateProgress(sim, progress1, zeroProgress());
  updateProgress(sim, progress2, progress1);
  check("elang = ready after decrease (reduced)", sim.poses.elang === "ready");
}

// ── TIE POSITION (§6) ─────────────────────────────────────────────────────
console.log("── O. Tied teams advancing together ──");
{
  const sim = createSim(DISCUSSION);
  const progress = Object.fromEntries(TEAMS.map((t) => [t, t === "elang" || t === "harimau" ? 50 : 0]));
  updateProgress(sim, progress, zeroProgress());
  check("elang = move (tied)", sim.poses.elang === "move");
  check("harimau = move (tied)", sim.poses.harimau === "move");
}

console.log(`\n============================================================
Hasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
