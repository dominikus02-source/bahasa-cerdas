import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Compass, Feather, Sparkles } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { akuSastrawanUpgradeUrl, canWriteAkuSastrawan } from "@/lib/aku-sastrawan/access";

export const metadata: Metadata = {
  title: "AKU SASTRAWAN · Akademi Menulis Premium dari BahasaCerdas",
  description: "Rancang tokoh, latar, dan alur langkah demi langkah, lalu tulis cerpen atau novelmu di ruang yang tenang.",
};

const pembeda = [
  { icon: Compass, judul: "Rancang Cerita", isi: "Tokoh, latar, konflik, dan alur — satu pertanyaan setiap langkah." },
  { icon: Feather, judul: "Ruang tulis yang tenang", isi: "Tersimpan otomatis. Mode fokus tanpa gangguan." },
  { icon: Sparkles, judul: "NARA, saat kamu butuh", isi: "Masukan tentang tokoh, alur, dan dialog. Keputusan tetap milikmu." },
];

export default async function AkuSastrawanPage() {
  const user = await getUser();
  const bisaMenulis = user ? await canWriteAkuSastrawan(user) : false;
  const masuk = "/login?next=%2Faku-sastrawan%2Fstudio%3Fmulai%3D1";
  const utama = !user
    ? { href: masuk, label: "Mulai Menulis" }
    : bisaMenulis
      ? { href: "/aku-sastrawan/studio?mulai=1", label: "Mulai Menulis" }
      : { href: akuSastrawanUpgradeUrl(user.role), label: "Aktifkan Premium" };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background"><Feather size={17} /></span>
          <span className="text-sm font-bold tracking-[0.08em]">AKU SASTRAWAN</span>
        </Link>
        <Link href={user ? "/aku-sastrawan/studio" : masuk} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-sm text-muted-foreground transition hover:text-foreground">
          {user ? "Karyamu" : "Masuk"}
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Akademi menulis · BahasaCerdas</p>
          <h1 className="mt-5 font-display text-[44px] leading-[1.05] tracking-tight sm:text-6xl">
            Tulis ceritamu.
            <span className="block text-muted-foreground">Sampai selesai.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-8 text-muted-foreground">
            Rancang tokoh, latar, dan alur langkah demi langkah, lalu menulis di ruang yang tenang — ditemani Pendamping Menulis AI (NARA) saat kamu butuh.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href={utama.href} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-foreground px-7 text-[15px] font-semibold text-background shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {utama.label} <ArrowRight size={17} />
            </Link>
            {user && !bisaMenulis ? (
              <Link href="/aku-sastrawan/studio" className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline">Buka karyaku</Link>
            ) : (
              <Link href={user ? "/aku-sastrawan/kurikulum" : "/login?next=%2Faku-sastrawan%2Fkurikulum"} className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline">Lihat kurikulum</Link>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg" aria-hidden>
          <div className="relative rounded-[28px] border border-border bg-card p-7 shadow-2xl shadow-black/5 sm:p-9">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="uppercase tracking-[0.18em]">Cerpen · Keluarga</span>
              <span className="inline-flex items-center gap-1.5"><Check size={13} /> Tersimpan</span>
            </div>
            <p className="mt-6 font-display text-3xl tracking-tight">Warung di Ujung Rel</p>
            <p className="mt-5 font-display text-[17px] leading-8 text-foreground/80">
              Setiap kereta terakhir lewat, Rani menghitung uang receh di laci. Malam itu jumlahnya tidak pernah cukup — dan ayahnya tahu.
            </p>
            <div className="mt-7 grid grid-cols-3 gap-2.5 text-[11px]">
              {[["Tokoh", "Rani, Ayah"], ["Latar", "Rel, malam"], ["Alur", "Awal · Akhir"]].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-background px-3 py-2.5">
                  <span className="block font-semibold uppercase tracking-[0.12em] text-muted-foreground">{k}</span>
                  <span className="mt-1 block truncate text-foreground/80">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/70">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-3 md:py-20">
          {pembeda.map(({ icon: Icon, judul, isi }) => (
            <div key={judul}>
              <Icon size={20} className="text-muted-foreground" />
              <h2 className="mt-4 font-display text-xl tracking-tight">{judul}</h2>
              <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{isi}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Fitur Premium. Karyamu tetap milikmu — selalu bisa dibaca dan diunduh.</p>
          <p>© BahasaCerdas</p>
        </div>
      </footer>
    </main>
  );
}
