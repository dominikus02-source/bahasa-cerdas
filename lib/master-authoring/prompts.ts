import { MasterQuestion } from "../master-recovery";
import { AuthoringQuestion, AuthoringSkill, SKILL_LABELS } from "./types";

const SKILL_RULES: Record<AuthoringSkill, string> = {
  SINONIM:
    "Soal wajib menanyakan SINONIM (persamaan kata) dari kata yang ada di stem, pola \"... sinonim dari kata 'X' ...\". Kunci hanya sah jika benar-benar bersinonim dengan X (verifikasi makna sebelum menulis opsi). Distractor harus bukan sinonim X dan tidak saling bersinonim dengan kunci.",
  ANTONIM:
    "Soal wajib menanyakan ANTONIM (lawan kata) dari kata di stem, pola \"... antonim dari kata 'X' ...\". Kunci harus benar-benar lawan makna X. Jangan mencampur sinonim ke dalam opsi.",
  SPOK:
    "Soal wajib menanyakan SATU unsur kalimat (subjek/predikat/objek/keterangan/pelengkap) dari kalimat yang diberikan. Stem harus memuat kalimat utuh + pertanyaan unsur. Hanya satu unsur yang benar; distractor = unsur lain yang tidak tepat.",
  KALIMAT_EFEKTIF:
    "Soal wajib menanyakan kalimat efektif: pilih perbaikan/penulisan kalimat yang benar-benar memperbaiki masalah kebahasaan nyata (pleonasme, ketidakhematan, struktur, ambiguitas, ketidaksejajaran, logika). Jangan ganti kata secara arbitrer tanpa masalah nyata.",
  EJAAN:
    "Soal wajib menanyakan kaidah ejaan yang TERVERIFIKASI: penulisan kata baku, huruf kapital, tanda baca, kata serapan, preposisi. Kunci harus sesuai EYD/PUEBI yang pasti. Jangan mengarang kaidah.",
  MAJAS:
    "Soal wajib memuat satu kalimat kiasan dan menanyakan jenis majasnya. Pastikan kalimat tersebut TIDAK dapat ditafsirkan sebagai dua majas yang sama kuatnya (mis. simile vs metafora harus bisa dibedakan lewat kata pembanding seperti/bagai).",
  MAKNA_KATA:
    "Soal wajib menanyakan makna kata DALAM KONTEKS kalimat, pola \"Dalam kalimat berikut, kata 'X' bermakna...\". Jawaban harus sesuai konteks kalimat, bukan definisi lepas.",
  KONSEP:
    "Soal wajib menanyakan konsep/istilah bahasa Indonesia yang pasti dan teruji (mis. jenis kalimat, jenis kata, bagian cerita). Hindari definisi yang diperdebatkan.",
};

export const SYSTEM_PROMPT = `Kamu adalah penyusun soal Bahasa Indonesia senior untuk bank soal sekolah (SD/SMP/SMA).
Tugasmu: MEMPERBAIKI soal yang rusak menjadi soal PILIHAN GANDA berkualitas tinggi — dan hanya jika bukti cukup.
PERATURAN KETAT:
1. HANYA pakai fakta dari TEKS SUMBER yang diberikan + pengetahuan bahasa Indonesia yang pasti dan terverifikasi. DILARANG mengarang fakta, nama, kutipan, atau kaidah yang tidak pasti (anti-halusinasi).
2. Soal baru wajib MENJAGA skill/intensi asli soal sumber (jenis skill tercantum di bawah). Jangan geser ke topik lain.
3. WAJIB ada TEPAT SATU jawaban yang benar dan objektif. Dilarang: opsi "semua jawaban benar", "tidak ada jawaban", opsi yang saling bersinonim, kunci yang muncul di stem.
4. Stem harus kalimat utuh, natural, dan berbahasa Indonesia baku. Jangan pakai templat kosong ("..."). Jangan berakhiran "... adalah" (membocorkan kunci).
5. Penjelasan (explanation) wajib memberi alasan pedagogis ≥ 1 kalimat yang SELARAS dengan kunci dan tidak mengulang soal.
6. Keputusan:
   - "GOLD" HANYA jika kamu yakin tinggi (confidence ≥ 0.8) DAN bisa memberi semanticEvidence (bukti makna/kebenaran) DAN difficultyEvidence (alasan tingkat kesulitan). Jika ragu → "HUMAN_REVIEW".
   - "REJECT" jika teks sumber tidak cukup diperbaiki menjadi soal yang baik.
   - Semua jawaban harus dalam SATU objek JSON, tanpa markdown, tanpa komentar, tanpa teks lain.
7. Output JSON persis mengikuti KONTRAK ini:
{
  "decision": "GOLD" | "HUMAN_REVIEW" | "REJECT",
  "question": {
    "type": "PILIHAN_GANDA" | "BENAR_SALAH",
    "skill": "SINONIM" | "ANTONIM" | "SPOK" | "KALIMAT_EFEKTIF" | "EJAAN" | "MAJAS" | "MAKNA_KATA" | "KONSEP",
    "difficulty": "MUDAH" | "SEDANG" | "SULIT",
    "stem": "kalimat soal lengkap",
    "options": ["opsi1", "opsi2", "opsi3", "opsi4"],
    "correctAnswer": "teks opsi yang benar (SALIN UTUH dari options)",
    "explanation": "penjelasan ≥ 1 kalimat"
  },
  "reason": "alasan keputusan singkat",
  "confidence": 0.0-1.0,
  "difficultyEvidence": "alasan kesulitan (EASY: hafalan langsung; MEDIUM: konteks 2 langkah; HARD: nuansa/ambiguitas) — ≥ 20 karakter",
  "semanticEvidence": "bukti kebenaran kunci (makna kata, kaidah, tabel) — ≥ 20 karakter",
  "repairType": "tipe perbaikan yang kamu lakukan",
  "sourceQuestionId": "kode soal sumber (SALIN PERSIS)",
  "sourcePreserved": true
}`;

