/**
 * Identitas badan usaha — satu sumber untuk teks yang tampil di situs.
 * Jangan menulis ulang nama PT, NIB, atau alamat di komponen; impor dari sini.
 * Jangan menambahkan NPWP, NIK, atau komposisi saham ke berkas ini.
 */
export const COMPANY = {
  brandName: "BahasaCerdas",
  legalName: "PT Bahasa Cerdas Indonesia",
  nib: "0911260094193",
  streetAddress: "CFX Tower, Jl. Gatot Subroto Kav. 35-36",
  address:
    "CFX Tower, Jl. Gatot Subroto Kav. 35-36, Kuningan Timur, Setiabudi, Jakarta Selatan 12950",
  email: "halo@bahasacerdas.com",
} as const;
