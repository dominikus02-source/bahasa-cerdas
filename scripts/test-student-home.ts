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

// 2 — Hierarki: HERO → CONTINUE → AI BC → JOURNEY → KARYA → ARENA → KABAR
const required = [
  "StudentHomeHero",
  "ContinueLearningCard",
  "AIBCHomeCard",
  "LearningJourneySection",
  "RecentWorksSection",
  "ArenaHomeSection",
  "SecondaryLearningInfo",
];
for (const c of required) {
  check(`Halaman merender <${c} />`, page.includes(`<${c} />`));
}
check("QuickActions TIDAK dirender", !page.includes("QuickActions"));
check(
  "Urutan: Continue sebelum AI BC",
  page.indexOf("<ContinueLearningCard />") < page.indexOf("<AIBCHomeCard />")
);
check(
  "Urutan: AI BC sebelum Journey (mobile full-width)",
  page.indexOf("<AIBCHomeCard />") < page.indexOf("<LearningJourneySection />")
);
check(
  "Urutan: Journey sebelum Recent Works",
  page.indexOf("<LearningJourneySection />") < page.indexOf("<RecentWorksSection />")
);
check(
  "Urutan: Recent Works sebelum Arena Gateway",
  page.indexOf("<RecentWorksSection />") < page.indexOf("<ArenaHomeSection />")
);
check(
  "Urutan: Arena Gateway sebelum Kabar Kelas",
  page.indexOf("<ArenaHomeSection />") < page.indexOf("<SecondaryLearningInfo />")
);
check(
  "Desktop: AI BC & Journey berbagi baris (grid lg:grid-cols-2)",
  page.includes("grid-cols-1 lg:grid-cols-2 gap-8")
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
check("Arena Gateway: tidak fetch /api/player/profile", !arena.includes('"/api/player/profile"'));
check("Arena Gateway: tidak fetch /api/player/quests", !arena.includes('"/api/player/quests"'));
check("Arena Gateway: tidak fetch /api/player/badges", !arena.includes('"/api/player/badges"'));
check("Arena Gateway: tidak fetch /api/murid/dashboard/summary", !arena.includes('"/api/murid/dashboard/summary"'));
check("Arena Gateway: tanpa quest bars/XpSeason/posisi (tanpa getQuestMeta)", !arena.includes("getQuestMeta"));
check("Arena Gateway: tanpa tombol Kuis Tempur/Liga/Misi", !arena.includes("kuis-tempur") && !arena.includes("/arena/league"));

// 6 — CTA hierarchy: primary "Lanjutkan", secondary AI
const continueCard = read("components/student-home/ContinueLearningCard.tsx");
check("Continue = satu primary CTA (tanpa ghost button)", !continueCard.includes("Jelajahi Jalur Cerdas"));
const aiCard = read("components/student-home/AIBCHomeCard.tsx");
check("AI BC → /arena/ai", aiCard.includes('href="/arena/ai"'));
check("AI BC copy companion ('Tanya BC. Kita belajar bareng.')", aiCard.includes("Kita belajar bareng"));
check("AI BC CTA 'Tanya AI BC →'", aiCard.includes("Tanya AI BC"));

// 7 — Hero ringkas: identitas + XP singkat, tanpa dashboard statistik
const hero = read("components/student-home/StudentHomeHero.tsx");
check("Hero pakai /api/player/profile", hero.includes('"/api/player/profile"'));
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
check("Secondary: pakai /api/murid/dashboard/summary", secondary.includes('"/api/murid/dashboard/summary"'));

// 9 — Route canonical lain
const journey = read("components/student-home/LearningJourneySection.tsx");
check("Journey → /murid/simulasi/ukbi", journey.includes("/murid/simulasi/ukbi"));
check("Journey → /arena/jalur-cerdas", journey.includes("/arena/jalur-cerdas"));
check("Journey pakai /api/player/journey", journey.includes('"/api/player/journey?limit=3"'));
const works = read("components/student-home/RecentWorksSection.tsx");
check("Karya → /api/siswa/karya?limit=4", works.includes('"/api/siswa/karya?limit=4"'));
check("Karya → CTA /arena/feed", works.includes('href="/arena/feed"'));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);