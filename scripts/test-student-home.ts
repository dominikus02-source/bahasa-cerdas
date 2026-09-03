import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function read(rel: string): string {
  const p = join(ROOT, rel);
  if (!existsSync(p)) throw new Error(`File tidak ditemukan: ${rel}`);
  return readFileSync(p, "utf8");
}

function noFile(rel: string): boolean {
  return !existsSync(join(ROOT, rel));
}

console.log("TEST STUDENT HOME 2.0 POLISH (statis, tanpa DB)\n");

// 1 — Halaman beranda: client component + theme scoped + struktur
const page = read("app/(dashboard)/murid/beranda/page.tsx");
check("Beranda = client component", page.includes('"use client"'));
check("Import player-theme.css di halaman (bukan layout)", page.includes('import "@/app/arena/player-theme.css"'));
check("Wrapper .px-theme di root", page.includes('className="px-theme'));
check("Container max-w-[1200px]", page.includes("max-w-[1200px]"));

// 2 — Hierarki Personal Learning Home: HERO → SKILL (kemampuan) → MOTIVASI → PREMIUM
// → PINTAS (AI BC + JOURNEY) → RUANG → SIMULASI → KARYA → KABAR
// ContinueLearningCard TIDAK dirender — fungsi aksi/state diambil alih Hero.
check("ContinueLearningCard TIDAK dirender di beranda", !page.includes("ContinueLearningCard"));
const required = [
  "StudentHomeHero",
  "SkillRadar",
  "ArenaHomeSection",
  "PremiumValueCard",
  "AIBCHomeCard",
  "LearningJourneySection",
  "RuangBelajarSection",
  "SimulasiUjianSection",
  "RecentWorksSection",
  "SecondaryLearningInfo",
];
for (const c of required) {
  // SkillRadar di-render multiline (<SkillRadar\n  skills=...) — cocokkan tag-nya
  // secara whitespace-tolerant, bukan string literal kaku.
  check(`Halaman merender <${c} />`, c === "SkillRadar" ? page.includes("<SkillRadar") && page.includes("skills=") : page.includes(`<${c} />`));
}
check("QuickActions TIDAK dirender", !page.includes("QuickActions"));
const marker = (c: string) => (c === "SkillRadar" ? "<SkillRadar" : `<${c} />`);
const order = (a: string, b: string, label: string) =>
  check(`Urutan: ${a} sebelum ${b} (${label})`, page.indexOf(marker(a)) < page.indexOf(marker(b)));
order("StudentHomeHero", "SkillRadar", "hero dulu, kemampuan naik natural");
order("SkillRadar", "ArenaHomeSection", "skill sebelum motivasi");
order("ArenaHomeSection", "PremiumValueCard", "motivasi sebelum premium");
order("PremiumValueCard", "AIBCHomeCard", "premium sebelum pintas belajar");
order("AIBCHomeCard", "LearningJourneySection", "AI BC sebelum journey");
order("LearningJourneySection", "RuangBelajarSection", "pintas sebelum ruang");
order("RuangBelajarSection", "SimulasiUjianSection", "ruang sebelum simulasi");
order("SimulasiUjianSection", "RecentWorksSection", "simulasi sebelum karya");
order("RecentWorksSection", "SecondaryLearningInfo", "karya sebelum kabar");
check(
  "Desktop: skill/motivasi & AI BC/journey berbagi baris (grid lg:grid-cols-2)",
  page.includes("grid grid-cols-1 lg:grid-cols-2 gap-6")
);

// 3 — Heartbeat dipertahankan
check("Heartbeat POST /api/user/heartbeat dipertahankan", page.includes('"/api/user/heartbeat"'));
check("Interval heartbeat 300s dipertahankan", page.includes("300000"));
check("Heartbeat timeout awal 5s", page.includes("5000"));

