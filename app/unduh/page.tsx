import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldQuestion, Smartphone, CheckCircle2, ArrowRight } from "lucide-react";

// Public on purpose (see publicPaths in lib/supabase/proxy.ts): a parent installs
// the app before their child has ever signed in.
//
// Most of this page is not the download button — it is the two Android warning
// screens that appear afterwards. Sideloaded apps trigger "aplikasi tidak dikenal"
// and a Play Protect block, both worded alarmingly enough that parents stop there
// and assume the app is unsafe. Explaining them BEFORE they appear is the
// difference between an install and an abandoned download.

export const metadata: Metadata = {
  title: "Unduh Aplikasi Arena BC",
  description:
    "Pasang Arena BC di ponsel Android. Belajar Bahasa Indonesia sambil main — Jalur Cerdas, gim, dan simulasi UKBI.",
};

const APK = "/unduh/arenabc_v1.apk";
const VERSI = "1.0.0";
const UKURAN = "1,4 MB";

const LANGKAH = [
  {
    judul: "Ketuk tombol unduh",
    isi: "Berkas arenabc_v1.apk akan tersimpan di folder Unduhan. Kalau Chrome bertanya apakah berkas ini aman, pilih “Tetap unduh” — peringatan itu muncul untuk semua aplikasi yang tidak lewat Play Store.",
  },
  {
    judul: "Izinkan pemasangan",
    isi: "Buka berkasnya. Android akan bilang “Demi keamanan, ponsel Anda tidak diizinkan memasang aplikasi tidak dikenal dari sumber ini.” Ketuk “Setelan”, lalu nyalakan izin untuk Chrome atau Pengelola Berkas. Setelah itu tekan kembali dan lanjutkan.",
  },
  {
    judul: "Lewati pemeriksaan Play Protect",
    isi: "Muncul kotak “Aplikasi tidak aman diblokir”. Ketuk “Selengkapnya”, lalu “Tetap instal”. Ini muncul karena aplikasinya belum terdaftar di Play Store, bukan karena ada masalah pada aplikasinya.",
  },
];

export default function UnduhPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-xl font-black text-white shadow-lg">
            A
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Arena BC</h1>
          <p className="mt-2 text-slate-500">Seru belajarnya, mahir bahasanya</p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <a
            href={APK}
            download
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-violet-700 active:scale-[0.99]"
          >
            <Download className="h-5 w-5" />
            Unduh untuk Android
          </a>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>Versi {VERSI}</span>
            <span aria-hidden>•</span>
            <span>{UKURAN}</span>
            <span aria-hidden>•</span>
            <span>Android 5.0 ke atas</span>
          </div>

          <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Aplikasi ini hanya untuk <strong>Android</strong>. Di iPhone, buka saja{" "}
              <Link href="/arena" className="font-semibold underline underline-offset-2">
                Arena lewat browser
              </Link>{" "}
              — isinya sama.
            </span>
          </p>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Cara memasang</h2>
          <p className="mt-1 text-sm text-slate-500">
            Android akan menampilkan dua peringatan di tengah jalan. Itu normal — ini penjelasannya.
          </p>

          <ol className="mt-5 space-y-4">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{l.judul}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{l.isi}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldQuestion className="h-5 w-5 text-violet-600" />
            Kenapa ada peringatan keamanan?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Android menampilkan peringatan itu untuk <em>setiap</em> aplikasi yang dipasang di luar Play
            Store, tanpa memeriksa isinya. Jadi peringatan tersebut bukan hasil pemindaian yang menemukan
            sesuatu pada Arena BC — melainkan pemberitahuan bahwa aplikasi ini datang langsung dari kami.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Pastikan Anda mengunduhnya dari <strong>bahasacerdas.com</strong>. Jangan pasang berkas
            &ldquo;Arena BC&rdquo; yang dibagikan lewat grup atau situs lain — kami tidak bisa menjamin
            isinya.
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-900 p-5 text-slate-200">
          <h2 className="flex items-center gap-2 font-bold text-white">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Setelah terpasang
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Masuk dengan akun murid yang sama seperti di web — progres, XP, dan kelasnya mengikuti, bukan
            mulai dari nol. Aplikasi juga memperbarui isinya sendiri, jadi tidak perlu mengunduh ulang
            setiap ada pembaruan.
          </p>
          <Link
            href="/arena"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            Buka Arena di browser <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
