/**
 * TEST — Gerbang produksi Latihan Personal (Adaptive Practice):
 * flag ADAPTIVE_PRACTICE_COMING_SOON = false → "Aksi Hari Ini" TERBUKA.
 *
 * Memeriksa (tanpa DB):
 *  1. Flag ADAPTIVE_PRACTICE_COMING_SOON ada & FALSE (gerbang terbuka)
 *  2. POST /api/player/adaptive-practice action=start TIDAK lagi ditolak gerbang
 *     (guard ada utk re-aktivasi, tapi dengan flag false alur start jalan)
 *  3. Preview adaptive membawa comingSoon undefined saat flag false
 *  4. ContinueLearningCard: branch PROFILE_READY/CONFIDENT menampilkan tombol
 *     "Mulai Latihan Personal" (startAdaptiveSession, POST start, redirect)
 *  5. Branch gate (isAdaptive && flag) tetap ada — siap bila flag di-reaktivasi
 *  6. AI_DIAGNOSTIC_DEFAULT_SIZE masih ada (regresi edit sebelumnya)
 *  7. AI_DIAGNOSTIC_COMING_SOON tetap true (soal AI diagnostik belum produksi)
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
check("2. Flag bernilai FALSE (gerbang terbuka)", /ADAPTIVE_PRACTICE_COMING_SOON\s*=\s*false/.test(config));
check("3. AI_DIAGNOSTIC_COMING_SOON tetap true (soal AI belum produksi)", config.includes("AI_DIAGNOSTIC_COMING_SOON = true"));
check("4. Regresi: AI_DIAGNOSTIC_DEFAULT_SIZE tetap ada", config.includes("AI_DIAGNOSTIC_DEFAULT_SIZE = 10"));

const route = read("app/api/player/adaptive-practice/route.ts");
check("5. Route mengimpor flag", route.includes('ADAPTIVE_PRACTICE_COMING_SOON } from "@/lib/diagnostic-ai/config"'));
check("6. Guard gerbang masih ada (untuk re-aktivasi bila flag true)",
  route.includes('if (ADAPTIVE_PRACTICE_COMING_SOON)') &&
  route.includes('status: 503') &&
  route.includes('"Latihan personal belum tersedia"'));
check("7. Preview adaptive membawa comingSoon saat flag true",
  route.includes("comingSoon: ADAPTIVE_PRACTICE_COMING_SOON || undefined,"));

const card = read("components/student-home/ContinueLearningCard.tsx");
check("8. Kartu mengimpor flag", card.includes('import { ADAPTIVE_PRACTICE_COMING_SOON } from "@/lib/diagnostic-ai/config"'));
check("9. Branch gate ADAPTIVE tetap ada (isAdaptive && flag)", card.includes("isAdaptive && ADAPTIVE_PRACTICE_COMING_SOON"));
check("10. Branch PROFILE_READY punya tombol mulai saat gate terbuka",
  card.includes("onClick={startAdaptiveSession}") && card.includes('aria-label="Mulai Latihan Personal"'));
check("11. Badge 'Akan Segera Hadir' HANYA di 3 conditional branch + 1 komentar (bukan banner tetap)",
  (card.match(/Akan Segera Hadir/g) || []).length === 4);
check("12. startAdaptiveSession melakukan POST start + redirect ke arena/adaptive-practice",
  card.includes('"/api/player/adaptive-practice"') &&
  card.includes('action: "start"') &&
  card.includes("`/arena/adaptive-practice/${data.sessionId}`"));
check("13. startDiagnosticSession tetap ada (Tes Awal)", card.includes("startDiagnosticSession"));
check("14. Link 'Sambil menunggu, mulai belajar dulu' tetap (branch gate/coming soon)",
  card.includes("Sambil menunggu, mulai belajar dulu") && card.includes('href="/arena/jalur-cerdas"'));
check("15. Bar akurasi skill target tetap tampil", card.includes('role="progressbar"') && card.includes('aria-label={`Akurasi ${focusRow.label}`}'));
check("16. 'Kenapa?' tetap eksplisit", card.includes("Kenapa?"));
check("17. Kartu tetap punya px-btn-gold (diagnostik & CTA belajar sah)",
  card.includes("px-btn-gold") && card.includes("Mulai Tes Awal"));
check("18. Guard literal targetSkill tidak dilanggar (test:my-day-home #15)",
  !card.includes("targetSkill"));

const homeData = read("components/student-home/home-data.tsx");
check("19. Tipe preview mendukung comingSoon", homeData.includes("comingSoon?: boolean;"));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail === 0 ? 0 : 1);