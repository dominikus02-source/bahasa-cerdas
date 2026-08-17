import { SKILLS, SUBSKILLS } from "@/lib/question-metadata/taxonomy";
import type { AiNextPlan } from "./types";

export interface AiPromptContext {
  avoidStems: string[];
  avoidSubskills: string[];
  usedTopics: string[];
  recentSummary: string;
}

const SYSTEM_PROMPT = `Kamu adalah penyusun soal tes diagnostik Bahasa Indonesia untuk murid SD sampai SMA di platform BahasaCerdas. Kamu mengeluarkan SATU objek JSON saja, tanpa markdown, tanpa teks lain.

Aturan wajib:
1. Jangan pernah menyebutkan dirimu, platform, atau "Sebagai AI".
2. Semua teks soal, opsi, dan penjelasan memakai Bahasa Indonesia yang baik dan natural; sesuaikan bahasa dengan jenjang murid.
3. Jawaban benar tidak boleh tertulis ulang di dalam teks soal.
4. Setiap opsi yang salah harus berupa miskonsepsi yang masuk akal (kesalahan umum murid), bukan jawaban absurd seperti kata pilihan acak.
5. Posisi opsi benar harus bervariasi (tidak selalu di indeks 0).
6. explanation harus menjelaskan mengapa jawaban benar itu benar dan mengapa yang lain salah.
7. misconceptionMap berisi penjelasan miskonsepsi untuk setiap opsi yang salah, dengan kunci indeks opsi ("0","1","2","3").
8. diagnosticRationale menjelaskan kemampuan apa yang diukur butir ini dan mengapa butir ini dipilih.
9. topic jangan diulang dari daftar topik yang sudah dipakai.
10. cognitiveTarget hanya salah satu dari: MENGINGAT, MEMAHAMI, MENERAPKAN, MENGANALISIS, MENGEVALUASI, MENCIPTAKAN.
11. Untuk BENAR_SALAH: options tepat ["Benar","Salah"].
12. Untuk ISIAN_SINGKAT: options wajib [] (kosong), correctAnswer adalah jawaban singkat 1-3 kata.
13. Keluarkan JSON persis dengan schema berikut:
{
  "text": "teks soal",
  "options": ["opsi A", "opsi B", "opsi C", "opsi D"],
  "questionType": "PILIHAN_GANDA | BENAR_SALAH | ISIAN_SINGKAT",
  "correctAnswer": 0,
  "explanation": "penjelasan lengkap minimal 2 kalimat",
  "misconceptionMap": { "0": "miskonsepsi opsi 0", "2": "miskonsepsi opsi 2", "3": "miskonsepsi opsi 3" },
  "evidenceTarget": { "skill": "READING", "confidence": "MEDIUM" },
  "diagnosticRationale": "alasan butir ini mengukur kemampuan tertentu",
  "subskill": "READING_IDE_POKOK",
  "topic": "topik singkat",
  "cognitiveTarget": "MEMAHAMI"
}
14. subskill harus TEPAT salah satu id dari daftar SUBSKILL yang diberikan.
15. evidenceTarget.skill harus TEPAT salah satu skill yang diminta; confidence: LOW bila ragu butir ini andal, MEDIUM bila cukup, HIGH bila yakin.
16. Untuk PILIHAN_GANDA correctAnswer adalah indeks opsi (0-3); untuk ISIAN_SINGKAT isi dengan teks jawaban singkat.
17. Total respons harus satu objek JSON valid — tanpa kata di luar objek, tanpa komentar, tanpa trailing comma.`;

export function buildAiDiagnosticSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildAiDiagnosticUserPrompt(plan: AiNextPlan, ctx: AiPromptContext): string {
  const parts: string[] = [];
  parts.push(
    `Buat 1 soal tes diagnostik Bahasa Indonesia. Skill: ${SKILLS[plan.skill as keyof typeof SKILLS] ?? plan.skill} (id: ${plan.skill}).`
  );
  if (plan.subskill && SUBSKILLS[plan.skill as keyof typeof SUBSKILLS]) {
    const options = Object.keys(SUBSKILLS[plan.skill as keyof typeof SUBSKILLS]);
    if (options.includes(plan.subskill)) {
      parts.push(`Subskill: ${SUBSKILLS[plan.skill as keyof typeof SUBSKILLS][plan.subskill]} (id: ${plan.subskill}).`);
    }
  }
  parts.push(`Tingkat kesulitan: ${plan.difficulty}.`);
  if (plan.topic) parts.push(`Topik: ${plan.topic}.`);

  if (ctx.usedTopics.length > 0) {
    parts.push(`Topik yang sudah dipakai (jangan diulang): ${ctx.usedTopics.join(", ")}.`);
  }
  if (ctx.avoidSubskills.length > 0) {
    parts.push(`Subskill yang sudah dipakai (jangan diulang): ${ctx.avoidSubskills.join(", ")}.`);
  }
  if (ctx.avoidStems.length > 0) {
    parts.push(
      `Soal yang sudah keluar sebelumnya (jangan menulis soal dengan topik yang sama persis): ${ctx.avoidStems
        .map((stem) => `"${stem.length > 80 ? stem.slice(0, 80) + "…" : stem}"`)
        .join("; ")}`
    );
  }
  if (ctx.recentSummary.trim()) {
    parts.push(`Catatan perjalanan belajar murid di sesi ini: ${ctx.recentSummary.trim()}`);
  }
  parts.push(
    "Pastikan bahasanya natural untuk murid sekolah, soal bisa dijawab tanpa bantuan internet, dan opsi salah adalah miskonsepsi umum yang masuk akal."
  );
  return parts.join("\n");
}