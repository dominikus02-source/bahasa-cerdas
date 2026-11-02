"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Lock, Sparkles } from "lucide-react";
import { tanyaNara, type HasilNara } from "./nara";

const CEPAT: { nama: string; prompt: string }[] = [
  { nama: "Kekuatan & kelemahan", prompt: "Sebutkan kekuatan utama naskah ini dan tiga hal terpenting untuk diperbaiki. Ringkas dan spesifik." },
  { nama: "Tokoh", prompt: "Apakah tokoh utamanya terasa hidup? Beri dua saran konkret agar wataknya lebih tajam." },
  { nama: "Alur", prompt: "Bagaimana alur dan tempo cerita ini? Tunjukkan bagian yang terasa lambat atau tergesa." },
  { nama: "Dialog", prompt: "Nilai dialog dalam naskah ini. Beri dua contoh perbaikan yang tetap menjaga gaya penulis." },
  { nama: "Pembuka", prompt: "Apakah paragraf pembuka sudah memikat? Beri satu alternatif pembuka tanpa mengubah suara penulis." },
];

export function NaraPanel({ bisaMenulis, upgradeUrl, track, konteks, adaNaskah }: {
  bisaMenulis: boolean;
  upgradeUrl: string;
  track: "novel" | "cerpen";
  konteks: () => string;
  adaNaskah: boolean;
}) {
  const [tanya, setTanya] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState<HasilNara | null>(null);

  if (!bisaMenulis) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-6">
        <Lock size={18} className="text-muted-foreground" />
        <p className="mt-3">NARA menemani selama Premium aktif. Karyamu tetap aman dan bisa dibaca serta diunduh.</p>
        <Link href={upgradeUrl} className="mt-4 inline-flex min-h-10 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background">Aktifkan Premium</Link>
      </div>
    );
  }

  const kirim = async (prompt: string, nama: string) => {
    if (sibuk || !prompt.trim()) return;
    setSibuk(true); setHasil(null);
    setHasil(await tanyaNara({ prompt, track, task: nama, context: konteks() }));
    setSibuk(false);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">Minta pendapat tentang naskahmu. NARA memberi saran — keputusan tetap milikmu.</p>
      {!adaNaskah && <p className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">Tulis beberapa kalimat dulu agar NARA punya bahan untuk dibaca.</p>}
      <div className="flex flex-wrap gap-2">
        {CEPAT.map((c) => (
          <button key={c.nama} type="button" disabled={sibuk || !adaNaskah} onClick={() => void kirim(c.prompt, c.nama)}
            className="rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground/80 transition hover:border-foreground/40 hover:text-foreground disabled:opacity-50">{c.nama}</button>
        ))}
      </div>
      <div>
        <textarea value={tanya} onChange={(e) => setTanya(e.target.value)} maxLength={2000} rows={3} placeholder="Atau tanyakan sesuatu…" aria-label="Pertanyaan untuk NARA"
          className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] leading-6 outline-none transition placeholder:text-muted-foreground/60 focus:border-foreground/40" />
        <button type="button" onClick={() => void kirim(tanya, "Pertanyaan penulis")} disabled={sibuk || !tanya.trim()}
          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50">
          {sibuk ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />} {sibuk ? "NARA sedang membaca…" : "Minta masukan"}
        </button>
      </div>
      {hasil && (
        <div role="status" className={`animate-fade-in rounded-2xl border p-4 text-sm leading-7 ${hasil.ok ? "border-border bg-muted/30" : "border-bc-warning/30 bg-bc-warning-soft text-bc-text"}`}>
          {hasil.ok ? <p className="whitespace-pre-wrap">{hasil.teks}</p> : <p>{hasil.pesan}</p>}
          {hasil.ok && <p className="mt-3 text-xs text-muted-foreground">Naskahmu tidak diubah.</p>}
        </div>
      )}
    </div>
  );
}
