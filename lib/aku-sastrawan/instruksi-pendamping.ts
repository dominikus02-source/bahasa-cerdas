/**
 * Instruksi sistem Pendamping Menulis AI AKU SASTRAWAN + jaring pengaman
 * istilah bahasa Inggris pada jawaban. Modul murni (tanpa nama penyedia/model);
 * diuji di scripts/test-aku-sastrawan-pendamping.ts.
 */

/**
 * Istilah kepenulisan bahasa Inggris yang sering muncul → padanan Indonesia.
 * Dipakai di instruksi (sebagai daftar padanan) DAN di jaring pengaman jawaban.
 * Kunci huruf kecil; urutkan frasa panjang lebih dulu saat dipakai.
 */
export const PADANAN_ISTILAH: Record<string, string> = {
  "show, don't tell": "tunjukkan, jangan katakan",
  "show don't tell": "tunjukkan, jangan katakan",
  "point of view": "sudut pandang",
  "plot twist": "kejutan alur",
  "character arc": "perkembangan tokoh",
  "inciting incident": "peristiwa pemicu",
  "story arc": "lengkung cerita",
  "pov": "sudut pandang",
  "stakes": "taruhan",
  "pacing": "tempo cerita",
  "foreshadowing": "isyarat awal",
  "worldbuilding": "pembangunan dunia cerita",
  "world-building": "pembangunan dunia cerita",
  "backstory": "latar belakang tokoh",
  "cliffhanger": "akhir yang menggantung",
  "hook": "kail pembuka",
  "setting": "latar",
  "plot": "alur",
  "climax": "klimaks",
  "ending": "akhir cerita",
  "opening": "pembuka",
  "protagonist": "tokoh utama",
  "antagonist": "tokoh penentang",
  "character": "tokoh",
  "characters": "tokoh-tokoh",
  "scene": "adegan",
  "scenes": "adegan-adegan",
  "dialogue": "dialog",
  "theme": "tema",
  "tone": "nada",
  "mood": "suasana",
  "voice": "suara penulis",
  "conflict": "konflik",
  "premise": "premis",
  "draft": "draf",
  "feedback": "umpan balik",
  "storytelling": "penceritaan",
  "flashback": "kilas balik",
  "tension": "ketegangan",
  "subplot": "alur sampingan",
};

