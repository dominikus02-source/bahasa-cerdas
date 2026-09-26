// Guards the reward economy against double payouts.
//
// On 2026-07-21 the daily quest reward could be claimed without limit:
// claimQuestReward() gated on quest.completed and then set completed: true —
// a value already true — so nothing recorded that the reward had been handed
// over. Production showed 69 claims against 6 quests in one day, one claimed
// 17 times, with roughly 430 of 460 quest coins issued that day being
// duplicates. The daily leaderboard was topped by whoever clicked most.
//
// These are static checks on the payout paths — they need no database and run
// in CI alongside the other suites.
import { readFileSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const coins = readFileSync(join(process.cwd(), "lib/coins.ts"), "utf8");
const claim = coins.slice(coins.indexOf("export async function claimQuestReward"));
const claimBody = claim.slice(0, claim.indexOf("\n}\n") + 3);

// The ledger is the record of payment, so a claim must look for an existing one.
ok(
  "klaim misi memeriksa pembayaran sebelumnya",
  /findFirst[\s\S]*reason:\s*"QUEST_COMPLETE"[\s\S]*reference:\s*questId/.test(claimBody)
);
ok(
  "klaim misi menolak jika sudah pernah dibayar",
  /if\s*\(already\)[\s\S]*throw/.test(claimBody)
);
ok(
  "pemeriksaan berada di dalam transaksi",
  claimBody.indexOf("db.$transaction") < claimBody.indexOf("findFirst")
);
// The old no-op write was the thing masquerading as a guard.
ok(
  "tidak lagi menulis ulang completed: true sebagai penjaga",
  !/dailyQuest\.update[\s\S]{0,120}completed:\s*true/.test(claimBody)
);

// Learning has to reach the same ledger, or a board built on it cannot show
// the one activity that is actually learning.
const jalur = readFileSync(
  join(process.cwd(), "app/api/jalur-cerdas/[unitId]/progress/route.ts"),
  "utf8"
);
ok("selesai belajar dicatat ke buku koin", /coinTransaction\.create/.test(jalur));
ok(
  "belajar tetap dijaga dari klaim ulang",
  /if\s*\(existing\?\.completed\)[\s\S]{0,200}earnedXp:\s*0/.test(jalur)
);
ok(
  "Jalur Cerdas tidak membayar koin jika awardXp tidak memberi XP",
  /COIN_PAID\s*=\s*XP_REWARD\s*>\s*0\s*\?\s*COIN_REWARD\s*:\s*0/.test(jalur)
);
ok(
  "Jalur Cerdas ledger memakai koin yang benar-benar dibayar",
  /amount:\s*COIN_PAID[\s\S]{0,120}reason:\s*"SELESAI_BELAJAR"/.test(jalur)
);

const ttsSession = readFileSync(
  join(process.cwd(), "lib/game/tts/session-server.ts"),
  "utf8"
);
ok(
  "TTS koin hanya dibayar setelah XP benar-benar masuk",
  /const xpDiberikan = hasilXp\?\.xpDiberikan \?\? 0[\s\S]{0,500}xpDiberikan\s*>\s*0/.test(ttsSession)
);
ok(
  "TTS tidak lagi membayar koin langsung dari finalXp",
  !/if\s*\(coins\s*>\s*0\s*&&\s*finalXp\s*>\s*0\)/.test(ttsSession)
);

// Spending must never look like earning on a leaderboard.
for (const [name, path] of [
  ["arena", "app/arena/page.tsx"],
  ["liga", "app/arena/league/page.tsx"],
] as const) {
  const src = readFileSync(join(process.cwd(), path), "utf8");
  const usesLedger = /coinTransaction\.(groupBy|aggregate)/.test(src);
  ok(`${name}: papan/statistik harian memakai buku koin`, usesLedger);
  if (usesLedger) {
    ok(`${name}: hanya menghitung pemasukan (amount > 0)`, /amount:\s*\{\s*gt:\s*0\s*\}/.test(src));
  }
}


// Game session idempotency — retry satu sesi tidak boleh membuat reward kedua.
const gameXp = readFileSync(
  join(process.cwd(), "app/api/game/xp/route.ts"),
  "utf8"
);
ok(
  "endpoint game XP menerima ID sesi stabil",
  /gameSessionId/.test(gameXp) && /rawGameSessionId/.test(gameXp)
);
ok(
  "GameResult retry tidak membuat baris kedua",
  /if\s*\(rawGameSessionId\)[\s\S]{0,500}findUnique\(\{ where: \{ sessionId: reference \}/.test(gameXp)
);

const katastra = readFileSync(
  join(process.cwd(), "app/api/katastra/submit/route.ts"),
  "utf8"
);
ok(
  "KataStra memakai ID sesi stabil bila tersedia",
  /gameSessionId/.test(katastra) && /katastra-\$\{rawGameSessionId \|\| crypto\.randomUUID\(\)\}/.test(katastra)
);

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
