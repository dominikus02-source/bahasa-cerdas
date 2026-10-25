/**
 * AI BC 2.0 — client-side types & quick actions (Bahasa Indonesia).
 * Hanya dipakai di sisi klien; tidak ada dependensi server.
 */

export type BcRole = "student" | "teacher";

export interface BcHint {
  label: string;
  prompt: string;
}

export interface BcClientMessage {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

export interface BcQuickAction {
  key: string;
  label: string;
  sub: string;
  prompt: string;
}

export const STUDENT_QUICK_ACTIONS: BcQuickAction[] = [
  {
    key: "belajar",
    label: "Belajar",
    sub: "Materi & kosakata baru",
    prompt: "Aku mau belajar hal baru tentang Bahasa Indonesia. Pilihkan satu topik yang cocok dan pandu aku.",
  },
  {
    key: "latihan",
    label: "Latihan",
    sub: "Soal & kuis interaktif",
    prompt: "Buatkan 3 soal latihan Bahasa Indonesia dan pandu jawabanku satu per satu.",
  },
  {
    key: "jelaskan",
    label: "Jelaskan",
    sub: "Konsep tata bahasa",
    prompt: "Jelaskan satu konsep tata bahasa dengan contoh yang mudah dipahami.",
  },
  {
    key: "tantang-aku",
    label: "Tantang Aku",
    sub: "Uji kemampuanmu",
    prompt: "Tantang aku dengan satu pertanyaan sulit tentang Bahasa Indonesia!",
  },
];

export const TEACHER_QUICK_ACTIONS: BcQuickAction[] = [
  {
    key: "buat-materi",
    label: "Buat Materi",
    sub: "Rencana pembelajaran & modul ajar",
    prompt: "Bantu saya menyusun rencana pembelajaran 1 lembar untuk materi Bahasa Indonesia sesuai Kurikulum Nasional.",
  },
  {
    key: "buat-soal",
    label: "Buat Soal",
    sub: "Soal & asesmen",
    prompt: "Buatkan 5 soal pilihan ganda Bahasa Indonesia dengan kunci jawaban dan pembahasan singkat.",
  },
  {
    key: "rancang",
    label: "Rancang Pembelajaran",
    sub: "Strategi mengajar",
    prompt: "Rancang strategi mengajar yang menarik untuk satu pertemuan Bahasa Indonesia.",
  },
  {
    key: "cari-ide",
    label: "Cari Ide",
    sub: "Aktivitas kelas",
    prompt: "Berikan ide aktivitas kelas yang menyenangkan untuk belajar Bahasa Indonesia.",
  },
];

export const PLACEHOLDERS: Record<BcRole, string> = {
  student: "Tulis pesan untuk Nara…",
  teacher: "Tulis pesan untuk Nara atau tempel teks untuk dikoreksi…",
};

/**
 * Gelembung karakter NARA (avatar Zelby) — alur resmi:
 * idle (entry) → thinking (diproses) → done (setelah respons).
 */
export const COMPANION_BUBBLES: Record<BcRole, { idle: string; thinking: string; done: string }> = {
  student: {
    idle: "Mau tanya apa?",
    thinking: "Nara sedang berpikir…",
    done: "Ada lagi yang mau kamu tanyakan?",
  },
  teacher: {
    idle: "Mau aku bantu kembangkan materi ini?",
    thinking: "Nara sedang berpikir…",
    done: "Ada lagi yang bisa aku bantu?",
  },
};

/** aria-label resmi entry point karakter (a11y). */
export const COMPANION_LABELS: Record<BcRole, string> = {
  student: "Buka NARA, teman ngobrolmu di BahasaCerdas",
  teacher: "Buka NARA, rekan Anda di BahasaCerdas",
};

/** Tagline NARA (nama konstanta dipertahankan untuk kompatibilitas). */
export const AI_BC_TAGLINE = "Teman Berpikir, Berkata, dan Berkarya.";

/** Nama tampilan AI + kepanjangannya. */
export const NARA_NAME = "NARA";
export const NARA_IDENTITY_LINE = "Narasumber Andalan, Rekan Anda";