export function skillRule(skill: AuthoringSkill): string {
  return SKILL_RULES[skill];
}

export interface SourceContext {
  source: MasterQuestion;
  skill: AuthoringSkill;
  repairType: string;
  familyKey?: string;
  facts: string[];
}

export function buildAuthoringPrompt(ctx: SourceContext): { system: string; user: string } {
  const q = ctx.source;
  const parts: string[] = [];
  parts.push(`TEKS SUMBER (jangan diubah, hanya diperbaiki):`);
  parts.push(`Kode soal sumber: ${q.kodeSoal}`);
  parts.push(`Teks: ${q.text || "(kosong)"}`);
  if (q.options && q.options.length > 0)
    parts.push(`Opsi sumber: ${q.options.map((o, i) => `${i}. ${o}`).join(" | ")}`);
  if (q.correctAnswer) parts.push(`Kunci sumber: ${q.correctAnswer}`);
  if (q.explanation) parts.push(`Penjelasan sumber: ${q.explanation}`);
  if (ctx.familyKey) parts.push(`Konteks family (jangan meniru kalimat ini): ${ctx.familyKey}`);
  parts.push("");
  parts.push(`Skill yang wajib dijaga: ${SKILL_LABELS[ctx.skill]} (${ctx.skill})`);
  parts.push(skillRule(ctx.skill));
  parts.push("");
  if (ctx.facts.length > 0) {
    parts.push("FAKTA TERVERIFIKASI (hanya ini yang boleh dipakai untuk kunci):");
    parts.push(ctx.facts.map((f, i) => `${i + 1}. ${f}`).join("\n"));
  } else {
    parts.push(
      "FAKTA TERVERIFIKASI: tidak ada tabel khusus — kunci hanya boleh dari pengetahuan bahasa Indonesia yang PASTI dan tidak diperdebatkan."
    );
  }
  parts.push("");
  parts.push("Keluarkan SATU objek JSON sesuai kontrak. Tanpa teks lain.");
  return { system: SYSTEM_PROMPT, user: parts.join("\n") };
}

export function contractExample(): string {
  return JSON.stringify(
    {
      decision: "GOLD",
      question: {
        type: "PILIHAN_GANDA",
        skill: "SINONIM",
        difficulty: "MUDAH",
        stem: "Kata 'cerdas' memiliki sinonim, yaitu...",
        options: ["pintar", "malas", "lemah", "bodoh"],
        correctAnswer: "pintar",
        explanation: "Karena 'pintar' memiliki makna yang sama dengan 'cerdas', yaitu pandai atau tajam pikiran.",
      },
      reason: "Sumber berupa templat kosong; diperbaiki dengan konten yang terverifikasi.",
      confidence: 0.9,
      difficultyEvidence: "Hafalan persamaan kata dasar (MUDAH).",
      semanticEvidence: "Kata 'cerdas' dan 'pintar' tercatat sebagai sinonim yang lazim dalam KBBI.",
      repairType: "TEMPLATE_TO_VALID_ITEM",
      sourceQuestionId: "BC-XXXX-0001",
      sourcePreserved: true,
    },
    null,
    2
  );
}
