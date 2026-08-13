/**
 * AI BC 2.0 — Persona tests (Phase 5.3).
 *
 * Behavioral test terhadap engine persona yang MURNI (tanpa DB):
 * - Identitas "AI BC" dan tagline resmi.
 * - Bahasa Indonesia, tanpa klise "Sebagai AI", tanpa klaim provider lain,
 *   tanpa domain mati (bahasacerdas.site), tanpa "Gemini".
 * - Persona murid vs guru berbeda dan sesuai peran.
 * - Klasifikasi maksud (classifyIntent) benar.
 * - Pemangkasan riwayat (buildChatHistory) benar.
 * - Penyusunan prompt (buildSystemPrompt) menyertakan konteks + mode.
 */

import {
  STUDENT_PERSONA,
  TEACHER_PERSONA,
  getPersonaForRole,
  classifyIntent,
  buildChatHistory,
  buildSystemPrompt,
  HISTORY_CAP,
} from "../src/ai/bc/personas";

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

console.log("AI BC 2.0 — PERSONA");

const both = [STUDENT_PERSONA, TEACHER_PERSONA];
const allPrompts = both.map((p) => p.systemPrompt).join("\n");

// 1. Identitas & tagline
test("persona murid ada", () => STUDENT_PERSONA.key === "student");
test("persona guru ada", () => TEACHER_PERSONA.key === "teacher");
test("tagline resmi ada di kedua persona", () =>
  STUDENT_PERSONA.tagline === TEACHER_PERSONA.tagline &&
  STUDENT_PERSONA.tagline.includes("Teman cerdas untuk belajar dan mengajar Bahasa Indonesia"));
test("persona murid = Teman Belajarmu", () => STUDENT_PERSONA.title === "Teman Belajarmu");
test("persona guru = Teman Guru", () => TEACHER_PERSONA.title === "Teman Guru");
test("prompt menyebut identitas AI BC", () =>
  allPrompts.includes("AI BC") && allPrompts.includes("Teman Belajarmu") && allPrompts.includes("Teman Guru"));

// 2. Kualitas prompt
test("tidak ada klise pembuka 'Sebagai AI,'", () => !allPrompts.toLowerCase().includes("sebagai ai,"));
test("tidak ada 'Sebagai asisten'", () => !allPrompts.toLowerCase().includes("sebagai asisten"));
test("tidak ada domain mati bahasacerdas.site", () => !allPrompts.includes("bahasacerdas.site"));
test("tidak ada klaim Gemini", () => !allPrompts.includes("Gemini") && !allPrompts.includes("gemini"));
test("tidak ada klaim Google", () => !allPrompts.toLowerCase().includes("google"));
test("prompt murid bicara soal murid (scaffolding)", () =>
  STUDENT_PERSONA.systemPrompt.toLowerCase().includes("murid") &&
  STUDENT_PERSONA.systemPrompt.toLowerCase().includes("bimbing"));
test("prompt guru bicara soal guru (RPP/asesmen)", () =>
  TEACHER_PERSONA.systemPrompt.toLowerCase().includes("guru") &&
  TEACHER_PERSONA.systemPrompt.toLowerCase().includes("rpp"));
test("sapaan murid & guru berbeda", () => STUDENT_PERSONA.greeting !== TEACHER_PERSONA.greeting);
test("sapaan tidak memakai emoji", () => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(STUDENT_PERSONA.greeting + TEACHER_PERSONA.greeting));

// 3. Pemetaan peran
test("MURID → persona murid", () => getPersonaForRole("MURID").key === "student");
test("GURU → persona guru", () => getPersonaForRole("GURU").key === "teacher");
test("ADMIN → persona guru", () => getPersonaForRole("ADMIN").key === "teacher");
test("FOUNDER → persona guru", () => getPersonaForRole("FOUNDER").key === "teacher");
test("tanpa role → persona murid (default aman)", () => getPersonaForRole(null).key === "student");

// 4. classifyIntent
test("soal → latihan", () => classifyIntent("Buatkan 5 soal tentang puisi") === "latihan");
test("kuis → latihan", () => classifyIntent("Aku mau kuis kata baku") === "latihan");
test("jelaskan → jelaskan", () => classifyIntent("Jelaskan apa itu kata depan") === "jelaskan");
test("perbedaan → jelaskan", () => classifyIntent("Apa perbedaan di mana dan dimana?") === "jelaskan");
test("contoh kalimat → contoh", () => classifyIntent("Buat contoh kalimat dengan kata apresiasi") === "contoh");
test("koreksi paragraf → menulis", () => classifyIntent("Koreksi paragraf berikut: ini teks") === "menulis");
test("cara mengajar → strategi", () => classifyIntent("Bagaimana cara mengajar puisi yang menyenangkan?") === "strategi");
test("rpp → strategi", () => classifyIntent("Buatkan RPP materi cerpen") === "strategi");
test("pertanyaan tanda tanya → jelaskan", () => classifyIntent("Apa itu sinonim?") === "jelaskan");
test("pernyataan umum → tanya", () => classifyIntent("Terima kasih atas bantuannya") === "tanya");

// 5. buildChatHistory
test("riwayat kosong → []", () => buildChatHistory(null).length === 0 && buildChatHistory([]).length === 0);
test("riwayat non-array → []", () => buildChatHistory({ a: 1 }).length === 0);
test("hanya role user/assistant", () => {
  const h = buildChatHistory([
    { role: "system", content: "skip" },
    { role: "user", content: "halo" },
    { role: "assistant", content: "hai" },
  ]);
  return h.length === 2 && h[0].role === "user" && h[1].role === "assistant";
});
test("pesan kosong dilewati", () => buildChatHistory([{ role: "user", content: "  " }]).length === 0);
test("kapasitas pesan dibatasi", () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant", content: `pesan ${i}` }));
  return buildChatHistory(many).length === HISTORY_CAP;
});
test("pesan kepanjangan dipangkas", () => {
  const h = buildChatHistory([{ role: "user", content: "x".repeat(5000) }]);
  return h.length === 1 && h[0].content.length <= 2000;
});
test("total karakter dibatasi", () => {
  const big = Array.from({ length: HISTORY_CAP }, (_, i) => ({ role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant", content: "y".repeat(1500) }));
  const total = buildChatHistory(big).reduce((sum, m) => sum + m.content.length, 0);
  return total <= 8000;
});

// 6. buildSystemPrompt
test("prompt memuat persona", () => buildSystemPrompt({ persona: STUDENT_PERSONA }).includes("AI BC"));
test("konteks disertakan", () =>
  buildSystemPrompt({ persona: STUDENT_PERSONA, contextText: "- Kelas: 7" }).includes("Kelas: 7"));
test("konteks kosong tidak ditambahkan", () =>
  !buildSystemPrompt({ persona: STUDENT_PERSONA, contextText: "  " }).includes("Konteks pengguna"));
test("mode latihan mengubah panduan", () => {
  const a = buildSystemPrompt({ persona: STUDENT_PERSONA, intentMode: "latihan" });
  const b = buildSystemPrompt({ persona: STUDENT_PERSONA, intentMode: "jelaskan" });
  return a !== b && a.includes("latihan") && b.includes("Jelaskan konsepnya");
});
test("instruksi internal tidak boleh diulang ke pengguna", () =>
  buildSystemPrompt({ persona: STUDENT_PERSONA, contextText: "- Kelas: 7" }).includes("jangan diulang ke pengguna"));

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI PERSONA AI BC LULUS\n");
process.exit(0);
