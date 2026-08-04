import Link from "next/link";
import { GraduationCap, BookOpen, FileCheck2, ChevronRight } from "lucide-react";
import { getUKBIPackages } from "@/lib/kompetensi/get-simulation-packages";
import { getTKAPackages } from "@/lib/kompetensi/get-simulation-packages";

export const dynamic = "force-dynamic";

export default async function ArenaSimulasiPage() {
  const [ukbiTracks, tkaTracks] = await Promise.all([getUKBIPackages(), getTKAPackages()]);

  const ukbiAvailable = ukbiTracks.filter((t) => t.available && t.paketId);
  const tkaAvailable = tkaTracks.filter((t) => t.available && t.paketId);
  const ukbiSoal = ukbiAvailable.reduce((n, t) => n + (t.questionCount || 0), 0);
  const tkaSoal = tkaAvailable.reduce((n, t) => n + (t.questionCount || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-3xl p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap size={26} />
          <h1 className="text-xl font-bold">Simulasi UKBI & TKA</h1>
        </div>
        <p className="text-sm text-violet-200">
          Ukur kemampuan berbahasa Indonesianu lewat simulasi adaptif dan acak. Lihat hasilmu dan dapatkan dokumen latihan.
        </p>
      </div>

      <div className="grid gap-4">
        {/* UKBI */}
        <Link href="/arena/simulasi/ukbi" className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <BookOpen size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Simulasi UKBI</h2>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-violet-500 transition-colors" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Merespons kaidah, membaca, mendengarkan — standar UKBI.
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                {ukbiAvailable.length} paket • {ukbiSoal} soal
              </p>
            </div>
          </div>
        </Link>

        {/* TKA */}
        <Link href="/arena/simulasi/tka" className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <BookOpen size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Simulasi TKA</h2>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-violet-500 transition-colors" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tes Kemampuan Akademik Bahasa Indonesia, dari SD hingga UTBK.
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                {tkaAvailable.length} paket • {tkaSoal} soal
              </p>
            </div>
          </div>
        </Link>

        {/* Hasil */}
        <Link href="/arena/simulasi/hasil" className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
              <FileCheck2 size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Hasil & Dokumen Latihan</h2>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-violet-500 transition-colors" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lihat riwayat simulasi, skor, dan unduh dokumen hasil latihan.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
