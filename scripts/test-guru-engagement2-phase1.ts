// Unit test Fase "Guru Engagement 2.0 — Phase 1" — Next Action Guru (murni),
// hero XP/Rank (GuruLeaderboardCard WEEKLY default + gap), misi eksternal satu
// fetch, urutan hierarki beranda 5 detik, timestamp relatif Guru Berkarya,
// perbaikan precedence kredit AI. Tidak butuh koneksi DB (tes statis + logika
// murni), additive-only — tanpa route/API/model/XP engine baru.
import { readFileSync } from "fs";
import { join } from "path";
import {
  hitungNextActionGuru,
  nextActionMisiId,
  CTA_SELESAI,
} from "@/lib/guru/next-action";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const statusDengan = (selesai: string[], belum: string[]): MisiGuruStatus => {
  const semua = [...selesai, ...belum];
  return {
    mingguMulai: "2026-08-03T00:00:00.000Z",
    misi: semua.map((id) => ({ id, selesai: selesai.includes(id), jumlah: selesai.includes(id) ? 1 : 0, target: 1 })),
    totalSelesai: selesai.length,
    totalMisi: semua.length,
    xp: selesai.length * 20,
    xpMax: 140,
    level: 1,
    xpLevel: 120,
    xpPerLevel: 500,
    streak: 2,
    semuaSelesai: selesai.length === semua.length && semua.length > 0,
  };
};

