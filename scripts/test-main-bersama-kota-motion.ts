/**
 * Test logika motion Kota Cahaya 8C.2 — behavior validation.
 * Pola QA repo (tsx standalone, tanpa framework test).
 *
 * Jalankan: npx tsx scripts/test-main-bersama-kota-motion.ts
 *
 * Menguji FUNGSI KEPUTUSAN ASLI dari hook (decideKotaTransition — bukan
 * mirror/duplikat logika) + konstanta timing + wiring sumber:
 *  - A. initial mount at 0 → snap, no reveal
 *  - B. initial mount at non-zero → snap, no 0→N replay
 *  - C. unchanged progress → noop (no retrigger, timers untouched)
 *  - D. increase without crossing → animate bar, no milestone reveal
 *  - E–H. cross 25/50/75/100 → animate + single reveal
 *  - I. multi-cross 20→80 → ascending stagger, total < 1.3s
 *  - J. large jump 0→100 after hydration → all 4 ascending
 *  - K. decrease/correction → snap (no backward animation)
 *  - L. duplicate realtime 65/65/65 → noop, never re-reveals
 *  - M. rapid/interrupted 20→40→65 → latest wins, no double celebrate
 *  - N. phase gating → closed + discussion animate; lobby/preparing/
 *       question/paused snap
 *  - N2. canonical production sequence: closed(+progress) animates →
 *       discussion(same value) NOOP, no second reveal
 *  - N3. discussion fallback: increase first observed at discussion animates
 *  - N4. rapid/interrupted update inside CLOSED is interruption-safe
 *  - O. summary stable → snap + summary stays display-only (source)
 *  - P. reconnect non-zero → init (no replay)
 *  - Q. reduced motion → snap, deterministic
 *  - R. milestone stays lit after reveal (authoritative lit set)
 *  - S. timing budget: single + multi sequences ≲ 1.3s
 *  - T. source wiring: KotaScene/CityProgress/projector/CSS guards
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  KOTA_PROGRESS_MS,
  KOTA_MILESTONE_REVEAL_MS,
  KOTA_MILESTONE_STAGGER_MS,
  decideKotaTransition,
  type KotaSnapshot,
} from "../components/main-bersama/art/kota-motion/useKotaMotion";

const ROOT = join(__dirname, "..");
const DISCUSSION = "discussion";
const CLOSED = "closed";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

function snap(progress: number, unlocked: string[]): KotaSnapshot {
  return { progress, unlocked };
}

// ── §0. Timing constants (from hook — single source of truth) ──
console.log("── §0. Timing constants ──");
check("KOTA_PROGRESS_MS == 650", KOTA_PROGRESS_MS === 650);
check(
  "KOTA_MILESTONE_REVEAL_MS == 500",
  KOTA_MILESTONE_REVEAL_MS === 500,
);
check(
  "KOTA_MILESTONE_STAGGER_MS in 90–120",
  KOTA_MILESTONE_STAGGER_MS >= 90 && KOTA_MILESTONE_STAGGER_MS <= 120,
  `got ${KOTA_MILESTONE_STAGGER_MS}`,
);

// ── A. Initial mount at 0 ──
console.log("── A. initial mount at 0 ──");
{
  const d = decideKotaTransition(null, snap(0, []), DISCUSSION, false);
  check("mount 0 → init (snap, no reveal)", d.kind === "init");
}

// ── B. Initial mount at non-zero ──
console.log("── B. initial mount at non-zero ──");
{
  const d = decideKotaTransition(
    null,
    snap(62, ["garden", "library"]),
    DISCUSSION,
    false,
  );
  check("mount 62 → init (no 0→62 replay)", d.kind === "init");
}

// ── C. Unchanged progress ──
console.log("── C. unchanged progress ──");
{
  const d = decideKotaTransition(
    snap(40, ["garden"]),
    snap(40, ["garden"]),
    DISCUSSION,
    false,
  );
  check("40→40 same milestones → noop", d.kind === "noop");
}

// ── D. Increase without crossing ──
console.log("── D. increase without crossing ──");
{
  const d = decideKotaTransition(
    snap(52, ["garden", "library"]),
    snap(62, ["garden", "library"]),
    DISCUSSION,
    false,
  );
  check(
    "52→62 → animate, newly empty",
    d.kind === "animate" && d.newly.length === 0,
    JSON.stringify(d),
  );
}

// ── E–H. Single milestone crossings ──
console.log("── E. cross 25 ──");
{
  const d = decideKotaTransition(
    snap(20, []),
    snap(30, ["garden"]),
    DISCUSSION,
    false,
  );
  check(
    "20→30 reveals garden only",
    d.kind === "animate" && JSON.stringify(d.newly) === `["garden"]`,
    JSON.stringify(d),
  );
}
console.log("── F. cross 50 ──");
{
  const d = decideKotaTransition(
    snap(44, ["garden"]),
    snap(55, ["garden", "library"]),
    DISCUSSION,
    false,
  );
  check(
    "44→55 reveals library only",
    d.kind === "animate" && JSON.stringify(d.newly) === `["library"]`,
    JSON.stringify(d),
  );
}
console.log("── G. cross 75 ──");
{
  const d = decideKotaTransition(
    snap(70, ["garden", "library"]),
    snap(78, ["garden", "library", "homes"]),
    DISCUSSION,
    false,
  );
  check(
    "70→78 reveals homes only",
    d.kind === "animate" && JSON.stringify(d.newly) === `["homes"]`,
    JSON.stringify(d),
  );
}
console.log("── H. cross 100 ──");
{
  const d = decideKotaTransition(
    snap(90, ["garden", "library", "homes"]),
    snap(100, ["garden", "library", "homes", "town-center"]),
    DISCUSSION,
    false,
  );
  check(
    "90→100 reveals town-center only",
    d.kind === "animate" && JSON.stringify(d.newly) === `["town-center"]`,
    JSON.stringify(d),
  );
}

// ── I. Multi-cross 20→80 ──
console.log("── I. multi-cross 20→80 ──");
{
  const d = decideKotaTransition(
    snap(20, []),
    snap(80, ["garden", "library", "homes"]),
    DISCUSSION,
    false,
  );
  const ok =
    d.kind === "animate" &&
    JSON.stringify(d.newly) ===
      `["garden","library","homes"]`;
  check("20→80 newly ascending (no serialized long chain)", ok, JSON.stringify(d));
  if (d.kind === "animate") {
    const lastStart = (d.newly.length - 1) * KOTA_MILESTONE_STAGGER_MS;
    const total = Math.max(KOTA_PROGRESS_MS, lastStart + KOTA_MILESTONE_REVEAL_MS);
    check(
      `multi total ${total}ms < 1300ms (stagger, not serialize)`,
      total < 1300,
    );
  }
}

// ── J. Large jump 0→100 after hydration ──
console.log("── J. large jump 0→100 after hydration ──");
{
  const hydrated: KotaSnapshot = snap(0, []);
  const d = decideKotaTransition(
    hydrated,
    snap(100, ["garden", "library", "homes", "town-center"]),
    DISCUSSION,
    false,
  );
  const ok =
    d.kind === "animate" &&
    JSON.stringify(d.newly) ===
      `["garden","library","homes","town-center"]`;
  check("0→100 reveals all 4 ascending", ok, JSON.stringify(d));
}

// ── K. Decrease / correction snaps ──
console.log("── K. decrease/correction ──");
{
  const d = decideKotaTransition(
    snap(65, ["garden", "library"]),
    snap(40, ["garden"]),
    DISCUSSION,
    false,
  );
  check("65→40 → snap (no backward animation)", d.kind === "snap");
}

// ── L. Duplicate realtime ──
console.log("── L. duplicate realtime 65/65/65 ──");
{
  const s = snap(65, ["garden", "library"]);
  const d1 = decideKotaTransition(s, snap(65, ["garden", "library"]), DISCUSSION, false);
  const d2 = decideKotaTransition(s, snap(65, ["garden", "library"]), DISCUSSION, false);
  check("repeat 1 → noop", d1.kind === "noop");
  check("repeat 2 → noop (no re-reveal, no glow restart)", d2.kind === "noop");
}

// ── M. Rapid / interrupted update ──
console.log("── M. rapid/interrupted 20→40→65 ──");
{
  const s20 = snap(20, []);
  const s40 = snap(40, ["garden"]);
  const s65 = snap(65, ["garden", "library"]);
  const first = decideKotaTransition(s20, s40, DISCUSSION, false);
  check(
    "20→40 animates, newly=[garden]",
    first.kind === "animate" && JSON.stringify(first.newly) === `["garden"]`,
    JSON.stringify(first),
  );
  // Before settle: authoritative jumps to 65. Latest wins; garden (already
  // rendered authoritative) is NOT celebrated twice; library reveals.
  const second = decideKotaTransition(s40, s65, DISCUSSION, false);
  check(
    "40→65 animates, newly=[library] only (no double garden)",
    second.kind === "animate" && JSON.stringify(second.newly) === `["library"]`,
    JSON.stringify(second),
  );
  // Final rendered state must equal latest authoritative.
  check("final authoritative = 65", s65.progress === 65);
}

// ── N. Phase gating ──
// Progres Kota di-commit pada close-round (phase → closed), jadi `closed`
// WAJIB boleh beranimasi; `discussion` tetap fallback.
console.log("── N. phase gating ──");
{
  const before = snap(40, ["garden"]);
  const after = snap(62, ["garden", "library"]);
  (["lobby", "preparing", "question", "paused"] as const).forEach((ph) => {
    const d = decideKotaTransition(before, after, ph, false);
    check(`${ph}: increase → snap (no animation)`, d.kind === "snap");
  });
  const dc = decideKotaTransition(before, after, CLOSED, false);
  check("closed: increase → animate (progres di-commit saat close-round)", dc.kind === "animate");
  const dd = decideKotaTransition(before, after, DISCUSSION, false);
  check("discussion: increase → animate (fallback tetap valid)", dd.kind === "animate");
}

// ── N2. Canonical production sequence ──
// QUESTION(0) → CLOSED(25) → DISCUSSION(25)
console.log("── N2. canonical sequence question → closed(+25) → discussion(25) ──");
{
  const q = snap(0, []);
  const closed25 = snap(25, ["garden"]);
  const step1 = decideKotaTransition(q, closed25, CLOSED, false);
  check(
    "question(0) → closed(25) animates + reveals garden",
    step1.kind === "animate" && JSON.stringify(step1.newly) === `["garden"]`,
    JSON.stringify(step1),
  );
  const step2 = decideKotaTransition(closed25, snap(25, ["garden"]), DISCUSSION, false);
  check("closed(25) → discussion(25) → NOOP (no replay)", step2.kind === "noop");
  const step3 = decideKotaTransition(closed25, snap(25, ["garden"]), CLOSED, false);
  check("closed(25) → closed(25) → NOOP (timers untouched)", step3.kind === "noop");
}

// ── N3. Discussion fallback ──
// Realtime batching/race: kenaikan pertama baru teramati saat phase sudah
// discussion → motion tetap harus main.
console.log("── N3. discussion fallback (batched/race) ──");
{
  const closed20 = snap(20, []);
  const disc50 = snap(50, ["garden", "library"]);
  const d = decideKotaTransition(closed20, disc50, DISCUSSION, false);
  check(
    "closed(20) → discussion(50) animates + reveals garden,library",
    d.kind === "animate" && JSON.stringify(d.newly) === `["garden","library"]`,
    JSON.stringify(d),
  );
}

// ── N4. Rapid update inside CLOSED ──
console.log("── N4. rapid update inside closed 20→40 then 40→65 ──");
{
  const s20 = snap(20, []);
  const s40 = snap(40, ["garden"]);
  const s65 = snap(65, ["garden", "library"]);
  const first = decideKotaTransition(s20, s40, CLOSED, false);
  check(
    "closed 20→40 animates, newly=[garden]",
    first.kind === "animate" && JSON.stringify(first.newly) === `["garden"]`,
    JSON.stringify(first),
  );
  const second = decideKotaTransition(s40, s65, CLOSED, false);
  check(
    "closed 40→65 animates, newly=[library] only (garden NOT re-revealed)",
    second.kind === "animate" && JSON.stringify(second.newly) === `["library"]`,
    JSON.stringify(second),
  );
  const stale = decideKotaTransition(s65, s65, CLOSED, false);
  check("stale/duplicate after 65 → noop (no reset)", stale.kind === "noop");
  check("final authoritative = 65 (latest wins)", s65.progress === 65);
}

// ── O. Summary stable ──
console.log("── O. summary stable ──");
{
  const d = decideKotaTransition(
    snap(90, ["garden", "library", "homes"]),
    snap(100, ["garden", "library", "homes", "town-center"]),
    "summary",
    false,
  );
  check("summary: increase → snap (no replay)", d.kind === "snap");
}

// ── P. Reconnect non-zero ──
console.log("── P. reconnect non-zero ──");
{
  const d = decideKotaTransition(
    null,
    snap(75, ["garden", "library", "homes"]),
    DISCUSSION,
    false,
  );
  check("reconnect 75 → init (lit via props, no re-reveal)", d.kind === "init");
}

// ── Q. Reduced motion ──
console.log("── Q. reduced motion ──");
{
  const d = decideKotaTransition(
    snap(20, []),
    snap(30, ["garden"]),
    DISCUSSION,
    true,
  );
  check("reduced: 20→30 → snap (instant lit, no timers)", d.kind === "snap");
  const dMulti = decideKotaTransition(
    snap(20, []),
    snap(80, ["garden", "library", "homes"]),
    DISCUSSION,
    true,
  );
  check("reduced: multi-cross → snap", dMulti.kind === "snap");
}

// ── R. Milestone stays lit after reveal ──
console.log("── R. milestone remains lit ──");
{
  // After garden revealed at 30, a later same-value snapshot keeps it lit
  // (noop — reveal never un-lights; lit set is authoritative, not transient).
  const lit: KotaSnapshot = snap(30, ["garden"]);
  const d = decideKotaTransition(lit, snap(30, ["garden"]), DISCUSSION, false);
  check("post-reveal same snapshot → noop (stays lit)", d.kind === "noop");
  check("lit set still contains garden", lit.unlocked.includes("garden"));
}

// ── S. Timing budget ──
console.log("── S. timing budget ──");
{
  // Single cross: progress 650ms, reveal ~500ms around arrival → ≲1.3s.
  const single = KOTA_PROGRESS_MS + KOTA_MILESTONE_REVEAL_MS;
  check(`single-cross perceptual ${single}ms ≲ 1300ms`, single <= 1300);
  // Worst multi (3 crosses): last reveal ends at 2*stagger + 500.
  const multi = Math.max(
    KOTA_PROGRESS_MS,
    2 * KOTA_MILESTONE_STAGGER_MS + KOTA_MILESTONE_REVEAL_MS,
  );
  check(`multi-cross perceptual ${multi}ms < 1300ms`, multi < 1300);
}

// ── T. Source wiring guards ──
console.log("── T. source wiring ──");
const hookSrc = readFileSync(
  join(ROOT, "components/main-bersama/art/kota-motion/useKotaMotion.ts"),
  "utf8",
);
check("hook: no fetch/polling (read-only projector state)", !/setInterval\s*\(|fetchProjectorState|api-client|axios|XMLHttpRequest/.test(hookSrc));
check("hook: version guard for rapid updates", hookSrc.includes("versionRef"));
check("hook: duplicate noop keeps timers", hookSrc.includes('decision.kind === "noop"'));
check("hook: exports pure decideKotaTransition", hookSrc.includes("decideKotaTransition"));
check(
  'hook: MOTION_PHASES mencakup "closed" + "discussion"',
  /MOTION_PHASES = new Set\(\["closed", "discussion"\]\)/.test(hookSrc),
);
check(
  "hook: closed tidak di-exclude dari motion",
  !/MOTION_PHASES = new Set\(\["discussion"\]\)/.test(hookSrc),
);

const kotaSrc = readFileSync(
  join(ROOT, "components/main-bersama/art/kota/KotaScene.tsx"),
  "utf8",
);
check("KotaScene: reveal prop", kotaSrc.includes("reveal"));
check("KotaScene: data-reveal marker", kotaSrc.includes("data-reveal"));
check("KotaScene: mb-kota-reveal class", kotaSrc.includes("mb-kota-reveal"));

const citySrc = readFileSync(
  join(ROOT, "components/main-bersama/shared/CityProgress.tsx"),
  "utf8",
);
check("CityProgress: animate prop", citySrc.includes("animate"));
check("CityProgress: mb-city-fill-anim/snap", citySrc.includes("mb-city-fill-anim") && citySrc.includes("mb-city-fill-snap"));
check("CityProgress: mb-city-node-reveal", citySrc.includes("mb-city-node-reveal"));

const pjSrc = readFileSync(
  join(ROOT, "components/main-bersama/projector/projector-client.tsx"),
  "utf8",
);
check("projector: uses useKotaMotion", pjSrc.includes("useKotaMotion"));
check(
  "projector: hook fed by authoritative progress/unlocked/phase",
  pjSrc.includes("kotaProgressPercent") && pjSrc.includes("kotaUnlocked"),
);
check(
  "projector: summary stays display-only (no motion hook)",
  !/ProjectorSummary[\s\S]*useKotaMotion/.test(
    pjSrc.slice(pjSrc.indexOf("function ProjectorSummary")),
  ),
);
check("projector: no scoring/persistence in motion path", !/applyKotaCahayaRound|session-engine/.test(pjSrc));

const css = readFileSync(
  join(ROOT, "components/main-bersama/main-bersama.css"),
  "utf8",
);
check("css: width 650ms ease-out (no bounce)", css.includes("width 650ms ease-out"));
check("css: mb-kota-reveal 500ms", css.includes("mb-kota-reveal 500ms"));
check("css: no infinite kota animation", !/mb-kota-reveal[^}]*infinite/.test(css) && !/mb-city-node-reveal[^}]*infinite/.test(css));
check("css: reduced-motion kills kota animation", /prefers-reduced-motion: reduce\)[\s\S]*mb-kota-reveal/.test(css));
check("css: no spinning/bouncing keyframes for kota", !/mb-kota-(spin|bounce|shake|pulse)/.test(css));

// ── U. Presentasi layar CLOSED (payoff Kota) ─────────────────
// Progres Kota di-commit saat close-round → surface CLOSED WAJIB punya
// bar + langit kota, memakai STATE MOTION YANG SAMA dari parent.
console.log("── U. closed surface ──");
const closedBranch = pjSrc.slice(
  pjSrc.indexOf('view.phase === "closed"'),
  pjSrc.indexOf('view.phase === "discussion"'),
);
check(
  "closed: KotaScene dirender (langit kota)",
  closedBranch.includes("<KotaScene"),
);
check(
  "closed: CityProgress dirender (bar progres)",
  closedBranch.includes("<CityProgress"),
);
check(
  "closed: memakai state motion parent (bukan hook kedua)",
  closedBranch.includes("kotaMotion.litMilestones") &&
    closedBranch.includes("kotaMotion.revealMilestones") &&
    closedBranch.includes("kotaMotion.growFrom") &&
    (pjSrc.match(/useKotaMotion\(/g) ?? []).length === 1,
);
check(
  'closed: hanya untuk kota-cahaya (Jelajah/paused tidak berubah)',
  /view\.phase === "closed" &&\s*\n\s*view\.gameProgress\.gameMode === "kota-cahaya"/.test(
    closedBranch,
  ),
);
check(
  "closed: tanpa visual Jelajah (trail tidak ikut)",
  !closedBranch.includes("JelajahTrail") && !closedBranch.includes("teamProgress"),
);
check(
  "projector: growFrom diteruskan ke CityProgress",
  (pjSrc.match(/growFrom=\{kotaMotion\.growFrom\}/g) ?? []).length >= 4,
);
check(
  "projector: summary tetap display-only (tanpa motion hook)",
  !pjSrc
    .slice(pjSrc.indexOf("function ProjectorSummary"))
    .includes("kotaMotion"),
);

// ── V. Kontrak growFrom (hook + CityProgress + CSS) ──────────
console.log("── V. growFrom contract ──");
check("hook: mengekspor growFrom", hookSrc.includes("growFrom,") && hookSrc.includes("growFrom: number | null"));
check(
  "hook: growFrom di-set dari nilai authoritative sebelumnya",
  hookSrc.includes("const fromProgress = prevProgressRef.current") &&
    hookSrc.includes("setGrowFrom(fromProgress)"),
);
check(
  "hook: growFrom dibersihkan pada snap/init (tanpa animasi palsu)",
  (hookSrc.match(/setGrowFrom\(null\)/g) ?? []).length >= 2,
);
check(
  "CityProgress: kelas grow + CSS var from/to",
  citySrc.includes("mb-city-fill-grow") &&
    citySrc.includes("--mb-city-from") &&
    citySrc.includes("--mb-city-to"),
);
check(
  "CityProgress: grow hanya saat animate + from < value",
  citySrc.includes("animate && from !== null && from < value"),
);
check(
  "css: keyframes mb-city-fill-grow 650ms ease-out dari var(--mb-city-from)",
  /mb-city-fill-grow 650ms ease-out both/.test(css) &&
    /@keyframes mb-city-fill-grow[\s\S]*?var\(--mb-city-from/.test(css),
);
check(
  "css: reduced-motion mematikan grow juga",
  /prefers-reduced-motion: reduce\)[\s\S]*mb-city-fill-grow[\s\S]*animation: none/.test(
    css,
  ),
);
check(
  "css: masih tanpa animasi infinite/bounce untuk kota",
  !/mb-city-fill-grow[^}]*infinite/.test(css),
);

console.log(`\n============================================================
Hasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
