/**
 * Peta Cerita — rancangan cerita (tokoh, latar, konflik, alur, sudut pandang,
 * amanat) yang disimpan TANPA perubahan skema: dibungkus sebagai JSON
 * berversi di kolom `WritingProject.synopsis` (Text, dipotong API di 10.000
 * karakter). Sinopsis lama (teks biasa) tetap terbaca apa adanya, dan karya
 * tanpa rancangan tetap disimpan sebagai teks biasa (kompatibel mundur).
 *
 * Modul murni (aman untuk klien dan server); diuji di
 * scripts/test-aku-sastrawan-peta.ts.
 */

export type Tokoh = { nama: string; watak: string; keinginan: string };
export type PetaCerita = {
  genre: string;
  tokoh: Tokoh[];
  latar: { tempat: string; waktu: string; suasana: string };
  konflik: string;
  alur: { awal: string; tengah: string; akhir: string };
  sudutPandang: string;
  amanat: string;
};

/** Batas per isian (karakter) — menjaga JSON tetap di bawah batas kolom. */
export const BATAS_PETA = {
  sinopsis: 1500,
  genre: 60,
  tokoh: 6,
  nama: 60,
  watak: 200,
  keinginan: 200,
  latar: 200,
  konflik: 500,
  alur: 400,
  sudutPandang: 80,
  amanat: 400,
} as const;

/** Batas aman serialisasi (API memotong sinopsis di 10.000 karakter). */
export const BATAS_SERIAL = 9_800;
const PENANDA = '{"v":1,"jenis":"peta-cerita"';

export const tokohKosong = (): Tokoh => ({ nama: "", watak: "", keinginan: "" });

export function petaKosong(): PetaCerita {
  return {
    genre: "",
    tokoh: [],
    latar: { tempat: "", waktu: "", suasana: "" },
    konflik: "",
    alur: { awal: "", tengah: "", akhir: "" },
    sudutPandang: "",
    amanat: "",
  };
}

const teks = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Normalisasi masukan apa pun menjadi PetaCerita yang valid dan dibatasi. */
export function rapikanPeta(input: unknown): PetaCerita {
  const p = obj(input);
  const latar = obj(p.latar);
  const alur = obj(p.alur);
  const tokoh = Array.isArray(p.tokoh) ? p.tokoh : [];
  return {
    genre: teks(p.genre, BATAS_PETA.genre),
    tokoh: tokoh.slice(0, BATAS_PETA.tokoh).map((t) => {
      const o = obj(t);
      return { nama: teks(o.nama, BATAS_PETA.nama), watak: teks(o.watak, BATAS_PETA.watak), keinginan: teks(o.keinginan, BATAS_PETA.keinginan) };
    }),
    latar: { tempat: teks(latar.tempat, BATAS_PETA.latar), waktu: teks(latar.waktu, BATAS_PETA.latar), suasana: teks(latar.suasana, BATAS_PETA.latar) },
    konflik: teks(p.konflik, BATAS_PETA.konflik),
    alur: { awal: teks(alur.awal, BATAS_PETA.alur), tengah: teks(alur.tengah, BATAS_PETA.alur), akhir: teks(alur.akhir, BATAS_PETA.alur) },
    sudutPandang: teks(p.sudutPandang, BATAS_PETA.sudutPandang),
    amanat: teks(p.amanat, BATAS_PETA.amanat),
  };
}

/** true bila rancangan belum berisi apa pun (spasi dianggap kosong). */
export function petaBelumDiisi(peta: PetaCerita): boolean {
  const semua = [
    peta.genre, peta.konflik, peta.sudutPandang, peta.amanat,
    peta.latar.tempat, peta.latar.waktu, peta.latar.suasana,
    peta.alur.awal, peta.alur.tengah, peta.alur.akhir,
    ...peta.tokoh.flatMap((t) => [t.nama, t.watak, t.keinginan]),
  ];
  return semua.every((s) => !s.trim());
}

/** Baca kolom synopsis: teks lama → { sinopsis }, JSON berversi → { sinopsis, peta }. */
export function bacaSinopsis(raw: string | null | undefined): { sinopsis: string; peta: PetaCerita } {
  const s = raw ?? "";
  if (s.startsWith(PENANDA)) {
    try {
      const data = JSON.parse(s) as { sinopsis?: unknown; peta?: unknown };
      return { sinopsis: teks(data.sinopsis, BATAS_PETA.sinopsis * 4), peta: rapikanPeta(data.peta) };
    } catch {
      // JSON rusak: jangan buang apa pun — tampilkan apa adanya sebagai sinopsis.
      return { sinopsis: s, peta: petaKosong() };
    }
  }
  return { sinopsis: s, peta: petaKosong() };
}

