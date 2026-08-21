"use client";

import { TinjauSimulasiView } from "@/components/guru/simulasi/TinjauSimulasiView";

// Route legacy — tetap hidup (backward compatible). UI utama ada di hub
// /guru/evaluasi-simulasi?tab=tinjau (Laporan Simulasi).
export default function TinjauSimulasiPage() {
  return <TinjauSimulasiView />;
}
