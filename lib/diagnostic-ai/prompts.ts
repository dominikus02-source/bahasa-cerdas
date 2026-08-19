import { SKILLS, SUBSKILLS } from "@/lib/question-metadata/taxonomy";
import type { AiNextPlan } from "./types";

export interface AiPromptContext {
  avoidStems: string[];
  avoidSubskills: string[];
  usedTopics: string[];
  recentSummary: string;
}

const SYSTEM_PROMPT = `Kamu penyusun soal tes diagnostik Bahasa Indonesia untuk murid SD-SMA di BahasaCerdas. Keluarkan SATU objek JSON saja (tanpa markdown, tanpa teks lain).

Aturan:
1. Jangan sebut dirimu, platform, atau "Sebagai AI". Bahasa Indonesia natural sesuai jenjang murid.
2. Jawaban benar TIDAK boleh tertulis ulang di teks soal.
3. Opsi salah = miskonsepsi umum murid yang masuk akal (bukan kata acak).
4. Posisi opsi benar bervariasi (tidak selalu indeks 0).
5. explanation: jelaskan mengapa benar dan mengapa yang lain salah (min 2 kalimat).
6. misconceptionMap: penjelasan miskonsepsi per opsi salah, kunci indeks ("0","1","2","3").
7. diagnosticRationale: kemampuan yang diukur butir ini dan mengapa dipilih (min 20 karakter).
8. topic jangan diulang dari daftar yang sudah dipakai.
9. cognitiveTarget hanya: MENGINGAT, MEMAHAMI, MENERAPKAN, MENGANALISIS, MENGEVALUASI, MENCIPTAKAN.
10. BENAR_SALAH: options tepat ["Benar","Salah"]. ISIAN_SINGKAT: options [] dan correctAnswer 1-3 kata.
11. subskill TEPAT salah satu id SUBSKILL yang diberikan.
12. evidenceTarget.skill TEPAT skill yang diminta; confidence LOW/MEDIUM/HIGH sesuai keyakinan.
13. skill top-level = id skill yang diminta (bukan nama); difficulty persis EASY/MEDIUM/HARD sesuai permintaan.
14. correctAnswer: PILIHAN_GANDA = indeks opsi 0-3; ISIAN_SINGKAT = teks jawaban.
15. Respons = satu objek JSON valid, tanpa komentar, tanpa trailing comma.

Schema:
{"text":"teks soal","options":["A","B","C","D"],"questionType":"PILIHAN_GANDA|BENAR_SALAH|ISIAN_SINGKAT","correctAnswer":0,"explanation":"min 2 kalimat","misconceptionMap":{"0":"miskonsepsi opsi 0"},"evidenceTarget":{"skill":"READING","confidence":"MEDIUM"},"diagnosticRationale":"alasan butir ini","skill":"READING","difficulty":"EASY","subskill":"READING_IDE_POKOK","topic":"topik singkat","cognitiveTarget":"MEMAHAMI"}`;

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