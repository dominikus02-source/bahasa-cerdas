"use client";

import { Lightbulb, Quote, Sparkles } from "lucide-react";

const DAILY_NOTES = [
  {
    quote: "Belajar bukan tentang siapa yang paling cepat, tetapi siapa yang terus mau memahami.",
    tipTitle: "Baca sampai paham",
    tip: "Saat menemukan bagian yang sulit, berhenti sejenak dan cari inti maknanya sebelum melanjutkan.",
  },
  {
    quote: "Satu kata baru yang benar-benar kamu pahami bisa menjadi bekal untuk banyak hal.",
    tipTitle: "Tambah satu kata",
    tip: "Pilih satu kata baru hari ini. Cari maknanya, buat kalimat sendiri, lalu gunakan dalam percakapan atau tulisan.",
  },
  {
    quote: "Kesalahan bukan tanda kamu tidak bisa. Kesalahan adalah petunjuk tentang apa yang perlu dipelajari.",
    tipTitle: "Belajar dari kesalahan",
    tip: "Setelah menjawab salah, cari tahu mengapa jawabanmu keliru. Memahami alasannya lebih penting daripada sekadar tahu kuncinya.",
  },
  {
    quote: "Menulis membuat pikiran yang berantakan punya tempat untuk menjadi jelas.",
    tipTitle: "Tulis dengan sederhana",
    tip: "Mulai dari satu gagasan utama. Setelah itu, tambahkan alasan atau contoh yang mendukungnya.",
  },
  {
    quote: "Membaca dengan rasa ingin tahu membuat setiap teks punya sesuatu untuk ditemukan.",
    tipTitle: "Tanyakan pada bacaan",
    tip: "Saat membaca, tanyakan: apa gagasan utamanya, apa buktinya, dan apa yang ingin disampaikan penulis?",
  },
  {
    quote: "Tidak harus sempurna untuk menjadi lebih baik. Cukup satu langkah lebih maju dari kemarin.",
    tipTitle: "Bandingkan dengan dirimu",
    tip: "Lihat kembali latihan sebelumnya. Cari satu hal yang sekarang sudah kamu lakukan lebih baik.",
  },
  {
    quote: "Bahasa adalah cara kita menyusun pikiran agar dapat dipahami orang lain.",
    tipTitle: "Pilih kata yang tepat",
    tip: "Sebelum berbicara atau menulis, pikirkan siapa yang akan membaca atau mendengarkan. Sesuaikan pilihan katamu.",
  },
  {
    quote: "Rasa penasaran adalah awal dari banyak kemampuan baru.",
    tipTitle: "Jangan takut bertanya",
    tip: "Kalau ada kata, kalimat, atau aturan yang belum kamu pahami, jadikan itu pertanyaan untuk dipelajari.",
  },
  {
    quote: "Kemajuan kecil yang dilakukan setiap hari akan menjadi kemampuan besar.",
    tipTitle: "Belajar sebentar, tetapi rutin",
    tip: "Lebih baik berlatih 10 menit dengan fokus daripada belajar lama tanpa benar-benar memperhatikan.",
  },
  {
    quote: "Cerita yang baik dimulai dari gagasan sederhana yang disampaikan dengan jelas.",
    tipTitle: "Buat tulisanmu hidup",
    tip: "Tambahkan detail yang bisa dibayangkan pembaca: siapa, di mana, apa yang terjadi, dan bagaimana perasaannya.",
  },
  {
    quote: "Memahami bacaan bukan sekadar menemukan jawaban, tetapi menangkap maksud di baliknya.",
    tipTitle: "Cari bukti",
    tip: "Saat menyimpulkan isi bacaan, selalu kembali ke kalimat atau bagian yang menjadi dasar kesimpulanmu.",
  },
  {
    quote: "Kamu tidak perlu menguasai semuanya hari ini. Pilih satu hal, lalu kuasai dengan baik.",
    tipTitle: "Fokus satu kemampuan",
    tip: "Kalau sedang berlatih tata bahasa, fokuskan perhatian pada pola yang sedang dipelajari sebelum pindah ke materi lain.",
  },
  {
    quote: "Kata-kata yang tepat dapat membuat gagasan sederhana terasa kuat.",
    tipTitle: "Hindari kata berulang",
    tip: "Saat menulis, coba cari padanan kata yang tepat agar kalimatmu lebih hidup tanpa kehilangan makna.",
  },
  {
    quote: "Kemampuanmu tumbuh setiap kali kamu berani mencoba lagi.",
    tipTitle: "Coba lagi dengan cara berbeda",
    tip: "Jika satu cara belum berhasil, ubah strategi: baca ulang, buat contoh sendiri, atau tanyakan kepada Mentor AI.",
  },
];

function getDayIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const day = Math.floor(diff / 86_400_000);
  return day % DAILY_NOTES.length;
}

export function StudentDailyInspiration() {
  const note = DAILY_NOTES[getDayIndex()];

  return (
    <section aria-label="Inspirasi dan tips belajar hari ini" className="grid gap-5 lg:grid-cols-2">
      <article className="relative overflow-hidden rounded-[1.75rem] border border-sky-300/70 bg-[#0d2d5b] px-6 py-7 text-white shadow-[0_22px_60px_-38px_rgba(15,77,130,0.75)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <Quote className="h-9 w-9 rotate-180 text-sky-200" strokeWidth={1.8} />
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Kutipan Hari Ini</h2>
          </div>

          <blockquote className="mt-7 max-w-2xl text-[22px] font-semibold leading-[1.55] tracking-tight sm:text-[25px]">
            “{note.quote}”
          </blockquote>

          <p className="mt-7 text-sm font-medium text-sky-100/80">
            — Catatan BahasaCerdas
          </p>
        </div>
      </article>

      <article className="relative overflow-hidden rounded-[1.75rem] border border-sky-300/70 bg-white px-6 py-7 shadow-[0_22px_60px_-38px_rgba(15,77,130,0.3)] dark:bg-[#111a32] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-sky-100 blur-3xl dark:bg-sky-400/10" />

        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
              <Lightbulb className="h-7 w-7" strokeWidth={2} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  Tips Belajar
                </h2>
                <Sparkles className="h-4 w-4 text-sky-500" />
              </div>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
                HARI INI
              </p>
            </div>
          </div>

          <h3 className="mt-7 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {note.tipTitle}
          </h3>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            {note.tip}
          </p>
        </div>
      </article>
    </section>
  );
}
