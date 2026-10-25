"use client";

import { Lightbulb, Quote } from "lucide-react";

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
    tip: "Jika satu cara belum berhasil, ubah strategi: baca ulang, buat contoh sendiri, atau tanyakan kepada NARA Mentor.",
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

  // Satu kartu: tips sebagai isi utama, kutipan sebagai pelengkap. Sebelumnya
  // dua kartu besar bersaing (biru tua + putih) dan memakan satu layar penuh.
  return (
    <section aria-label="Inspirasi dan tips belajar hari ini" className="px-card p-5 sm:p-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-bc-icon bg-bc-info-soft text-bc-info">
            <Lightbulb className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bc-info">
              Tips Belajar · Hari ini
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-[var(--px-text)]">
              {note.tipTitle}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--px-text-dim)]">
              {note.tip}
            </p>
          </div>
        </div>

        <figure className="min-w-0 border-t border-[var(--px-border)] pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--px-text-faint)]">
            <Quote className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
            Kutipan Hari Ini
          </p>
          <blockquote className="mt-2 text-base font-semibold leading-relaxed text-[var(--px-text)]">
            “{note.quote}”
          </blockquote>
          <figcaption className="mt-2 text-xs font-medium text-[var(--px-text-faint)]">
            — Catatan BahasaCerdas
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