// ── 1. Next Action Guru (logika murni) ─────────────────────────────────────
const na = read("lib/guru/next-action.ts");
ok("next-action.ts murni (tanpa fetch/DB)", !/fetch\(|db\.|prisma\.|import.meta/.test(na));

// (a) misi belum selesai → pilih misi XP tertinggi
{
  const status = statusDengan([], ["mgmp", "artikel", "materi"]);
  const aksi = hitungNextActionGuru(status);
  ok("Next Action pilih misi (type=misi)", aksi.type === "misi");
  ok("Next Action pilih misi XP tertinggi (artikel 50)", aksi.misiId === "artikel" && aksi.xp === 50);
  ok("Next Action carry href misi", typeof aksi.href === "string" && aksi.href.length > 0);
  ok("Next Action semuaSelesai=false saat masih ada misi", aksi.semuaSelesai === false);
}

// (b) misi yang sudah selesai tidak terpilih lagi
{
  const status = statusDengan(["artikel"], ["materi", "kelas"]);
  const aksi = hitungNextActionGuru(status);
  ok("Next Action tidak pilih misi yang sudah selesai", aksi.misiId === "materi");
}

// (c) semua selesai → fallback Artikel (CTA konten)
{
  const status = statusDengan(["mgmp", "artikel", "materi", "kelas", "kirim-materi", "toko-karya", "latihan"], []);
  const aksi = hitungNextActionGuru(status);
  ok("Semua misi selesai → fallback CTA artikel", aksi.type === "artikel");
  ok("Fallback CTA pertama = Tulis Artikel", aksi.label === "Tulis Artikel");
  ok("Fallback CTA semuaSelesai=true", aksi.semuaSelesai === true);
}

// (d) nextActionMisiId
{
  const status = statusDengan([], ["mgmp", "latihan", "artikel"]);
  ok("nextActionMisiId mengembalikan misi terpilih", nextActionMisiId(status) === "artikel");
  const selesai = statusDengan(["mgmp", "artikel", "materi", "kelas", "kirim-materi", "toko-karya", "latihan"], []);
  ok("nextActionMisiId null saat semua selesai", nextActionMisiId(selesai) === null);
}

// (e) CTA_SELESAI berisi 5 aksi konten dalam urutan hierarki
ok("CTA_SELESAI urutan Artikel→Puisi→Materi→Kelas→Karya", CTA_SELESAI.map((c) => c.type).join(",") === "artikel,puisi,materi,kelas,karya");
ok("CTA_SELESAI memakai href /guru/artikel (editor toggle internal)", CTA_SELESAI[0].href === "/guru/artikel" && CTA_SELESAI[1].href === "/guru/artikel");

// ── 2. Hero XP/Rank (GuruLeaderboardCard v2) ───────────────────────────────
const rankCard = read("components/guru/GuruLeaderboardCard.tsx");
ok("Hero default periode WEEKLY", /useState<TeacherLeaderboardPeriod>\("WEEKLY"\)/.test(rankCard));
ok("Hero fetch memakai ?period= dinamis", /\?period=\$\{period\}/.test(rankCard));
ok("Hero menampilkan selector periode dengan aria-pressed", /aria-pressed=\{period === p\.value\}/.test(rankCard));
ok("Hero menampilkan posisi #myRank", /#\{data\.myRank/.test(rankCard));
ok("Hero menampilkan XP Guru per periode", /PERIOD_XP_LABEL\[data\.period\]/.test(rankCard));
ok("Hero menghitung gap ke peringkat atas (gapNext)", /gapNext/.test(rankCard));
ok("Hero strip Level Guru Cerdas menerima misiStatus", /misiStatus/.test(rankCard));
ok("Hero menampilkan top 3", /top3\.map/.test(rankCard));
ok("Hero menautkan peringkat lengkap", /guru\/game\/leaderboard/.test(rankCard));

// ── 3. Misi Guru: status eksternal (satu fetch) + urutan + highlight ───────
const missionCard = read("components/guru/misi/GuruMissionCard.tsx");
ok("GuruMissionCard menerima prop status eksternal", /externalStatus/.test(missionCard));
ok("GuruMissionCard melewati fetch internal saat external", /if \(external\) return/.test(missionCard));
ok("GuruMissionCard mengurutkan misi belum selesai lebih dulu", /if \(sa !== sb\) return sa \? 1 : -1/.test(missionCard));
ok("GuruMissionCard menandai misi Next Action", /highlight=\{nextMisiId === m\.id\}/.test(missionCard));
ok("GuruMissionCard memakai nextActionMisiId", /nextActionMisiId/.test(missionCard));

const missionItem = read("components/guru/misi/MissionItem.tsx");
ok("MissionItem mendukung prop highlight", /highlight\?: boolean/.test(missionItem));
ok("MissionItem menampilkan badge Lanjutkan saat highlight", /Lanjutkan/.test(missionItem));
ok("MissionItem punya aria-label deskriptif", /aria-label=\{done/.test(missionItem));

// ── 4. Guru Berkarya: timestamp relatif ─────────────────────────────────────
const berkaryaUi = read("components/guru/GuruBerkarya.tsx");
ok("GuruBerkarya memakai waktu relatif (waktuRelatif)", /waktuRelatif/.test(berkaryaUi));
ok("GuruBerkarya memakai publishedAt || createdAt", /waktuRelatif\(a\.publishedAt \|\| a\.createdAt\)/.test(berkaryaUi));

// ── 5. Hierarki beranda 5 detik ─────────────────────────────────────────────
const beranda = read("app/(dashboard)/guru/beranda/page.tsx");
ok("Beranda memasang NextActionGuru", /NextActionGuru/.test(beranda));
ok("Beranda memasang GuruLeaderboardCard", /GuruLeaderboardCard/.test(beranda));
ok("Beranda memasang GuruMissionCard", /GuruMissionCard/.test(beranda));
ok("Beranda memasang GuruBerkarya", /GuruBerkarya/.test(beranda));

const posRank = beranda.indexOf("<GuruLeaderboardCard");
const posNext = beranda.indexOf("<NextActionGuru");
const posMisi = beranda.indexOf("<GuruMissionCard");
const posBerkarya = beranda.indexOf("<GuruBerkarya");
ok("Urutan DOM: XP/Rank sebelum Next Action", posRank > -1 && posNext > -1 && posRank < posNext);
ok("Urutan DOM: Next Action sebelum Misi", posNext < posMisi);
ok("Urutan DOM: Misi sebelum Guru Berkarya", posMisi < posBerkarya);
ok("GuruMissionCard memakai status eksternal (satu fetch)", /<GuruMissionCard compact external status=\{misiStatus\} \/>/.test(beranda));
ok("Beranda fetch /api/guru/misi satu kali (tanpa duplikat)", (beranda.match(/fetch\("\/api\/guru\/misi"\)/g) || []).length === 1);
ok("Precedence kredit AI diperbaiki", /\(stats\.aiUsage\?\.rpp \|\| 0\) \+ \(stats\.aiUsage\?\.soal \|\| 0\)/.test(beranda));

// ── 6. Additive-only: tanpa route/API/model baru ────────────────────────────
ok("Next Action murni tanpa referensi API baru (next-action.ts)", !/\/api\//.test(na));
const naUi = read("components/guru/misi/NextActionGuru.tsx");
ok("NextActionGuru tanpa fetch (menerima status dari induk)", !/fetch\(/.test(naUi));

// ── 7. Regresi: komponen lama tetap ada ─────────────────────────────────────
ok("GuruMissionCard tetap mendukung compact", /compact\?: boolean/.test(missionCard));
ok("GuruMissionCard tetap menampilkan progress + reward", /MissionProgress|RewardCard|LevelCard/.test(missionCard));

if (fail > 0) {
  console.log(`\n${fail} tes GAGAL.`);
  process.exit(1);
}
console.log("\nSEMUA TES LULUS.");
process.exit(0);
