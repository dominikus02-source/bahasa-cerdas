import assert from "node:assert/strict";
import { buildClassGradePlan } from "../lib/main-bersama/result-grades";
import {
  buildResultSummary,
  buildResultsCsv,
  resultShareLinks,
  type ShareableResults,
} from "../lib/main-bersama/result-sharing";
import { packageDraftSchema } from "../lib/main-bersama/question-authoring";

const plan = buildClassGradePlan(
  [
    { id: "full", userId: "u1" },
    { id: "late", userId: "auth2" },
    { id: "legacy", userId: "auth1" },
    { id: "guest", userId: null },
    { id: "other", userId: "outside" },
    { id: "idle", userId: "u3" },
  ],
  [1, 2, 3].map((n) => ({ user: { id: `u${n}`, supabaseId: `auth${n}` } })),
  [
    {
      id: "r1",
      eligible: [
        { playerId: "full" },
        { playerId: "legacy" },
        { playerId: "guest" },
        { playerId: "other" },
      ],
    },
    { id: "r2", eligible: [{ playerId: "full" }, { playerId: "late" }] },
  ],
  [
    { roundId: "r1", playerId: "full", isCorrect: true },
    { roundId: "r1", playerId: "legacy", isCorrect: true },
    { roundId: "r1", playerId: "late", isCorrect: true },
    { roundId: "r2", playerId: "full", isCorrect: false },
    { roundId: "r2", playerId: "late", isCorrect: true },
  ],
);
assert.deepEqual(plan, {
  entries: [
    { userId: "u1", eligible: 2, correct: 1, score: 50 },
    { userId: "u2", eligible: 1, correct: 1, score: 100 },
  ],
  skipped: { guests: 1, outsideClass: 1, noQuestions: 1 },
});
const results: ShareableResults = {
  contentTitle: "Teks & Puisi #1",
  gameMode: "jelajah-kata",
  totalRounds: 2,
  participants: [
    {
      displayName: 'Budi, "B"',
      eligibleRounds: 2,
      correctAnswers: 1,
      progressPercent: 50,
    },
    {
      displayName: "Ayu",
      eligibleRounds: 1,
      correctAnswers: 1,
      progressPercent: 100,
    },
    {
      displayName: "=HYPERLINK(1)",
      eligibleRounds: 0,
      correctAnswers: 0,
      progressPercent: 0,
    },
  ],
};
const summary = buildResultSummary(results, "VII A");
assert(summary.includes("Rata-rata nilai: 75%"));
assert(
  !summary.includes("Budi") &&
    !summary.includes("Ayu") &&
    !summary.includes("HYPERLINK"),
);
const detailed = buildResultSummary(results, "VII A", true);
assert(detailed.includes("Ayu: 100% (1/1 benar)"));
assert(detailed.includes("Belum mengikuti soal"));
const links = resultShareLinks(results.contentTitle, detailed);
assert.equal(new URL(links.email).searchParams.get("body"), detailed);
assert.equal(
  new URL(links.email).searchParams.get("subject"),
  results.contentTitle,
);
assert.equal(new URL(links.whatsapp).searchParams.get("text"), detailed);
const csv = buildResultsCsv(results);
assert(csv.startsWith("\uFEFF"));
assert(csv.includes('"Budi, ""B""","1","2","50"'));
assert(csv.includes('"\'=HYPERLINK(1)","0","0",""'));
assert(csv.includes('"Ayu","1","1","100"'));
const draft = {
  title: "Paket QA",
  kelas: "VII",
  reviewed: true,
  questions: [
    {
      type: "PILIHAN_GANDA",
      prompt: "Mana kata baku?",
      options: ["Aktivitas", "Aktifitas"],
      correctIndex: 0,
      explanation: "",
    },
  ],
};
assert.equal(packageDraftSchema.parse(draft).isPublic, false);
assert.equal(
  packageDraftSchema.parse({ ...draft, isPublic: true }).isPublic,
  true,
);
assert.equal(
  packageDraftSchema.safeParse({ ...draft, isPublic: "true" }).success,
  false,
);
console.log(
  "PASS: class membership, late joining, historical identities, absent pupils, privacy defaults, opt-in details, share encoding, safe CSV and package access validation.",
);
