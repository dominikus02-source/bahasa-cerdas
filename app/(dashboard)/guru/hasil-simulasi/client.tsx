"use client"

// Backward-compatible re-export. Logika dipindah ke komponen bersama
// components/guru/simulasi/HasilSimulasiView.tsx (dipakai juga oleh hub
// /guru/evaluasi-simulasi?tab=hasil). Nama lama dipertahankan agar import
// yang masih merujuk "./client" tidak rusak.
export { HasilSimulasiView as PusatEvaluasiClient } from "@/components/guru/simulasi/HasilSimulasiView"
