"use client";

/**
 * P8A — Empty & zero balance states (encouraging, bukan salesy).
 */

import Link from "next/link";
import { Sprout } from "lucide-react";

export function EmptyStates({ hasStudents }: { hasStudents: boolean }) {
  return (
    <section aria-label="Mulai membangun penghasilan" className="bc-guru-surface rounded-2xl p-6 text-center lg:p-8">
      <Sprout className="mx-auto h-10 w-10 text-emerald-500" />
      <h2 className="mt-3 text-lg font-bold text-foreground">Bangun penghasilan pertamamu</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {hasStudents
          ? "Penghasilan akan muncul setelah transaksi memenuhi ketentuan program. Sementara itu, teruslah mendampingi muridmu belajar."
          : "Ketika muridmu berlangganan Premium melalui ekosistem BahasaCerdas, kamu dapat memperoleh penghasilan berulang sesuai ketentuan program."}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href="#transparansi"
          className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Pelajari cara kerjanya
        </Link>
        <Link
          href="/guru/kelasku"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Kelola Kelasku
        </Link>
      </div>
    </section>
  );
}
