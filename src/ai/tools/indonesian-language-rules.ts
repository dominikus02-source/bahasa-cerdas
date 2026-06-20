/**
 * Indonesian Language Rules
 *
 * Reference data for Bahasa Indonesia language rules.
 * Used by agents to apply correct grammar, spelling, and style.
 */

export interface LanguageRule {
  id: string;
  category: "EYD" | "PUEBI" | "TATA_BAHASA" | "DIKSI" | "ISTILAH";
  title: string;
  description: string;
  example: string;
  commonMistake: string;
}

const RULES: LanguageRule[] = [
  {
    id: "eyd-kapital",
    category: "EYD",
    title: "Huruf Kapital",
    description: "Huruf kapital dipakai sebagai huruf pertama awal kalimat, nama diri, nama geografi, dan nama resmi.",
    example: "Saya tinggal di **Indonesia**. **Budi** pergi ke **SMA Negeri 1 Jakarta**.",
    commonMistake: "saya pergi ke jakarta pada hari senin (seharusnya: Saya pergi ke Jakarta pada hari Senin)",
  },
  {
    id: "eyd-kata-depan",
    category: "EYD",
    title: "Kata Depan (di, ke, dari)",
    description: "Kata depan 'di', 'ke', dan 'dari' ditulis terpisah dari kata yang mengikutinya, kecuali sebagai awalan.",
    example: "**di rumah**, **ke pasar**, **dari sekolah** (pisah) vs **dimakan**, **kekasih** (gabung sebagai imbuhan)",
    commonMistake: "dirumah, kepasar, darisekolah (seharusnya: di rumah, ke pasar, dari sekolah)",
  },
  {
    id: "eyd-tanda-koma",
    category: "EYD",
    title: "Tanda Koma",
    description: "Koma dipakai di antara unsur-unsur dalam perincian, sebelum kata penghubung 'tetapi', dan setelah kata seru.",
    example: "Saya membeli buku, pensil, **dan** penghapus.",
    commonMistake: "Saya membeli buku dan pensil dan penghapus (kurang koma serial)",
  },
  {
    id: "eyd-kata-baku",
    category: "DIKSI",
    title: "Kata Baku vs Tidak Baku",
    description: "Gunakan bentuk baku dalam penulisan formal sesuai KBBI.",
    example: "aktif (baku) vs aktip (tidak baku) | sistem (baku) vs sistim (tidak baku) | nasihat (baku) vs nasehat (tidak baku)",
    commonMistake: "ijin (seharusnya: izin), aktifitas (seharusnya: aktivitas), apotik (seharusnya: apotek)",
  },
  {
    id: "puebi-partikel-pun",
    category: "PUEBI",
    title: "Partikel -pun",
    description: "Partikel 'pun' ditulis terpisah dari kata yang mendahuluinya, kecuali yang sudah dianggap padu.",
    example: "**Apa pun** yang terjadi, **siapa pun** dia. (pengecualian: **meskipun**, **walaupun**, **adapun**, **kendatipun**)",
    commonMistake: "apapun, siapapun, bagaimanapun (seharusnya terpisah: apa pun, siapa pun, bagaimana pun)",
  },
  {
    id: "tata-kalimat-efektif",
    category: "TATA_BAHASA",
    title: "Kalimat Efektif",
    description: "Kalimat efektif memiliki subjek, predikat, dan unsur lain yang jelas serta tidak ambigu.",
    example: "**Budi membaca buku di perpustakaan.** (Jelas: S=Budi, P=membaca, O=buku, K=di perpustakaan)",
    commonMistake: "Di perpustakaan Budi membaca buku (ambigu — bisa berarti Budi bernama Perpustakaan)",
  },
];

export function getRulesByCategory(category: LanguageRule["category"]): LanguageRule[] {
  return RULES.filter((r) => r.category === category);
}

export function getAllRules(): LanguageRule[] {
  return [...RULES];
}

export function searchRules(query: string): LanguageRule[] {
  const q = query.toLowerCase();
  return RULES.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.commonMistake.toLowerCase().includes(q)
  );
}
