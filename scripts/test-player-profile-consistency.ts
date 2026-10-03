import "../src/main-bersama/infrastructure/persistence/require-test-db";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { getPlayerProfile } from "../lib/gamification/player";
import { levelFromXp } from "../lib/gamification/levels";
import { rankFromLevel } from "../lib/gamification/ranks";

async function main() {
  const id = `qa-profile-${randomUUID()}`;
  try {
    await db.user.create({ data: { id, supabaseId: randomUUID(), email: `${id}@example.com`, fullName: "QA profile", xp: 636 } });
    const fresh = await getPlayerProfile(id);
    assert.equal(fresh.totalXp, 636);
    assert.equal(fresh.level, levelFromXp(636));
    assert.equal(fresh.rank, rankFromLevel(fresh.level));
    await db.playerProfile.update({ where: { userId: id }, data: { totalXP: 999999, level: 99 } });
    const stale = await getPlayerProfile(id);
    assert.equal(stale.totalXp, 636);
    assert.equal(stale.level, fresh.level);
    assert.deepEqual(stale.levelProgress, fresh.levelProgress);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id } })).xp, 636);
    console.log("PASS fresh and stale PlayerProfile views match canonical User XP, level, rank; no XP awarded or altered.");
  } finally { await db.user.deleteMany({ where: { id } }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
