import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.db.local" });
import { PrismaClient } from "@prisma/client";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

const db = new PrismaClient();
const badgesDir = join(process.cwd(), "public/badges");
const existing = new Set(readdirSync(badgesDir));
const rankDir = join(process.cwd(), "public/Rank BC");
const rankExisting = new Set(readdirSync(rankDir));

async function main() {
  const badges = await db.badge.findMany({ orderBy: { code: "asc" } });
  console.log(`Total badge di DB: ${badges.length}\n`);
  let broken = 0;
  for (const b of badges) {
    const icon = (b as any).icon as string;
    if (!icon) {
      console.log(`⚠️  ${b.code} (${b.name}) — icon KOSONG`);
      broken++;
      continue;
    }
    if (icon.startsWith("/badges/")) {
      const f = icon.replace("/badges/", "");
      if (!existing.has(f)) {
        console.log(`💥 ${b.code} (${b.name}) — icon ${icon} TIDAK ADA di public/badges`);
        broken++;
      }
    } else if (icon.startsWith("/Rank")) {
      const f = icon.split("/").pop() || "";
      if (!rankExisting.has(f)) {
        console.log(`💥 ${b.code} (${b.name}) — icon ${icon} TIDAK ADA di public/Rank BC`);
        broken++;
      }
    } else if (icon.startsWith("/")) {
      const p = join(process.cwd(), "public", icon.replace(/^\//, ""));
      if (!existsSync(p)) {
        console.log(`💥 ${b.code} (${b.name}) — icon ${icon} TIDAK ADA (file ${p})`);
        broken++;
      }
    } else {
      // emoji / teks — aman (dirender sebagai teks)
    }
  }
  console.log(`\n${broken === 0 ? "✅ SEMUA ICON BADGE VALID" : `💥 ${broken} badge icon broken`}`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
