"use client";

import { DokumenLatihanView } from "@/components/guru/simulasi/DokumenLatihanView";

// Route legacy — tetap hidup (backward compatible). UI utama ada di hub
// /guru/evaluasi-simulasi?tab=dokumen (Laporan Simulasi).
// Dokumen Latihan Murid — disclaimer: dokumen ini adalah hasil latihan/simulasi
// di BahasaCerdas dan bukan sertifikat resmi UKBI/TKA dari lembaga pemerintah.
// DokumenLatihanView mengambil data lewat /api/guru/dokumen-siswa (repository
// API yang hanya mengekspos field aman) dan mengimpor GuruCertificatePreview
// untuk preview dokumen murid.
export default function GuruDokumenLatihanPage() {
  return <DokumenLatihanView title="Dokumen Latihan Murid" />;
}
