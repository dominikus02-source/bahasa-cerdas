"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Compass } from "lucide-react";
import { BATAS_PETA, type PetaCerita } from "@/lib/aku-sastrawan/peta-cerita";
import { IsianAlur, IsianGenre, IsianLatar, IsianSudut, IsianTeks, IsianTokoh } from "./PetaFields";

function Kartu({ judul, ringkas, children, terbuka, onAlih }: { judul: string; ringkas: string; children: ReactNode; terbuka: boolean; onAlih: () => void }) {
  return (
    <section className="border-b border-border/70 last:border-b-0">
      <button type="button" onClick={onAlih} aria-expanded={terbuka} className="flex w-full items-center justify-between gap-3 py-4 text-left">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{judul}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{ringkas}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${terbuka ? "rotate-180" : ""}`} />
      </button>
      {terbuka && <div className="animate-fade-in pb-5">{children}</div>}
    </section>
  );
}

const pendek = (...s: string[]) => s.map((x) => x.trim()).filter(Boolean).join(" · ") || "Belum diisi";

export function PetaCeritaPanel({ peta, ubah, sinopsis, ubahSinopsis, hanyaBaca, onRancang }: {
  peta: PetaCerita;
  ubah: (fn: (p: PetaCerita) => PetaCerita) => void;
  sinopsis: string;
  ubahSinopsis: (v: string) => void;
  hanyaBaca: boolean;
  onRancang: () => void;
}) {
  const [buka, setBuka] = useState<string | null>(null);
  const alih = (k: string) => setBuka((b) => (b === k ? null : k));
  const namaTokoh = peta.tokoh.map((t) => t.nama.trim()).filter(Boolean);
  return (
    <div>
      <Kartu judul="Tokoh" ringkas={namaTokoh.length ? namaTokoh.join(", ") : "Belum diisi"} terbuka={buka === "tokoh"} onAlih={() => alih("tokoh")}>
        <IsianTokoh peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />
      </Kartu>
      <Kartu judul="Latar" ringkas={pendek(peta.latar.tempat, peta.latar.waktu, peta.latar.suasana)} terbuka={buka === "latar"} onAlih={() => alih("latar")}>
        <IsianLatar peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />
      </Kartu>
      <Kartu judul="Alur" ringkas={pendek(peta.alur.awal, peta.alur.tengah, peta.alur.akhir)} terbuka={buka === "alur"} onAlih={() => alih("alur")}>
        <IsianAlur peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} />
      </Kartu>
      <Kartu judul="Konflik" ringkas={pendek(peta.konflik)} terbuka={buka === "konflik"} onAlih={() => alih("konflik")}>
        <IsianTeks label="Konflik" nilai={peta.konflik} batas={BATAS_PETA.konflik} hanyaBaca={hanyaBaca} onUbah={(v) => ubah((p) => ({ ...p, konflik: v }))} placeholder="Apa yang dipertaruhkan tokohmu?" />
      </Kartu>
      <Kartu judul="Genre & sudut pandang" ringkas={pendek(peta.genre, peta.sudutPandang)} terbuka={buka === "gaya"} onAlih={() => alih("gaya")}>
        <div className="space-y-5"><IsianGenre peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} /><IsianSudut peta={peta} ubah={ubah} hanyaBaca={hanyaBaca} /></div>
      </Kartu>
      <Kartu judul="Amanat" ringkas={pendek(peta.amanat)} terbuka={buka === "amanat"} onAlih={() => alih("amanat")}>
        <IsianTeks label="Amanat atau tema" nilai={peta.amanat} batas={BATAS_PETA.amanat} hanyaBaca={hanyaBaca} baris={3} onUbah={(v) => ubah((p) => ({ ...p, amanat: v }))} placeholder="Apa yang ingin tertinggal di benak pembaca?" />
      </Kartu>
      <Kartu judul="Sinopsis & catatan" ringkas={pendek(sinopsis.split("\n")[0] ?? "")} terbuka={buka === "sinopsis"} onAlih={() => alih("sinopsis")}>
        <IsianTeks label="Sinopsis atau catatan" nilai={sinopsis} batas={BATAS_PETA.sinopsis} hanyaBaca={hanyaBaca} baris={5} onUbah={ubahSinopsis} placeholder="Ringkasan cerita atau catatan pribadi…" />
      </Kartu>
      {!hanyaBaca && (
        <button type="button" onClick={onRancang} className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <Compass size={15} /> Rancang langkah demi langkah
        </button>
      )}
    </div>
  );
}
