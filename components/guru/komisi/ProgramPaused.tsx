import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";
import { GCS_PROGRAM_NOTICE } from "@/lib/commission/config";

/** Halaman informasi saja: tidak mengundang guru mencoba pendaftaran/penarikan. */
export default function ProgramPaused() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        <Clock3 className="h-8 w-8" aria-hidden="true" />
      </div>
      <span className="rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Sedang dalam pengembangan
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Guru Cerdas Sejahtera
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
        {GCS_PROGRAM_NOTICE}
      </p>
      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        Langganan Guru PRO dan Murid Premium tetap tersedia melalui Midtrans.
      </p>
      <Link href="/guru/beranda" className="mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
        Kembali ke Beranda Guru
      </Link>
    </main>
  );
}
