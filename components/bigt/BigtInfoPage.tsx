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
            <h1 className="text-2xl font-bold">BIGT — Bahasa Indonesia Growth Track</h1>
            <p className={`text-sm ${isGuru ? "text-emerald-200" : "text-violet-200"}`}>
              Sistem pembelajaran bahasa Indonesia bertahap level A1–C2, dengan umpan balik AI dan peta kesiapan menuju UKBI.
            </p>
          </div>
        </div>
      </div>

      {/* Perbedaan */}
      <div className="bg-card dark:bg-slate-900 rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-bold text-foreground text-lg mb-4">Perbedaan BahasaCerdas dan BIGT</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
            <h3 className="font-bold text-violet-700 dark:text-violet-400 mb-2">BahasaCerdas.com</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>✓ Platform belajar dan latihan harian</li>
              <li>✓ Simulasi UKBI/TKA</li>
              <li>✓ Bank soal untuk guru dan murid</li>
              <li>✓ Komunitas guru dan murid</li>
              <li>✓ Kelas dan penugasan</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2">BIGT (Jalur Belajar Terpisah)</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>✓ Jalur belajar bertahap A1–C2 selaras kerangka BIPA</li>
              <li>✓ Peta kesiapan yang menerjemahkan latihan ke gambaran hasil UKBI</li>
              <li>✓ Umpan balik menulis dan berbicara berbantuan AI</li>
              <li>✓ Laporan per keterampilan dan rekomendasi materi</li>
              <li>✓ Sertifikat Kesiapan — bukan sertifikat UKBI</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Fitur BIGT */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { icon: <BookOpen size={24} />, title: "Jalur Belajar A1–C2", desc: "Materi terbuka bertahap sesuai skala BIPA Badan Bahasa" },
          { icon: <Shield size={24} />, title: "Umpan Balik AI", desc: "Latihan menulis dan berbicara dinilai otomatis, kapan saja" },
          { icon: <Timer size={24} />, title: "Latihan Adaptif", desc: "Tingkat kesulitan menyesuaikan kemampuan secara langsung" },
          { icon: <FileText size={24} />, title: "6 Area Latihan", desc: "Menyimak, Membaca, Berbicara, Menulis, Mediasi, Tugas Terintegrasi" },
          { icon: <Award size={24} />, title: "Laporan Kemajuan", desc: "Per keterampilan, dengan rekomendasi materi berikutnya" },
          { icon: <BookOpen size={24} />, title: "Sertifikat Kesiapan", desc: "Verifikasi QR — mencatat capaian belajar, bukan sertifikat UKBI" },
        ].map(f => (
          <div key={f.title} className="bg-card dark:bg-slate-900 rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg ${isGuru ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"} flex items-center justify-center mb-3`}>
              {f.icon}
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-surface-muted rounded-2xl border border-border p-8 text-center">
          <h2 className="font-bold text-foreground text-lg mb-2">Siap Mencoba BIGT?</h2>
          <p className="text-sm text-muted-foreground mb-6">Materi A1–A2 sudah tersedia, level lanjutan menyusul bertahap. Anda akan diarahkan ke situs BIGT di tab baru.</p>
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
