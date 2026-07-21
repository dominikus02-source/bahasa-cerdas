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

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