// 4 — QuickActions dihapus total (file + referensi)
check("QuickActions.tsx tidak ada (file dihapus)", noFile("components/student-home/QuickActions.tsx"));
const allCompFiles = [
  "StudentHomeHero.tsx",
  "AIBCHomeCard.tsx",
  "LearningJourneySection.tsx",
  "ArenaHomeSection.tsx",
  "RecentWorksSection.tsx",
  "SecondaryLearningInfo.tsx",
];
const allComp = allCompFiles.map((f) => read(`components/student-home/${f}`)).join("\n");
check("Tidak ada referensi QuickActions di komponen", !allComp.includes("QuickActions"));
check("Tidak ada Math.random() di komponen", !allComp.includes("Math.random"));

// 5 — Arena Gateway: hanya pintu masuk, tanpa dashboard Arena
const arena = read("components/student-home/ArenaHomeSection.tsx");
check("Arena Gateway → /arena (Masuk Arena)", arena.includes('href="/arena"'));
check("Arena Gateway: tidak fetch /api/player/profile sendiri (via konteks home-data)", !arena.includes('"/api/player/profile"') && arena.includes("useHomeData"));
check("Arena Gateway: tidak fetch /api/player/quests", !arena.includes('"/api/player/quests"'));
check("Arena Gateway: tidak fetch /api/player/badges", !arena.includes('"/api/player/badges"'));
check("Arena Gateway: tidak fetch /api/murid/dashboard/summary", !arena.includes('"/api/murid/dashboard/summary"'));
check("Arena Gateway: tanpa quest bars/XpSeason/posisi (tanpa getQuestMeta)", !arena.includes("getQuestMeta"));
check("Arena Gateway: tanpa tombol Kuis Tempur/Liga/Misi", !arena.includes("kuis-tempur") && !arena.includes("/arena/league"));

// 6 — CTA hierarchy: HERO = satu-satunya CTA utama (gradient emas).
// ContinueLearningCard sudah dihapus (duplikat hero). Klaim misi harian tetap
// gold (aksi reward, bukan aksi belajar — di luar scope kontrak ini).
check("File ContinueLearningCard.tsx dihapus (dead code)", noFile("components/student-home/ContinueLearningCard.tsx"));
const goldFiles = [
  "StudentHomeHero.tsx",
  "AIBCHomeCard.tsx",
  "LearningJourneySection.tsx",
  "ArenaHomeSection.tsx",
  "RecentWorksSection.tsx",
  "SecondaryLearningInfo.tsx",
  "RuangBelajarSection.tsx",
  "SimulasiUjianSection.tsx",
  "PremiumValueCard.tsx",
  "home-data.tsx",
].filter((f) => read(`components/student-home/${f}`).includes("px-btn-gold"));
const heroGold = read("components/student-home/StudentHomeHero.tsx");
check(
  "Satu CTA utama: hero (gold gradient), tanpa px-btn-gold lain di student-home",
  goldFiles.length === 0 && heroGold.includes("from-[#ffd24a]")
);
const aiCard = read("components/student-home/AIBCHomeCard.tsx");
check("AI BC → /arena/ai", aiCard.includes('href="/arena/ai"'));
check("AI BC copy companion ('Tanya BC. Kita belajar bareng.')", aiCard.includes("Kita belajar bareng"));
check("AI BC CTA 'Tanya AI BC →'", aiCard.includes("Tanya AI BC"));

// 7 — Hero ringkas: identitas + XP singkat, tanpa dashboard statistik
const homeData = read("components/student-home/home-data.tsx");
const hero = read("components/student-home/StudentHomeHero.tsx");
check("Data profil dari konteks bersama home-data", homeData.includes('"/api/player/profile"') && hero.includes("useHomeData"));
check("Hero pakai RankChip", hero.includes("RankChip"));
check("Hero pakai XpProgressBar compact", hero.includes("compact"));
check("Hero: tanpa kartu Pencapaian/achievement counts", !hero.includes("Pencapaian") && !hero.includes("summary.badges"));
check("Hero: ada sambutan 'Siap belajar hari ini?'", hero.includes("Siap belajar hari ini?"));
check("Profil → /murid/profile (canonical)", hero.includes('href="/murid/profile"'));
check("Tidak ada /arena/profile di hero", !hero.includes("/arena/profile"));

