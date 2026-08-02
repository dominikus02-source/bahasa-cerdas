/**
 * Backfill progresi ke sistem resmi (sekali jalan).
 *
 * Sampai Sprint 6 ada dua tumpukan progresi:
 *   - lib/xp.ts     → User.level = floor(xp/500)+1, User.league 4 tingkat
 *   - gamification/ → PlayerProfile.level & currentRank dari kurva resmi
 *
 * `User.xp` adalah total yang benar (semua aktivitas belajar masuk ke sana lewat
 * awardXp), sedangkan `PlayerProfile.totalXP` hanya terisi dari jalur Sprint 6
 * sehingga tertinggal jauh. Skrip ini menyelaraskan semuanya dari User.xp:
 *
 *   User.level              ← levelFromXp(User.xp)
 *   PlayerProfile.totalXP   ← User.xp
 *   PlayerProfile.level     ← levelFromXp(User.xp)
 *   PlayerProfile.currentRank ← rankFromLevel(level)
 *
 * Level murid akan BERUBAH (kurva lama jauh lebih longgar). Contoh: 40.000 XP
 * dari "Level 81" menjadi "Level 53 — Sapphire, Guru Bahasa". Ini disengaja;
 * kurva resmi berhenti di 100 sedangkan kurva lama tidak punya batas.
 *
 * Jalankan:
 *   npm run backfill:progresi            # dry-run, tidak menulis apa pun
 *   npm run backfill:progresi -- --execute
 */
import { db } from "@/lib/db";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";

const EXECUTE = process.argv.includes("--execute");
const BATCH = 200;

async function main() {
  console.log(EXECUTE ? "MODE: TULIS\n" : "MODE: DRY-RUN (pakai --execute untuk menulis)\n");

  const total = await db.user.count();
  console.log(`Total user: ${total}\n`);

  let diproses = 0;
  let levelBerubah = 0;
  let profilDibuat = 0;
  let xpDiselaraskan = 0;
  const contoh: string[] = [];
  const sebaranRank = new Map<string, number>();

  for (let skip = 0; skip < total; skip += BATCH) {
    const users = await db.user.findMany({
      skip,
      take: BATCH,
      orderBy: { id: "asc" },
      select: {
        id: true,
        fullName: true,
        xp: true,
        level: true,
        playerProfile: { select: { id: true, totalXP: true, level: true, currentRank: true } },
      },
    });

    for (const u of users) {
      diproses++;
      const xp = u.xp || 0;
      const levelBaru = levelFromXp(xp);
      const rankBaru = rankFromLevel(levelBaru);

      sebaranRank.set(rankBaru, (sebaranRank.get(rankBaru) ?? 0) + 1);

      if (u.level !== levelBaru) {
        levelBerubah++;
        if (contoh.length < 10) {
          contoh.push(
            `  ${(u.fullName || u.id).slice(0, 28).padEnd(28)} ${String(xp).padStart(7)} XP  Lv ${String(u.level).padStart(3)} → ${String(levelBaru).padStart(3)}  ${rankBaru}`
          );
        }
      }
      if (!u.playerProfile) profilDibuat++;
      else if (u.playerProfile.totalXP !== xp) xpDiselaraskan++;

      if (!EXECUTE) continue;

      await db.user.update({ where: { id: u.id }, data: { level: levelBaru } });
      await db.playerProfile.upsert({
        where: { userId: u.id },
        create: { userId: u.id, totalXP: xp, level: levelBaru, currentRank: rankBaru },
        update: { totalXP: xp, level: levelBaru, currentRank: rankBaru },
      });
    }

    process.stdout.write(`\r  diproses ${diproses}/${total}`);
  }

  console.log("\n");
  console.log(`Level berubah        : ${levelBerubah}`);
  console.log(`PlayerProfile dibuat : ${profilDibuat}`);
  console.log(`totalXP diselaraskan : ${xpDiselaraskan}`);

  if (contoh.length) {
    console.log("\nContoh perubahan level:");
    contoh.forEach((c) => console.log(c));
  }

  console.log("\nSebaran rank sesudah backfill:");
  for (const r of ["BRONZE", "SILVER", "GOLD", "EMERALD", "RUBY", "SAPPHIRE", "DIAMOND", "MASTER", "LEGEND"]) {
    const n = sebaranRank.get(r) ?? 0;
    if (n > 0) console.log(`  ${r.padEnd(9)} ${n}`);
  }

  if (!EXECUTE) console.log("\n(dry-run — tidak ada yang ditulis)");
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
