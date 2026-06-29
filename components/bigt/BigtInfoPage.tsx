"use client"

import { Shield, Timer, FileText, Award, ExternalLink, BookOpen } from "lucide-react"

interface Props {
  role: "murid" | "guru"
}

export function BigtInfoPage({ role }: Props) {
  const isGuru = role === "guru"

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className={`rounded-2xl p-8 mb-8 text-white ${
        isGuru ? "bg-gradient-to-r from-emerald-600 to-teal-600" : "bg-gradient-to-r from-violet-600 to-purple-600"
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">BIGT — Bahasa Indonesia Global Test</h1>
            <p className={`text-sm ${isGuru ? "text-emerald-200" : "text-violet-200"}`}>
              Tes kemampuan Bahasa Indonesia dengan standar test screen, keamanan, dan penilaian formal.
            </p>
          </div>
        </div>
      </div>

      {/* Perbedaan */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Perbedaan BahasaCerdas vs BIGT</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
            <h3 className="font-bold text-violet-700 mb-2">BahasaCerdas.com</h3>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>✓ Platform belajar & latihan harian</li>
              <li>✓ Simulasi UKBI/TKA practice</li>
              <li>✓ Bank soal untuk guru</li>
              <li>✓ Komunitas guru & murid</li>
              <li>✓ Kelas & penugasan</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <h3 className="font-bold text-emerald-700 mb-2">BIGT (Tes Terpisah)</h3>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>✓ Test screen fokus tanpa gangguan</li>
              <li>✓ Timer & section progress ketat</li>
              <li>✓ No-answer-leakage system</li>
              <li>✓ Hasil tes dengan standar penilaian</li>
              <li>✓ Produk tes formal terpisah</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Fitur BIGT */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { icon: <Shield size={24} />, title: "Test Screen", desc: "Layar penuh fokus, minim distraksi" },
          { icon: <Timer size={24} />, title: "Timer Akurat", desc: "Waktu pengerjaan terukur per section" },
          { icon: <FileText size={24} />, title: "Section Progress", desc: "Progress jelas per bagian tes" },
          { icon: <Award size={24} />, title: "Hasil & Skor", desc: "Penilaiaan dengan standar yang jelas" },
          { icon: <Shield size={24} />, title: "Keamanan", desc: "Data jawaban terenkripsi, tidak bocor" },
          { icon: <BookOpen size={24} />, title: "Standar Formal", desc: "Penilaian dengan standar test" },
        ].map(f => (
          <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg ${isGuru ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"} flex items-center justify-center mb-3`}>
              {f.icon}
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center">
        <h2 className="font-bold text-gray-900 text-lg mb-2">Siap mencoba BIGT?</h2>
        <p className="text-sm text-gray-500 mb-6">Anda akan diarahkan ke situs BIGT di tab baru.</p>
        <a
          href="https://www.bahasacerdas.site"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl transition-colors ${
            isGuru ? "bg-emerald-600 hover:bg-emerald-700" : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          <ExternalLink size={18} />
          Buka BIGT
        </a>
      </div>
    </div>
  )
}
