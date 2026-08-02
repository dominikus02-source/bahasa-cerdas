"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Megaphone, Sparkles, CalendarDays, AlertTriangle, X, ChevronRight } from "lucide-react";

type Kategori = "INFO" | "PEMBARUAN" | "ACARA" | "PENTING";

interface Siaran {
  id: string;
  judul: string;
  isi: string;
  kategori: Kategori;
  gambar: string | null;
  tautan: string | null;
  tautanLabel: string | null;
  pinned: boolean;
}

// Warna teks dipisah dari warna aksen: beranda Arena bertema TERANG, jadi
// judul harus gelap. Versi pertama memakai text-white dan hasilnya tidak
// terbaca sama sekali di atas kartu berlatar muda.
const META: Record<Kategori, { label: string; warna: string; bg: string; Icon: typeof Megaphone }> = {
  INFO:      { label: "Info",      warna: "#0284c7", bg: "from-sky-50 to-white",       Icon: Megaphone },
  PEMBARUAN: { label: "Pembaruan", warna: "#7c3aed", bg: "from-violet-50 to-white",    Icon: Sparkles },
  ACARA:     { label: "Acara",     warna: "#b45309", bg: "from-amber-50 to-white",     Icon: CalendarDays },
  PENTING:   { label: "Penting",   warna: "#e11d48", bg: "from-rose-50 to-white",      Icon: AlertTriangle },
};

/** Siaran yang sudah ditutup murid, disimpan lokal agar tidak menagih terus. */
const KUNCI = "bc:siaran-ditutup";

function bacaDitutup(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KUNCI) || "[]");
  } catch {
    return [];
  }
}

/**
 * Banner siaran di beranda Arena.
 *
 * Siaran PENTING dan yang disematkan tidak bisa ditutup — kabar seperti "XP
 * mingguan direset tiap Senin" harus terbaca, bukan hilang karena sekali
 * terpencet. Sisanya bisa ditutup dan ingatannya disimpan di localStorage
 * (bukan DB) supaya tidak perlu tabel kedua hanya untuk status "sudah dibaca".
 */
export function SiaranBanner() {
  const [siaran, setSiaran] = useState<Siaran[] | null>(null);
  const [ditutup, setDitutup] = useState<string[]>([]);

  useEffect(() => {
    setDitutup(bacaDitutup());
    fetch("/api/siaran", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSiaran(d?.siaran ?? []))
      .catch(() => setSiaran([]));
  }, []);

  const tutup = useCallback((id: string) => {
    setDitutup((prev) => {
      const baru = [...new Set([...prev, id])].slice(-50);
      try {
        localStorage.setItem(KUNCI, JSON.stringify(baru));
      } catch {
        /* mode privat — cukup sembunyikan untuk sesi ini */
      }
      return baru;
    });
  }, []);

  if (!siaran || siaran.length === 0) return null;

  const tampil = siaran.filter((s) => s.pinned || s.kategori === "PENTING" || !ditutup.includes(s.id));
  if (tampil.length === 0) return null;

  return (
    <div className="mb-5 space-y-3">
      {tampil.map((s) => {
        const meta = META[s.kategori] ?? META.INFO;
        const bisaDitutup = !s.pinned && s.kategori !== "PENTING";

        return (
          <div
            key={s.id}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm ${meta.bg}`}
            style={{ borderColor: `${meta.warna}33` }}
          >
            {s.gambar && (
              <div className="relative h-32 w-full sm:h-40">
                <Image
                  src={s.gambar}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 720px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1330] via-[#0b1330]/40 to-transparent" />
              </div>
            )}

            <div className={`relative p-4 ${s.gambar ? "-mt-10" : ""}`}>
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                  style={{ background: `${meta.warna}1a`, color: meta.warna }}
                >
                  <meta.Icon size={11} />
                  {meta.label}
                </span>
                {s.pinned && (
                  <span className={`text-[10px] font-bold ${s.gambar ? "text-white/60" : "text-gray-400"}`}>
                    Disematkan
                  </span>
                )}
              </div>

              <p className={`pr-6 text-sm font-black ${s.gambar ? "text-white" : "text-gray-900"}`}>
                {s.judul}
              </p>
              <p className={`mt-1 whitespace-pre-line text-xs leading-relaxed ${s.gambar ? "text-white/80" : "text-gray-600"}`}>
                {s.isi}
              </p>

              {s.tautan && (
                <Link
                  href={s.tautan}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
                  style={{ background: meta.warna }}
                >
                  {s.tautanLabel || "Lihat"}
                  <ChevronRight size={13} />
                </Link>
              )}

              {bisaDitutup && (
                <button
                  onClick={() => tutup(s.id)}
                  className={`absolute right-3 top-3 rounded-full p-1 transition ${
                    s.gambar ? "bg-black/30 text-white/70 hover:text-white" : "bg-black/5 text-gray-400 hover:text-gray-700"
                  }`}
                  aria-label="Tutup pengumuman"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