const daftarPadanan = Object.entries(PADANAN_ISTILAH)
  .filter(([en]) => !/['-]/.test(en) && en !== "pov" && !/s$/.test(en))
  .map(([en, id]) => `"${id}" (bukan "${en}")`)
  .join(", ");

export const INSTRUKSI_BAHASA = [
  "ATURAN BAHASA (wajib, tidak bisa ditawar):",
  "- Tulis SELURUH jawaban dalam Bahasa Indonesia yang baik, alami, dan hangat — termasuk judul bagian, poin daftar, label, dan istilah teknis — meskipun penulis memakai bahasa lain.",
  "- Jangan memakai kata atau istilah bahasa Inggris sama sekali, juga tidak di dalam tanda kurung atau sebagai keterangan tambahan (contoh SALAH: \"Stakes (taruhan)\", \"taruhan (stakes)\", \"POV\"). Pakai padanan Indonesianya saja.",
  `- Padanan yang dipakai: ${daftarPadanan}.`,
  "- Pengecualian hanya untuk kutipan langsung dari naskah penulis dan nama diri.",
  "",
  "FORMAT JAWABAN: Markdown sederhana — judul bagian pendek (###), **tebal** seperlunya, daftar berpoin atau bernomor, dan garis pemisah (---) bila perlu. Jangan memakai HTML, tabel besar, emoji berlebihan, atau blok kode.",
].join("\n");

export const INSTRUKSI_PENDAMPING = `Kamu adalah Pendamping Menulis AI AKU SASTRAWAN, pendamping penulis cerpen dan novel Indonesia. Bantu penulis mempertajam ide, premis, tokoh, konflik, sudut pandang, adegan, dialog, struktur, dan revisi. Jangan mengambil alih suara penulis: jelaskan alasan saran, tawarkan pilihan, dan pertahankan gaya serta maksud penulis. Berikan umpan balik yang spesifik, hangat, jujur, dan membangun. Jika diminta menilai naskah, pisahkan kekuatan, hal yang perlu dikembangkan, dan langkah revisi yang konkret. Jangan menjanjikan penerbitan atau keberhasilan komersial. Jangan mengarang isi naskah yang tidak diberikan. Untuk naskah panjang, fokus pada cuplikan yang disediakan dan sarankan pengerjaan bertahap.

${INSTRUKSI_BAHASA}`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KUNCI = Object.keys(PADANAN_ISTILAH).sort((a, b) => b.length - a.length);
const POLA_EN = KUNCI.map((k) => escapeRe(k).replace(/'/g, "['’]")).join("|");
// "Stakes (taruhan)" / "Stakes/taruhan" → "taruhan"; "taruhan (stakes)" → "taruhan".
const RE_EN_LALU_ID = new RegExp(`(?<![\\p{L}])(${POLA_EN})\\s*(?:\\(([^()\\n]{1,60})\\)|/\\s*([\\p{L} -]{1,40}))`, "giu");
const RE_ID_LALU_EN = new RegExp(`\\s*[(\\[]\\s*(?:bahasa inggris:?\\s*|inggris:?\\s*|en:?\\s*)?["“'‘]?(${POLA_EN})["”'’]?\\s*[)\\]]`, "giu");
// Hanya istilah yang tidak pernah dipakai sebagai kata Indonesia (bukan "plot", "tema", "dialog", dll.).
// Istilah yang juga lazim/sah sebagai kata Indonesia atau terlalu umum → TIDAK diganti bila berdiri sendiri.
const TETAP_BILA_LEPAS = new Set(["plot", "setting", "climax", "ending", "opening", "character", "characters", "scene", "scenes", "dialogue", "theme", "tone", "mood", "voice", "conflict", "premise", "draft", "hook", "protagonist", "antagonist", "tension", "feedback"]);
const KUNCI_LEPAS = KUNCI.filter((k) => !TETAP_BILA_LEPAS.has(k));
const RE_LEPAS = new RegExp(`(?<![\\p{L}])(${KUNCI_LEPAS.map((k) => escapeRe(k).replace(/'/g, "['’]")).join("|")})(-nya)?(?![\\p{L}])`, "giu");

function cocokkanHuruf(asli: string, ganti: string): string {
  return /^\p{Lu}\p{Ll}/u.test(asli) ? ganti.charAt(0).toLocaleUpperCase("id-ID") + ganti.slice(1) : ganti;
}
const padanan = (en: string) => PADANAN_ISTILAH[en.toLowerCase().replace(/’/g, "'")] ?? en;

/**
 * Jaring pengaman (setelah instruksi): rapikan sisa istilah Inggris kepenulisan
 * di jawaban. Tidak menyentuh teks di dalam tanda kutip langsung naskah.
 */
export function indonesiakanIstilah(teks: string): string {
  return teks
    .split(/(“[^”]*”|"[^"\n]*")/g)
    .map((bagian, i) => {
      if (i % 2 === 1) return bagian; // kutipan langsung: biarkan
      return bagian
        .replace(RE_EN_LALU_ID, (m, en: string, dalamKurung?: string, setelahGaris?: string) => {
          const id = (dalamKurung ?? setelahGaris ?? "").trim();
          return cocokkanHuruf(en, id && /\p{L}/u.test(id) ? id : padanan(en));
        })
        .replace(RE_ID_LALU_EN, "")
        .replace(RE_LEPAS, (m, en: string, nya?: string) => cocokkanHuruf(en, padanan(en)) + (nya ? "nya" : ""));
    })
    .join("");
}
