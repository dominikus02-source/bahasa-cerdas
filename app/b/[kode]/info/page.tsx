import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { describeQrEntry, findQrCode, targetFor } from "@/lib/qr/resolve";

/**
 * Halaman info untuk kode QR yang fiturnya belum tersedia bagi pemindai
 * (mis. Pojok Baca, Jurnal Refleksi, Koreksi EYD untuk murid). Publik.
 */
export const metadata: Metadata = {
  title: "Segera hadir | BahasaCerdas",
  robots: { index: false, follow: false },
};

export default async function QrInfoPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const entry = findQrCode(kode);
  if (!entry) notFound();

  const guruHref = targetFor(entry, "guru");
  const segeraHadir = entry.rule.status === "segera-hadir";

  return (
    <main className="min-h-screen bg-bc-bg flex items-center justify-center px-4 py-10">
      <Card variant="surface" className="w-full max-w-md">
        <div className="flex flex-col gap-4">
          <span className="ui-icon-box" aria-hidden="true">
            {segeraHadir ? <Clock className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
          </span>
          <div className="flex flex-col gap-2">
            {segeraHadir ? <Badge tone="info" className="self-start">Segera hadir</Badge> : null}
            <h1 className="text-bc-h2 font-bold text-bc-text">{entry.rule.label}</h1>
            <p className="text-bc-small text-bc-text-2">{describeQrEntry(entry)}</p>
          </div>
          <p className="text-bc-body text-bc-text-2">
            {segeraHadir
              ? "Fitur ini sedang disiapkan. Sementara itu, kerjakan kegiatannya langsung di buku."
              : "Fitur ini dibuka untuk akun guru atau murid."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonClass({ variant: "primary" })}>
              Ke Beranda
            </Link>
            {guruHref ? (
              <Link href={guruHref} className={buttonClass({ variant: "secondary" })}>
                Halaman guru
              </Link>
            ) : null}
          </div>
          <p className="text-bc-small text-bc-text-3">Kode: {entry.kode}</p>
        </div>
      </Card>
    </main>
  );
}
