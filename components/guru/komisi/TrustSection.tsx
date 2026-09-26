"use client";

/**
 * P8A — Transparansi (accordion) + 3 benefit + Bagikan akses (kode kelas).
 * Tidak ada bahasa "jualan" agresif. Referral mechanism asli = kode akses
 * kelas (CLASS_ENROLLMENT attribution) — bukan link spam.
 */

import { useState } from "react";
import { ShieldCheck, Repeat, Eye, Wallet, Copy, Check, QrCode, Users } from "lucide-react";
import { trackProductEvent } from "@/lib/analytics/product-track";
import { ShareKelasModal, type ShareKelasData } from "@/components/guru/gcs/ShareKelasModal";
import type { KelasInfo } from "./KomisiClient";

const TRANSPARENCY_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Bagaimana penghasilan ini dihitung?",
    a: "Komisi guru adalah 10% dari transaksi Premium murid yang memenuhi ketentuan program, dihitung dari jumlah yang berhasil dibayarkan. Jika ada kupon, dasar perhitungannya adalah jumlah setelah kupon.",
  },
  {
    q: "Bagaimana murid terhubung dengan saya?",
    a: "Murid yang bergabung ke kelasmu melalui kode akses kelas tercatat sebagai murid yang kamu dampingi. Koneksi ini tidak berpindah otomatis jika murid pindah kelas atau sekolah.",
  },
  {
    q: "Kapan komisi tercatat?",
    a: "Setelah pembayaran Premium murid berhasil, komisi tercatat di riwayat penghasilanmu.",
  },
  {
    q: "Apa itu masa penahanan?",
    a: "Ada masa penahanan singkat sebelum penghasilan masuk ke saldo tersedia. Ini menjaga sistem tetap aman dan adil bagi semua.",
  },
  {
    q: "Bagaimana refund memengaruhi komisi?",
    a: "Jika pembayaran murid dikembalikan (refund), komisi terkait akan dikembalikan sesuai catatan. Riwayat tetap tersimpan transparan.",
  },
  {
    q: "Bagaimana pencairan diproses?",
    a: "Saldo tersedia dapat diajukan untuk pencairan mulai Rp50.000. Setiap pencairan memiliki status yang dapat kamu lacak hingga dana dikirim ke rekening terdaftar.",
  },
];

const BENEFITS: Array<{ icon: typeof Repeat; title: string; desc: string }> = [
  {
    icon: Repeat,
    title: "Penghasilan Berulang",
    desc: "Murid aktif Premium dapat menghasilkan komisi selama memenuhi ketentuan program.",
  },
  {
    icon: Eye,
    title: "Transparan",
    desc: "Guru dapat melihat murid dan riwayat penghasilan yang menjadi dasar saldo.",
  },
  {
    icon: Wallet,
    title: "Dicairkan dengan Mudah",
    desc: "Saldo yang memenuhi minimum dapat diajukan untuk pencairan ke rekening yang terdaftar.",
  },
];

export function TrustSection({ classes }: { classes: KelasInfo[] }) {
  return (
    <div className="space-y-4">
      {/* Transparansi — accordion compact */}
      <section aria-label="Transparansi penghasilan" className="bc-guru-surface rounded-2xl p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Transparansi Penghasilan</h2>
        </div>
        <div className="mt-3 divide-y divide-border">
          {TRANSPARENCY_ITEMS.map((item) => (
            <AccordionRow key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section aria-label="Mengapa Guru Cerdas Sejahtera" className="bc-guru-surface rounded-2xl p-4 lg:p-6">
        <h2 className="text-base font-semibold text-foreground">Mengapa Guru Cerdas Sejahtera?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl bg-muted/40 p-4">
              <b.icon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              <p className="mt-2 text-sm font-semibold text-foreground">{b.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bagikan akses — kode kelas (mekanisme attribution asli) */}
      <section aria-label="Bagikan akses belajar" className="bc-guru-surface rounded-2xl p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Bagikan Akses Belajar</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Bagikan BahasaCerdas kepada muridmu. Murid yang bergabung ke kelasmu lewat kode akses
          akan terhubung denganmu dalam ekosistem.
        </p>

        {classes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Kamu belum memiliki kelas. Buat kelas di Kelasku untuk mulai mendampingi murid.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {classes.slice(0, 5).map((c) => (
              <ClassRow key={c.id} kelas={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AccordionRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-foreground"
      >
        {q}
        <span className="text-muted-foreground" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <p className="pb-3 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

function ClassRow({ kelas }: { kelas: KelasInfo }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(kelas.accessCode);
      setCopied(true);
      trackProductEvent("gcs_code_copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — abaikan
    }
  };

  return (
    <>
      <li className="rounded-xl border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{kelas.name}</p>
            <p className="text-xs text-muted-foreground">
              Kode akses: <span className="font-mono font-semibold text-foreground">{kelas.accessCode}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
              aria-label={`Salin kode akses ${kelas.accessCode}`}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin" : "Salin kode"}
            </button>
            <button
              onClick={() => {
                trackProductEvent("gcs_share_opened");
                setOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              aria-label={`Bagikan kelas ${kelas.name}`}
            >
              <QrCode className="h-3.5 w-3.5" />
              Bagikan
            </button>
          </div>
        </div>
      </li>
      <ShareKelasModal isOpen={open} onClose={() => setOpen(false)} kelas={kelas as ShareKelasData} />
    </>
  );
}
