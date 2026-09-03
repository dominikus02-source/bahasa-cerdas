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

// 2 — Hierarki My Day: HERO → AKSI (+mentor) → SKILL → MOTIVASI → PREMIUM
// → PINTAS (AI BC + JOURNEY) → RUANG → SIMULASI → KARYA → KABAR
const required = [
  "StudentHomeHero",
  "ContinueLearningCard",
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
order("StudentHomeHero", "ContinueLearningCard", "sapaan dulu");
order("ContinueLearningCard", "SkillRadar", "aksi hari ini dominan");
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
  "ContinueLearningCard.tsx",
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

// 6 — CTA hierarchy: primary "Lanjutkan", secondary AI
const continueCard = read("components/student-home/ContinueLearningCard.tsx");
check("Continue = satu primary CTA (tanpa ghost button)", !continueCard.includes("Jelajahi Jalur Cerdas"));
// Personal Learning Home: HERO = satu-satunya CTA utama (gradient emas).
// ContinueLearningCard demoted ke sekunder (px-btn-ghost) agar tidak bersaing,
// tapi konten penjelas/mentor-nya tetap utuh. Klaim misi harian tetap gold
// (aksi reward, bukan aksi belajar — di luar scope kontrak ini).
const goldFiles = [
  "StudentHomeHero.tsx",
  "ContinueLearningCard.tsx",
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
check(
  "Satu CTA utama di hero (gold) — ContinueLearningCard sekunder (ghost)",
  goldFiles.length === 0 &&
    !continueCard.includes("px-btn-gold") &&
    continueCard.includes("px-btn-ghost") &&
    read("components/student-home/StudentHomeHero.tsx").includes("from-[#ffd24a]")
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

// 10 — MURID HOME 3.0: Next Best Action dominant + learning-first order
console.log("\nMURID HOME 3.0 (additive):\n");
const page3 = read("app/(dashboard)/murid/beranda/page.tsx");
check("3.0 Misi Harian (motivasi) pindah SETELAH perjalanan belajar (journey)",
  page3.indexOf("<LearningJourneySection />") < page3.indexOf("<DailyMissionCard />"));
check("3.0 Urutan learning-first utuh: hero → aksi → skill → journey → misi → ruang",
  page3.indexOf("<StudentHomeHero />") < page3.indexOf("<ContinueLearningCard />") &&
  page3.indexOf("<ContinueLearningCard />") < page3.indexOf("<SkillRadar") &&
  page3.indexOf("<SkillRadar") < page3.indexOf("<LearningJourneySection />") &&
  page3.indexOf("<LearningJourneySection />") < page3.indexOf("<DailyMissionCard />") &&
  page3.indexOf("<DailyMissionCard />") < page3.indexOf("<RuangBelajarSection />"));
check("3.0 Hero = satu-satunya CTA utama; kartu aksi pakai ghost (di luar klaim misi harian)",
  !read("components/student-home/ContinueLearningCard.tsx").includes("px-btn-gold") &&
  read("components/student-home/ContinueLearningCard.tsx").includes("px-btn-ghost") &&
  ["AIBCHomeCard.tsx", "ArenaHomeSection.tsx", "LearningJourneySection.tsx"]
    .every((f) => !read(`components/student-home/${f}`).includes("px-btn-gold")));
const card3 = read("components/student-home/ContinueLearningCard.tsx");
check("3.0 'Kenapa?' eksplisit di kartu aksi (why test)", card3.includes("Kenapa?"));
check("3.0 Bar akurasi skill target: role=progressbar + aria-valuenow (a11y)",
  card3.includes("role=\"progressbar\"") && card3.includes("aria-valuenow"));
check("3.0 Data bar turunan dari data preview — tanpa fetch baru",
  !card3.includes('"/api/player/skills"') && !card3.includes('"/api/player/journey"') &&
  read("components/student-home/home-data.tsx").includes("findFocusSkillRow"));
check("3.0 Kartu bebas literal skill-target (guard test:my-day-home #15)",
  !card3.includes("targetSkill"));
check("3.0 Laporan audit ada (docs/MURID_HOME_3_0_AUDIT.md)",
  existsSync(join(ROOT, "docs/MURID_HOME_3_0_AUDIT.md")));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);