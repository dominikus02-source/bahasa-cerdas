/**
 * Isi LearningSkill dari riwayat belajar yang SUDAH ADA (sekali jalan).
 *
 * Learning Loop dipasang belakangan, dan `recordActivity()` hanya mencatat
 * aktivitas BARU. Akibatnya kartu "Kemampuan Bahasamu" kosong untuk semua
 * murid — termasuk yang sudah menulis puluhan karya dan menuntaskan banyak
 * unit Jalur Cerdas. Skrip ini memetakan riwayat itu jadi keterampilan.
 *
 * Sumber pemetaan (memakai fungsi yang sama dengan jalur normal):
 *   - StudentKarya          → WRITING
 *   - UserUnitProgress      → detectUnitSkill(judul unit)
 *
 *   npm run backfill:keterampilan            # dry-run
 *   npm run backfill:keterampilan -- --execute
 */
import { PrismaClient } from "@prisma/client";
import type { LearningSkillType } from "@prisma/client";
import { detectUnitSkill, skillLevelFromXp } from "../lib/learning-loop/skills";
import { loadScriptEnv, requireDatabaseUrl } from "./_env";

loadScriptEnv();
const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });

const EXECUTE = process.argv.includes("--execute");
const XP_PER_KARYA = 12;
const XP_PER_UNIT = 8;

async function main() {
  console.log(EXECUTE ? "MODE: TULIS\n" : "MODE: DRY-RUN (pakai --execute untuk menulis)\n");

  const [karya, unit] = await Promise.all([
    db.studentKarya.groupBy({ by: ["userId"], _count: { _all: true } }),
    db.userUnitProgress.findMany({
      where: { completed: true },
      select: { userId: true, unit: { select: { title: true } } },
    }),
  ]);

  // userId → skill → xp
  const peta = new Map<string, Map<LearningSkillType, number>>();
  const tambah = (userId: string, skill: LearningSkillType, xp: number) => {
    if (!peta.has(userId)) peta.set(userId, new Map());
    const m = peta.get(userId)!;
    m.set(skill, (m.get(skill) ?? 0) + xp);
  };

  for (const k of karya) tambah(k.userId, "WRITING", k._count._all * XP_PER_KARYA);
  for (const u of unit) tambah(u.userId, detectUnitSkill(u.unit?.title ?? ""), XP_PER_UNIT);

  const sudahAda = new Set(
    (await db.learningSkill.findMany({ select: { userId: true, skill: true } }))
      .map((r) => `${r.userId}|${r.skill}`)
  );

  let barisBaru = 0;
  let muridTersentuh = 0;
  const sebaran = new Map<string, number>();

  for (const [userId, skills] of peta) {
    let adaBaru = false;
    for (const [skill, xp] of skills) {
      if (sudahAda.has(`${userId}|${skill}`)) continue; // jangan timpa yang sudah dihitung engine
      barisBaru++;
      adaBaru = true;
      sebaran.set(skill, (sebaran.get(skill) ?? 0) + 1);

      if (EXECUTE) {
        await db.learningSkill.upsert({
          where: { userId_skill: { userId, skill } },
          create: { userId, skill, xp, level: skillLevelFromXp(xp) },
          update: {},
        });
      }
    }
    if (adaBaru) muridTersentuh++;
  }

  console.log(`Murid punya riwayat  : ${peta.size}`);
  console.log(`Murid dapat keterampilan baru: ${muridTersentuh}`);
  console.log(`Baris LearningSkill baru     : ${barisBaru}\n`);
  console.log("Sebaran keterampilan:");
  [...sebaran.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([s, n]) => console.log(`  ${s.padEnd(12)} ${n} murid`));

  if (!EXECUTE) console.log("\n(dry-run — tidak ada yang ditulis)");
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
