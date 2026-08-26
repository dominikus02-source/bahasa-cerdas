import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { GCS_FAQ } from "@/lib/guru/gcs-copy";
import { ProgramClient } from "@/components/guru/gcs/ProgramClient";

export const metadata = {
  title: "Program Guru Cerdas Sejahtera | BahasaCerdas",
  description:
    "Bagikan kesempatan belajar kepada murid. Dapatkan penghargaan atas kontribusimu dalam mendampingi mereka belajar Bahasa Indonesia.",
};

/**
 * /guru/komisi/program — surface edukasi program (P8B §4).
 * Social proof HANYA dari data nyata (jumlah guru/murid di DB) — tidak dikarang.
 */
export default async function ProgramPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "GURU" && !user.isFounder) redirect("/murid/beranda");

  // Social proof nyata (bounded, satu query agregat).
  const [guruCount, muridCount] = await Promise.all([
    db.user.count({ where: { role: "GURU" } }),
    db.user.count({ where: { role: "MURID" } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-10">
      {/* Hero */}
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
          Guru Cerdas Sejahtera
        </p>
        <h1 className="mt-3 text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
          Bagikan kesempatan belajar.
          <br />
          <span className="text-violet-600 dark:text-violet-400">
            Dapatkan penghargaan atas kontribusimu.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground lg:text-base">
          Guru Cerdas Sejahtera adalah program BahasaCerdas yang menghargai guru yang
          membuka akses belajar lebih baik bagi murid. Kamu tidak menjual apa pun — kamu
          memberikan ekosistem belajar yang lebih terstruktur.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/guru/komisi"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Lihat Penghasilan Saya
          </Link>
          <a
            href="#bagikan"
            className="rounded-xl border border-input px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Bagikan Akses Belajar
          </a>
        </div>
      </header>

      {/* Social proof nyata */}
      {(guruCount > 0 || muridCount > 0) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 rounded-2xl bg-card border border-border px-6 py-4 text-center">
          <div>
            <p className="text-2xl font-extrabold tabular-nums text-foreground">
              {guruCount.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-muted-foreground">guru telah bergabung</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums text-foreground">
              {muridCount.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-muted-foreground">murid telah belajar</p>
          </div>
        </div>
      )}

      {/* 3 benefit */}
      <section aria-label="Manfaat program" className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            n: "01",
            t: "Bantu Murid Belajar",
            d: "Bagikan akses BahasaCerdas kepada murid dan bantu mereka memiliki pendampingan belajar yang lebih terstruktur.",
          },
          {
            n: "02",
            t: "Pantau Perkembangan",
            d: "Murid tetap berada dalam ekosistem pembelajaran BahasaCerdas dan kamu dapat memantau perkembangan belajar mereka.",
          },
          {
            n: "03",
            t: "Dapatkan Penghasilan Berulang",
            d: "Guru dapat memperoleh 10% dari transaksi Premium yang memenuhi ketentuan program, dihitung dari jumlah yang berhasil dibayarkan.",
          },
        ].map((b) => (
          <div key={b.n} className="rounded-2xl bg-card border border-border p-5">
            <p className="text-xs font-bold tracking-widest text-violet-600 dark:text-violet-400">{b.n}</p>
            <h2 className="mt-2 text-base font-bold text-foreground">{b.t}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.d}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section aria-label="Cara kerja" className="mt-10 rounded-2xl bg-card border border-border p-5 lg:p-7">
        <h2 className="text-lg font-bold text-foreground">Cara Kerjanya</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { t: "Bagikan akses", d: "Bagikan kode akses kelas atau tautan kelasmu kepada murid." },
            { t: "Murid bergabung", d: "Murid masuk BahasaCerdas dan bergabung ke kelasmu dengan kode akses." },
            { t: "Murid menggunakan Premium", d: "Murid belajar dan memilih Premium atas keinginan mereka sendiri." },
            { t: "Guru memperoleh penghasilan", d: "Komisi 10% tercatat sesuai ketentuan program di Penghasilan Saya." },
          ].map((s, i) => (
            <li key={s.t} className="relative rounded-xl bg-muted/40 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <p className="mt-2 text-sm font-semibold text-foreground">{s.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Koneksi guru dan murid mengikuti mekanisme resmi platform (kode akses kelas).
          Tidak ada cara lain untuk mengklaim murid secara manual.
        </p>
      </section>

      {/* Bagikan */}
      <section id="bagikan" aria-label="Bagikan akses belajar" className="mt-10 scroll-mt-20">
        <ProgramClient />
      </section>

      {/* FAQ */}
      <section aria-label="Pertanyaan umum" className="mt-10 rounded-2xl bg-card border border-border p-5 lg:p-7">
        <h2 className="text-lg font-bold text-foreground">Pertanyaan Umum</h2>
        <div className="mt-3 divide-y divide-border">
          {GCS_FAQ.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                {f.q}
                <span className="float-right text-muted-foreground group-open:hidden" aria-hidden="true">+</span>
                <span className="float-right hidden text-muted-foreground group-open:inline" aria-hidden="true">−</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
