"use client";

import { Plus, X } from "lucide-react";
import { BATAS_PETA, tokohKosong, type PetaCerita, type Tokoh } from "@/lib/aku-sastrawan/peta-cerita";

export const GENRE_PILIHAN = ["Drama", "Keluarga", "Romansa", "Misteri", "Fantasi", "Horor", "Komedi", "Sejarah", "Fiksi ilmiah", "Petualangan"];
export const SUDUT_PILIHAN = ["Orang pertama (aku)", "Orang ketiga terbatas", "Orang ketiga serba tahu"];

export const gayaIsian = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] leading-6 outline-none transition placeholder:text-muted-foreground/60 focus:border-foreground/40";

type Ubah = (fn: (p: PetaCerita) => PetaCerita) => void;
type Props = { peta: PetaCerita; ubah: Ubah; hanyaBaca?: boolean };

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</span>;
}

function Pilihan({ pilihan, nilai, onPilih, hanyaBaca }: { pilihan: string[]; nilai: string; onPilih: (v: string) => void; hanyaBaca?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pilihan.map((p) => {
        const aktif = nilai.trim().toLowerCase() === p.toLowerCase();
        return (
          <button key={p} type="button" disabled={hanyaBaca} aria-pressed={aktif} onClick={() => onPilih(aktif ? "" : p)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition disabled:cursor-default ${aktif ? "border-foreground bg-foreground text-background" : "border-border text-foreground/80 hover:border-foreground/40"}`}>
            {p}
          </button>
        );
      })}
    </div>
  );
}

export function IsianGenre({ peta, ubah, hanyaBaca }: Props) {
  return (
    <div className="space-y-3">
      <Pilihan pilihan={GENRE_PILIHAN} nilai={peta.genre} hanyaBaca={hanyaBaca} onPilih={(v) => ubah((p) => ({ ...p, genre: v }))} />
      <input readOnly={hanyaBaca} value={peta.genre} maxLength={BATAS_PETA.genre} onChange={(e) => ubah((p) => ({ ...p, genre: e.target.value }))} placeholder="Atau tulis sendiri…" aria-label="Genre" className={gayaIsian} />
    </div>
  );
}

export function IsianTokoh({ peta, ubah, hanyaBaca }: Props) {
  const daftar = peta.tokoh.length ? peta.tokoh : hanyaBaca ? [] : [tokohKosong()];
  const set = (i: number, kunci: keyof Tokoh, v: string) =>
    ubah((p) => {
      const t = p.tokoh.length ? [...p.tokoh] : [tokohKosong()];
      t[i] = { ...t[i], [kunci]: v };
      return { ...p, tokoh: t };
    });
  return (
    <div className="space-y-3">
      {daftar.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tokoh.</p>}
      {daftar.map((t, i) => (
        <div key={i} className="group relative rounded-2xl border border-border bg-background p-3.5">
          {!hanyaBaca && daftar.length > 1 && (
            <button type="button" onClick={() => ubah((p) => ({ ...p, tokoh: p.tokoh.filter((_, j) => j !== i) }))} aria-label={`Lepas tokoh ${i + 1}`}
              className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground opacity-60 transition hover:bg-muted hover:opacity-100"><X size={14} /></button>
          )}
          <input readOnly={hanyaBaca} value={t.nama} maxLength={BATAS_PETA.nama} onChange={(e) => set(i, "nama", e.target.value)} placeholder={i === 0 ? "Nama tokoh utama" : "Nama tokoh"} aria-label={`Nama tokoh ${i + 1}`}
            className="w-full bg-transparent pr-8 font-display text-lg outline-none placeholder:text-muted-foreground/50" />
          <input readOnly={hanyaBaca} value={t.watak} maxLength={BATAS_PETA.watak} onChange={(e) => set(i, "watak", e.target.value)} placeholder="Watak — mis. keras kepala, diam-diam penyayang" aria-label={`Watak tokoh ${i + 1}`}
            className="mt-1.5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
          <input readOnly={hanyaBaca} value={t.keinginan} maxLength={BATAS_PETA.keinginan} onChange={(e) => set(i, "keinginan", e.target.value)} placeholder="Keinginan — apa yang paling ia kejar?" aria-label={`Keinginan tokoh ${i + 1}`}
            className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
        </div>
      ))}
      {!hanyaBaca && daftar.length < BATAS_PETA.tokoh && (
        <button type="button" onClick={() => ubah((p) => ({ ...p, tokoh: [...(p.tokoh.length ? p.tokoh : [tokohKosong()]), tokohKosong()] }))}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground"><Plus size={15} /> Tambah tokoh</button>
      )}
    </div>
  );
}

export function IsianLatar({ peta, ubah, hanyaBaca }: Props) {
  const set = (k: keyof PetaCerita["latar"], v: string) => ubah((p) => ({ ...p, latar: { ...p.latar, [k]: v } }));
  return (
    <div className="space-y-3">
      <label className="block"><Label>Tempat</Label><input readOnly={hanyaBaca} value={peta.latar.tempat} maxLength={BATAS_PETA.latar} onChange={(e) => set("tempat", e.target.value)} placeholder="Warung kopi di pinggir rel" className={gayaIsian} /></label>
      <label className="block"><Label>Waktu</Label><input readOnly={hanyaBaca} value={peta.latar.waktu} maxLength={BATAS_PETA.latar} onChange={(e) => set("waktu", e.target.value)} placeholder="Malam terakhir bulan puasa" className={gayaIsian} /></label>
      <label className="block"><Label>Suasana</Label><input readOnly={hanyaBaca} value={peta.latar.suasana} maxLength={BATAS_PETA.latar} onChange={(e) => set("suasana", e.target.value)} placeholder="Hangat, tapi menyimpan rahasia" className={gayaIsian} /></label>
    </div>
  );
}

export function IsianTeks({ nilai, onUbah, placeholder, label, batas, hanyaBaca, baris = 4 }: { nilai: string; onUbah: (v: string) => void; placeholder: string; label: string; batas: number; hanyaBaca?: boolean; baris?: number }) {
  return <textarea readOnly={hanyaBaca} value={nilai} maxLength={batas} rows={baris} onChange={(e) => onUbah(e.target.value)} placeholder={placeholder} aria-label={label} className={`${gayaIsian} resize-none`} />;
}

export function IsianAlur({ peta, ubah, hanyaBaca }: Props) {
  const set = (k: keyof PetaCerita["alur"], v: string) => ubah((p) => ({ ...p, alur: { ...p.alur, [k]: v } }));
  const bagian: [keyof PetaCerita["alur"], string, string][] = [
    ["awal", "Awal", "Apa yang mengusik dunia tokohmu?"],
    ["tengah", "Tengah", "Rintangan apa yang makin memanas?"],
    ["akhir", "Akhir", "Bagaimana semuanya berubah?"],
  ];
  return (
    <div className="space-y-3">
      {bagian.map(([k, l, ph]) => (
        <label key={k} className="block"><Label>{l}</Label><textarea readOnly={hanyaBaca} rows={2} value={peta.alur[k]} maxLength={BATAS_PETA.alur} onChange={(e) => set(k, e.target.value)} placeholder={ph} className={`${gayaIsian} resize-none`} /></label>
      ))}
    </div>
  );
}

export function IsianSudut({ peta, ubah, hanyaBaca }: Props) {
  return (
    <div className="space-y-3">
      <Pilihan pilihan={SUDUT_PILIHAN} nilai={peta.sudutPandang} hanyaBaca={hanyaBaca} onPilih={(v) => ubah((p) => ({ ...p, sudutPandang: v }))} />
      <input readOnly={hanyaBaca} value={peta.sudutPandang} maxLength={BATAS_PETA.sudutPandang} onChange={(e) => ubah((p) => ({ ...p, sudutPandang: e.target.value }))} placeholder="Atau tulis sendiri…" aria-label="Sudut pandang" className={gayaIsian} />
    </div>
  );
}
