/**
 * AI BC 2.0 — UI tests (Phase 5.3).
 *
 * Perilaku UI AI BC: aksi cepat persis per spesifikasi, alur landing → chat,
 * streaming SSE (parser diuji nyata), copy/retry, aksesibilitas dasar.
 */

import { readFileSync, existsSync } from "node:fs";
import { parseSseData } from "../components/ai-bc/ai-bc-stream";
import { STUDENT_QUICK_ACTIONS, TEACHER_QUICK_ACTIONS, PLACEHOLDERS } from "../components/ai-bc/ai-bc-types";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn();
    if (ok) passed++;
    else {
      failed++;
      console.error(`  ✗ ${name}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf-8") : "");

console.log("AI BC 2.0 — UI");

// 1. Aksi cepat murid (label persis)
const studentLabels = STUDENT_QUICK_ACTIONS.map((a) => a.label);
test("4 aksi cepat murid", () => studentLabels.length === 4);
test("label murid: Belajar/Latihan/Jelaskan/Tantang Aku", () =>
  studentLabels.join("|") === "Belajar|Latihan|Jelaskan|Tantang Aku");
test("aksi murid punya prompt siap kirim", () => STUDENT_QUICK_ACTIONS.every((a) => a.prompt.trim().length > 10));

// 2. Aksi cepat guru (label persis)
const teacherLabels = TEACHER_QUICK_ACTIONS.map((a) => a.label);
test("4 aksi cepat guru", () => teacherLabels.length === 4);
test("label guru: Buat Materi/Buat Soal/Rancang Pembelajaran/Cari Ide", () =>
  teacherLabels.join("|") === "Buat Materi|Buat Soal|Rancang Pembelajaran|Cari Ide");
test("aksi guru punya prompt siap kirim", () => TEACHER_QUICK_ACTIONS.every((a) => a.prompt.trim().length > 10));

// 3. Placeholder & sapaan
test("placeholder murid", () => PLACEHOLDERS.student.includes("Tanya apa saja tentang Bahasa Indonesia"));
test("placeholder guru", () => PLACEHOLDERS.teacher.includes("tempel teks"));
test("sapaan murid menyapa dan menawarkan bantuan", () =>
  read("src/ai/bc/personas.ts").includes("Halo! Aku AI BC, Teman Belajarmu"));
test("sapaan guru menyapa dan menawarkan bantuan", () =>
  read("src/ai/bc/personas.ts").includes("Halo! Aku AI BC, Teman Guru"));

// 4. Alur landing → chat
const moduleC = read("components/ai-bc/AiBcModule.tsx");
test("module punya mode landing & chat", () => moduleC.includes('"landing"') && moduleC.includes('"chat"'));
test("module menampilkan landing saat awal", () => moduleC.includes('useState<"landing" | "chat">("landing")'));
test("module memanggil streamBcChat", () => moduleC.includes("streamBcChat"));
test("module mengirim hanya pesan user/assistant", () =>
  moduleC.includes('{ role: m.role, content: m.content }'));

// 5. Streaming parser (uji nyata, tanpa jaringan)
test("parseSseData: delta valid", () => {
  const d = parseSseData('data: {"type":"delta","text":"halo"}');
  return d?.type === "delta" && d.text === "halo";
});
test("parseSseData: done membawa provider/model", () => {
  const d = parseSseData('data: {"type":"done","provider":"groq","model":"m"}');
  return d?.type === "done" && d.provider === "groq";
});
test("parseSseData: error membawa pesan", () => {
  const d = parseSseData('data: {"type":"error","message":"sibuk"}');
  return d?.type === "error" && d.message === "sibuk";
});
test("parseSseData: baris non-data → null", () => parseSseData("event: ping") === null);
test("parseSseData: JSON rusak → null", () => parseSseData('data: {rusak') === null);
test("parseSseData: payload kosong → null", () => parseSseData("data:  ") === null);
test("parser menangani frame tanpa penutup ganda (sisa buffer)", () =>
  read("components/ai-bc/ai-bc-stream.ts").includes("frames.pop()") &&
  read("components/ai-bc/ai-bc-stream.ts").includes("buffer.trim()"));

// 6. Aksesibilitas & a11y dasar
const chat = read("components/ai-bc/AiBcChatView.tsx");
test("textarea ber-aria-label", () => chat.includes('aria-label="Tulis pertanyaan"'));
test("tombol kirim ber-aria-label", () => chat.includes('aria-label="Kirim"'));
test("indikator streaming role=status", () => chat.includes('role="status"'));
test("daftar pesan aria-live", () => chat.includes('aria-live="polite"'));
test("Enter kirim / Shift+Enter baris baru", () =>
  chat.includes('e.key === "Enter"') && chat.includes("Shift"));
test("kirim nonaktif saat streaming", () => chat.includes("!canSend"));
test("ikon salin + umpan balik Tersalin", () => chat.includes("Tersalin") && chat.includes("<Check"));

// 7. Laman publik
const publicPage = read("app/ai-bc/page.tsx");
test("publik: tagline di h1/hero", () => publicPage.includes("Teman cerdas untuk belajar dan mengajar Bahasa Indonesia."));
test("publik: CTA Masuk dan Coba AI BC", () => publicPage.includes("Masuk dan Coba AI BC"));
test("publik: tanpa kata Generate", () => !publicPage.includes("Generate"));
test("publik: ada 4 kartu fitur", () => (publicPage.match(/title: "([^"]+)"/g) || []).length === 4);
test("layout publik tanpa kata Generate", () => !read("app/ai-bc/layout.tsx").includes("Generate"));

// 8. Landing komponen
const landing = read("components/ai-bc/AiBcLanding.tsx");
test("landing menyapa nama pengguna", () => landing.includes("Halo, {userName"));
test("landing memuat aksi cepat + saran konteks", () =>
  landing.includes("quickActions.map") && landing.includes("hints.map"));
test("landing menampilkan tagline", () => landing.includes("AI_BC_TAGLINE"));
test("landing memuat catatan kejujuran (bukan pengganti guru)", () =>
  landing.includes("bukan pengganti guru") || read("app/ai-bc/page.tsx").includes("bukan pengganti guru"));

// 9. Karakter AI BC (Zelby) — integrasi karakter resmi
const character = read("components/ai-bc/AICompanionCharacter.tsx");
const typesLib = read("components/ai-bc/ai-bc-types.ts");
test("aset resmi zelby_reading.webp tersedia", () =>
  existsSync("public/junior/karakter/zelby_reading.webp"));
test("aset resmi zelby_thinking.webp tersedia", () =>
  existsSync("public/junior/karakter/zelby_thinking.webp"));
test("karakter memetakan idle→reading & thinking→thinking", () =>
  character.includes('"thinking" ? "thinking" : "reading"'));
test("karakter memakai registry aset (junior/karakter)", () =>
  character.includes("gambarKarakter"));
test("landing memakai karakter (bukan ikon avatar generik)", () =>
  landing.includes("<AICompanionCharacter") && !landing.includes("w-16 h-16"));
test("chat memakai karakter sebagai avatar asisten", () =>
  chat.includes('<AICompanionCharacter state="idle" size="sm" className="mt-0.5"'));
test("gelembung idle murid: Mau tanya apa?", () =>
  typesLib.includes('idle: "Mau tanya apa?"'));
test("gelembung idle guru: Mau aku bantu kembangkan materi ini?", () =>
  typesLib.includes('idle: "Mau aku bantu kembangkan materi ini?"'));
test("gelembung thinking: Sebentar, aku pikirkan…", () =>
  typesLib.includes('thinking: "Sebentar, aku pikirkan…"'));
test("gelembung done: Ada lagi yang mau kamu tanyakan?", () =>
  typesLib.includes('done: "Ada lagi yang mau kamu tanyakan?"'));
test("aria-label karakter: Buka Teman Belajar/Guru BahasaCerdas", () =>
  typesLib.includes('"Buka Teman Belajar BahasaCerdas"') &&
  typesLib.includes('"Buka Teman Guru BahasaCerdas"'));
test("strip karakter interaktif fokus ke input", () =>
  chat.includes("inputRef.current?.focus()") && chat.includes("interactive"));
test("alur karakter: thinking saat streaming (role=status)", () =>
  chat.includes('<AICompanionCharacter state="thinking" size="sm" />') &&
  chat.includes('role={streaming ? "status" : undefined}'));
test("FAB guru memakai karakter zelby_reading", () =>
  read("components/shared/AIFloatingButton.tsx").includes('gambarKarakter("zelby", "reading")'));
test("FAB tidak memakai kata Chat", () =>
  !read("components/shared/AIFloatingButton.tsx").includes("Chat dengan AI") &&
  read("components/shared/AIFloatingButton.tsx").includes("Tanya AI BC"));
test("kartu beranda murid memakai karakter zelby_reading", () =>
  read("components/student-home/AIBCHomeCard.tsx").includes('gambarKarakter("zelby", "reading")'));
test("halaman publik hero memakai karakter zelby_reading", () =>
  publicPage.includes('gambarKarakter("zelby", "reading")'));

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI UI AI BC LULUS\n");
process.exit(0);
