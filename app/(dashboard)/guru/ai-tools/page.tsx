import { AlatAiClient } from "./_components/alat-ai-client";

export default async function AIToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const agentParam = typeof sp.agent === "string" ? sp.agent : undefined;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Alat AI BahasaCerdas</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            9 agent AI siap pakai: Buat RPP, Soal, PPT, Koreksi EYD, Feedback, Penilaian, Analisis Teks, Review Materi, dan AI Assistant.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Kelompok: Buat Materi • Evaluasi & Review • Bahasa & Asisten
          </p>
        </div>

        <AlatAiClient agentParam={agentParam} />

        {/* Legacy tool links — all migrated to new workspace */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-3">
            Halaman lama (masih tersedia untuk akses langsung, gunakan Alat AI utama untuk fitur lengkap)
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/guru/ai-tools/eyd"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-all"
            >
              Korektor EYD
            </a>
            <a
              href="/guru/ai-tools/feedback"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-100 transition-all"
            >
              Feedback Siswa
            </a>
            <a
              href="/guru/ai-tools/grading"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 transition-all"
            >
              Penilaian Otomatis
            </a>
            <a
              href="/guru/ai-tools/text-analysis"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 transition-all"
            >
              Analisis Teks
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
