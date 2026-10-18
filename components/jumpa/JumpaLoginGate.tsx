"use client";

/**
 * Tautan JUMPA dibuka tanpa login: halaman ini tetap dirender server supaya
 * pratinjau tautan (WhatsApp, dll.) membaca OG; browser langsung diarahkan
 * ke login lalu kembali ke ruang.
 */
import { useEffect } from "react";
import { LogIn } from "lucide-react";

export default function JumpaLoginGate({ loginHref }: { loginHref: string }) {
  useEffect(() => {
    window.location.replace(loginHref);
  }, [loginHref]);
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4">
      <section className="jumpa-card jumpa-in-up w-full max-w-sm p-6 text-center">
        <span className="jumpa-mark mx-auto mb-4" aria-hidden>J</span>
        <h1 className="text-xl font-extrabold">Kamu diundang ke JUMPA</h1>
        <p className="mt-2 text-sm text-[var(--jp-text-2)]">Masuk dengan akun BahasaCerdas untuk bergabung.</p>
        <a href={loginHref} className="jumpa-primary mt-6 w-full"><LogIn size={18} /> Masuk</a>
      </section>
    </main>
  );
}
