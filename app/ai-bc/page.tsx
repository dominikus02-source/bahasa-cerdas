import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Lightbulb, PenLine, Target } from "lucide-react";
import { gambarKarakter } from "@/lib/arena-junior/karakter";
import BatikDecoration from "@/components/shared/BatikDecoration";
import PageFooter from "@/components/public/PageFooter";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Belajar kosakata",
    desc: "Arti kata, sinonim, antonim, dan kata baku sesuai KBBI.",
  },
  {
    icon: PenLine,
    title: "Tata bahasa & PUEBI",
    desc: "Aturan ejaan, kalimat efektif, dan perbaikan tulisan.",
  },
  {
    icon: Target,
    title: "Latihan & UKBI",
    desc: "Soal latihan interaktif dan persiapan UKBI.",
  },
  {
    icon: Lightbulb,
    title: "Untuk guru",
    desc: "RPP, soal asesmen, dan strategi mengajar Bahasa Indonesia.",
  },
];

const EXAMPLES = [
  "Apa arti kata 'apresiasi'?",
  "Perbaiki kalimat ini agar efektif.",
  "Buatkan 3 soal kata baku.",
  "Rancang satu pertemuan materi puisi.",
];

/**
 * AI BC — halaman publik.
 *
 * Pengguna yang masuk diarahkan ke pengalaman sesuai perannya
 * (murid → /arena/ai, guru/founder → /guru/ai-bc). Pengunjung
 * anonim melihat laman perkenalan ini.
 */
export default async function AiBcPage() {
  const user = await getUser();

  if (user) {
    const isTeacher = user.role === "GURU" || user.role === "ADMIN" || user.isFounder;
    redirect(isTeacher ? "/guru/ai-bc" : "/arena/ai");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50 flex flex-col">
      <BatikDecoration />

      {/* Hero */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-12 pt-14 text-center sm:pt-20">
        <div className="mx-auto mb-4 w-28 h-28 sm:w-36 sm:h-36" aria-hidden="true">
          <Image
            src={gambarKarakter("zelby", "reading")}
            alt=""
            width={144}
            height={144}
            priority
            className="h-full w-full object-contain drop-shadow-xl"
          />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
          AI BC
        </h1>
        <p className="mt-3 text-lg font-medium text-slate-600">
          Teman cerdas untuk belajar dan mengajar Bahasa Indonesia.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
          Teman Belajarmu untuk murid — Teman Guru untuk pengajar. Tanya arti kata,
          pahami tata bahasa, latihan soal, sampai menyusun pembelajaran.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:scale-[1.02] sm:w-auto"
          >
            Masuk dan Coba AI BC
          </Link>
          <Link
            href="/"
            className="w-full rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 sm:w-auto"
          >
            Pelajari BahasaCerdas
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-slate-400">
          Gratis untuk murid BahasaCerdas. AI BC adalah teman belajar, bukan pengganti guru.
        </p>
      </section>

      {/* Fitur */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-12">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <feature.icon size={19} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{feature.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contoh */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-16">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Contoh pertanyaan
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((example) => (
            <span
              key={example}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm"
            >
              {example}
            </span>
          ))}
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