// 8 — Kabar Kelas kompak: tanpa social avatars, tanpa tombol dobel tugas
const secondary = read("components/student-home/SecondaryLearningInfo.tsx");
check("Secondary: tanpa murid aktif avatars", !secondary.includes("/api/siswa/aktif") && !secondary.includes("displayName.charAt"));
check("Secondary: tanpa tombol 'Tugas Saya'", !secondary.includes("Tugas Saya"));
check("Secondary: tanpa 'Hari ini: aktivitas' stats dobel", !allComp.includes("Hari ini:"));

// 9 — Route canonical lain
const journey = read("components/student-home/LearningJourneySection.tsx");
check("Summary: SATU fetch di home-data (tanpa duplikat)", homeData.includes('"/api/murid/dashboard/summary"') && !secondary.includes('"/api/murid/dashboard/summary"') && !journey.includes('"/api/murid/dashboard/summary"'));
check("Journey → /murid/simulasi/ukbi", journey.includes("/murid/simulasi/ukbi"));
check("Journey → /arena/jalur-cerdas", journey.includes("/arena/jalur-cerdas"));
check("Journey pakai /api/player/journey", journey.includes('"/api/player/journey?limit=3"'));
const works = read("components/student-home/RecentWorksSection.tsx");
check("Karya → /api/siswa/karya?limit=4", works.includes('"/api/siswa/karya?limit=4"'));
check("Karya → CTA /murid/karya", works.includes('href="/murid/karya"') && works.includes('href="/murid/karya/tulis"'));

// 10 — Personal Learning Home: hero = single learning entry + learning-first order
console.log("\nPERSONAL LEARNING HOME (additive):\n");
const page3 = read("app/(dashboard)/murid/beranda/page.tsx");
check("3.0 Misi Harian (motivasi) pindah SETELAH perjalanan belajar (journey)",
  page3.indexOf("<LearningJourneySection />") < page3.indexOf("<DailyMissionCard />"));
check("3.0 Urutan learning-first utuh: hero → skill → journey → misi → ruang (tanpa kartu aksi duplikat)",
  page3.indexOf("<StudentHomeHero />") < page3.indexOf("<SkillRadar") &&
  page3.indexOf("<SkillRadar") < page3.indexOf("<LearningJourneySection />") &&
  page3.indexOf("<LearningJourneySection />") < page3.indexOf("<DailyMissionCard />") &&
  page3.indexOf("<DailyMissionCard />") < page3.indexOf("<RuangBelajarSection />"));
const hero3 = read("components/student-home/StudentHomeHero.tsx");
check("3.0 Hero = satu-satunya CTA utama di home (tanpa px-btn-gold lain)",
  ["AIBCHomeCard.tsx", "ArenaHomeSection.tsx", "LearningJourneySection.tsx", "StudentHomeHero.tsx"]
    .every((f) => !read(`components/student-home/${f}`).includes("px-btn-gold")) &&
  hero3.includes("from-[#ffd24a]"));
check("3.0 State machine di hero (resolveHeroContent) — tidak ada duplikat kartu",
  hero3.includes("resolveHeroContent") &&
  hero3.includes("assessmentState") &&
  hero3.includes("DIAGNOSTIC") &&
  hero3.includes("ADAPTIVE_PRACTICE") &&
  hero3.includes("comingSoon"));
check("3.0 Hero tanpa engine rekomendasi kedua (server-authoritative)",
  !hero3.includes("targetSkill") && !hero3.includes("/api/player/next-action") &&
  !hero3.includes("/api/player/skills") && !hero3.includes("/api/player/journey"));
check("3.0 Laporan audit ada (docs/MURID_HOME_3_0_AUDIT.md)",
  existsSync(join(ROOT, "docs/MURID_HOME_3_0_AUDIT.md")));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);