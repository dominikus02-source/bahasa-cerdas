/**
 * TEST — Gerbang produksi Latihan Personal (Adaptive Practice):
 * "Mulai Latihan" → "Akan Segera Hadir", tanpa sesi yang bisa dimulai.
 *
 * Memeriksa (tanpa DB):
 *  1. Flag ADAPTIVE_PRACTICE_COMING_SOON ada & TRUE di lib/diagnostic-ai/config.ts
 *  2. POST /api/player/adaptive-practice action=start ditolak 503 saat flag TRUE
 *  3. Preview adaptive membawa comingSoon:true saat flag TRUE
 *  4. ContinueLearningCard: branch gate ADAPTIVE → badge "Akan Segera Hadir",
 *     tanpa tombol mulai, tanpa onClick start, ada link jalur-cerdas
 *  5. BASELINE_COMPLETE_LOW: CTA adaptive diganti badge saat flag TRUE
 *  6. Tidak ada panggilan startAdaptiveSession tersisa di kartu
 *  7. AI_DIAGNOSTIC_DEFAULT_SIZE masih ada (regresi edit sebelumnya)
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
let pass = 0;
let fail = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
}

function read(rel: string): string {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    console.log(`  ⚠️  file tidak ada: ${rel}`);
    return "";
  }
  return readFileSync(p, "utf8");
}

console.log("Gerbang Latihan Personal (Adaptive Practice):\n");

const config = read("lib/diagnostic-ai/config.ts");
check("1. Flag ADAPTIVE_PRACTICE_COMING_SOON ada", config.includes("ADAPTIVE_PRACTICE_COMING_SOON"));
check("2. Flag bernilai FALSE (gerbang OFF — produksi aktif)", /ADAPTIVE_PRACTICE_COMING_SOON\s*=\s*false/.test(config));
check("3. Regresi: AI_DIAGNOSTIC_DEFAULT_SIZE tetap ada", config.includes("AI_DIAGNOSTIC_DEFAULT_SIZE = 10"));

const route = read("app/api/player/adaptive-practice/route.ts");
check("4. Route mengimpor flag", route.includes('ADAPTIVE_PRACTICE_COMING_SOON } from "@/lib/diagnostic-ai/config"'));
check("5. POST start ditolak 503 saat flag TRUE (gerbang server-side)",
  route.includes('if (ADAPTIVE_PRACTICE_COMING_SOON)') &&
  route.includes('status: 503') &&
  route.includes('"Latihan personal belum tersedia"'));
check("6. Guard start berada sebelum rate limit start",
  route.indexOf("if (ADAPTIVE_PRACTICE_COMING_SOON)") < route.indexOf("rateLimitRoute(req, ADAPTIVE_START_RATE_LIMIT)"));
check("7. Preview adaptive membawa comingSoon saat flag TRUE",
  route.includes("comingSoon: ADAPTIVE_PRACTICE_COMING_SOON || undefined,"));

const card = read("components/student-home/ContinueLearningCard.tsx");
check("8. Kartu mengimpor flag", card.includes('import { ADAPTIVE_PRACTICE_COMING_SOON } from "@/lib/diagnostic-ai/config"'));
check("9. Branch gate ADAPTIVE ada (isAdaptive && flag)", card.includes("isAdaptive && ADAPTIVE_PRACTICE_COMING_SOON"));
check("10. Badge 'Akan Segera Hadir' ada di kartu", (card.match(/Akan Segera Hadir/g) || []).length >= 3);
check("11. Tidak ada tombol mulai latihan (tanpa onClick start)",
  !card.includes("startAdaptiveSession") && !card.includes("Mulai Latihan"));
check("12. Link 'Sambil menunggu, mulai belajar dulu' tetap (jalur belajar umum)",
  card.includes("Sambil menunggu, mulai belajar dulu") && card.includes('href="/arena/jalur-cerdas"'));
check("13. Bar akurasi skill target tetap tampil di branch gate",
  card.includes("role=\"progressbar\"") && card.includes("aria-label={`Akurasi ${focusRow.label}`}"));
check("14. Kenapa? tetap eksplisit di branch gate", card.includes("Kenapa?"));
check("15. Kartu tetap punya px-btn-gold (diagnostik & retry — CTA belajar sah)",
  card.includes("px-btn-gold") && card.includes("Mulai Tes Awal"));
check("16. Guard literal targetSkill tidak dilanggar (test:my-day-home #15)",
  !card.includes("targetSkill"));

const homeData = read("components/student-home/home-data.tsx");
check("17. Tipe preview mendukung comingSoon", homeData.includes("comingSoon?: boolean;"));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail === 0 ? 0 : 1);