function longgarkan(nilai: { sinopsis: string; peta: PetaCerita }): boolean {
  // Potong 10% isian terpanjang (deterministik) bila serialisasi melewati batas.
  type Ref = { get: () => string; set: (v: string) => void };
  const p = nilai.peta;
  const refs: Ref[] = [
    { get: () => nilai.sinopsis, set: (v) => { nilai.sinopsis = v; } },
    { get: () => p.konflik, set: (v) => { p.konflik = v; } },
    { get: () => p.amanat, set: (v) => { p.amanat = v; } },
    ...(["awal", "tengah", "akhir"] as const).map((k) => ({ get: () => p.alur[k], set: (v: string) => { p.alur[k] = v; } })),
    ...(["tempat", "waktu", "suasana"] as const).map((k) => ({ get: () => p.latar[k], set: (v: string) => { p.latar[k] = v; } })),
    ...p.tokoh.flatMap((t) => (["watak", "keinginan"] as const).map((k) => ({ get: () => t[k], set: (v: string) => { t[k] = v; } }))),
  ];
  let terpanjang: Ref | null = null;
  for (const r of refs) if (!terpanjang || r.get().length > terpanjang.get().length) terpanjang = r;
  if (!terpanjang || terpanjang.get().length === 0) return false;
  const v = terpanjang.get();
  terpanjang.set(v.slice(0, Math.floor(v.length * 0.9)));
  return true;
}

/**
 * Tulis kolom synopsis. Tanpa rancangan → teks sinopsis biasa (format lama).
 * Dengan rancangan → JSON berversi yang dijamin <= BATAS_SERIAL karakter,
 * sehingga tidak pernah terpotong di tengah oleh API.
 */
export function tulisSinopsis(sinopsis: string, peta: PetaCerita): string {
  const nilai = { sinopsis: sinopsis.slice(0, BATAS_PETA.sinopsis * 4), peta: rapikanPeta(peta) };
  if (petaBelumDiisi(nilai.peta)) return nilai.sinopsis.slice(0, BATAS_SERIAL);
  nilai.sinopsis = nilai.sinopsis.slice(0, BATAS_PETA.sinopsis);
  let hasil = JSON.stringify({ v: 1, jenis: "peta-cerita", sinopsis: nilai.sinopsis, peta: nilai.peta });
  while (hasil.length > BATAS_SERIAL && longgarkan(nilai)) {
    hasil = JSON.stringify({ v: 1, jenis: "peta-cerita", sinopsis: nilai.sinopsis, peta: nilai.peta });
  }
  return hasil;
}

/** Teks rapi untuk ekspor .txt dan konteks Pendamping Menulis AI. */
export function petaSebagaiTeks(sinopsis: string, peta: PetaCerita): string {
  const baris: string[] = [];
  if (sinopsis.trim()) baris.push("Sinopsis:", sinopsis.trim(), "");
  if (petaBelumDiisi(peta)) return baris.join("\n").trim();
  baris.push("Peta Cerita");
  if (peta.genre.trim()) baris.push(`Genre: ${peta.genre.trim()}`);
  const tokoh = peta.tokoh.filter((t) => t.nama.trim() || t.watak.trim() || t.keinginan.trim());
  if (tokoh.length) {
    baris.push("Tokoh:");
    for (const t of tokoh) {
      const rinci = [t.watak.trim() && `watak: ${t.watak.trim()}`, t.keinginan.trim() && `keinginan: ${t.keinginan.trim()}`].filter(Boolean).join("; ");
      baris.push(`- ${t.nama.trim() || "Tanpa nama"}${rinci ? ` (${rinci})` : ""}`);
    }
  }
  const latar = [peta.latar.tempat.trim() && `tempat: ${peta.latar.tempat.trim()}`, peta.latar.waktu.trim() && `waktu: ${peta.latar.waktu.trim()}`, peta.latar.suasana.trim() && `suasana: ${peta.latar.suasana.trim()}`].filter(Boolean);
  if (latar.length) baris.push(`Latar: ${latar.join("; ")}`);
  if (peta.konflik.trim()) baris.push(`Konflik: ${peta.konflik.trim()}`);
  const alur = [peta.alur.awal.trim() && `awal: ${peta.alur.awal.trim()}`, peta.alur.tengah.trim() && `tengah: ${peta.alur.tengah.trim()}`, peta.alur.akhir.trim() && `akhir: ${peta.alur.akhir.trim()}`].filter(Boolean);
  if (alur.length) baris.push(`Alur: ${alur.join("; ")}`);
  if (peta.sudutPandang.trim()) baris.push(`Sudut pandang: ${peta.sudutPandang.trim()}`);
  if (peta.amanat.trim()) baris.push(`Amanat/tema: ${peta.amanat.trim()}`);
  return baris.join("\n").trim();
}

export function hitungKata(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/u).length : 0;
}
