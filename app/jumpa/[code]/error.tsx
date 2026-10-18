"use client";

import Link from "next/link";

export default function JumpaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4">
      <div className="jumpa-glass w-full max-w-sm rounded-3xl p-6 text-center">
        <h1 className="text-xl font-extrabold">JUMPA belum bisa dibuka</h1>
        <p className="mt-2 text-sm text-[var(--jp-text-2)]">Terjadi gangguan sementara. Coba muat ulang sebentar lagi.</p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" className="jumpa-primary" onClick={reset}>Coba lagi</button>
          <Link href="/" className="jumpa-ghost">Ke beranda</Link>
        </div>
      </div>
    </main>
  );
}
