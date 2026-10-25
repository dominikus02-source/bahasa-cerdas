import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Lightbulb, PenLine, Target } from "lucide-react";
import AICompanionCharacter from "@/components/ai-bc/AICompanionCharacter";
import styles from "@/components/ai-bc/ai-bc-workspace.module.css";
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
    title: "Menulis & berkarya",
    desc: "Menyusun cerita, puisi, dan pantun dengan panduan langkah demi langkah.",
  },
];

const EXAMPLES = [
  "Apa arti kata 'apresiasi'?",
  "Perbaiki kalimat ini agar efektif.",
  "Buatkan 3 soal kata baku.",
  "Jelaskan perbedaan puisi dan pantun.",
];

/**
 * NARA (dahulu AI BC) — halaman publik. Rute /ai-bc dipertahankan.
 *
 * Pengguna yang masuk diarahkan ke pengalaman sesuai perannya
 * (murid → /arena/ai, guru/founder → /guru/ai-bc). Pengunjung
 * anonim melihat laman perkenalan ini.
 */
export default async function AiBcPage() {
  const user = await getUser();

  if (user) {
    const isTeacher =
      user.role === "GURU" || user.role === "ADMIN" || user.isFounder;
    redirect(isTeacher ? "/guru/ai-bc" : "/arena/ai");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-12 pt-14 text-center sm:pt-20">
        <AICompanionCharacter
          state="idle"
          size="lg"
          priority
          className="mx-auto mb-4"
        />
        <h1 className="text-5xl font-black sm:text-6xl">
          <span className={styles.naraWordmark}>NARA</span>
        </h1>
        <p
          className={`${styles.naraBadge} mx-auto mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold`}
        >
          Narasumber Andalan, Rekan Anda
        </p>
        <p className="mt-3 text-lg font-medium text-muted-foreground">
          Teman Berpikir, Berkata, dan Berkarya.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Hai! Aku Nara, teman ngobrolmu di BahasaCerdas. Mau bertanya, mencari
          ide, atau membuat sesuatu hari ini? Yuk, kita kerjakan bareng!
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className={`${styles.sendButton} flex min-h-11 w-full items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold sm:w-auto`}
          >
            Masuk dan Ngobrol dengan Nara
          </Link>
          <Link
            href="/"
            className={`${styles.secondaryAction} flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground sm:w-auto`}
          >
            Pelajari BahasaCerdas
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Gratis untuk murid BahasaCerdas. Nara adalah teman belajar, bukan
          pengganti guru — Nara bisa keliru, jadi periksa kembali informasi
          penting.
        </p>
      </section>

      {/* Fitur */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-12">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bc-badge-violet">
                <feature.icon size={19} />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contoh */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-16">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Contoh pertanyaan
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((example) => (
            <span
              key={example}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
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
