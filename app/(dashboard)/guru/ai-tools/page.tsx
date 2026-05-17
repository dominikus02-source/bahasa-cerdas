"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  PenTool, 
  GraduationCap, 
  BookOpen, 
  Heart,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  CheckCircle2
} from "lucide-react";

const aiTools = [
  {
    id: "rpp",
    title: "Generator RPP Otomatis",
    description: "Buat RPP Kurikulum Merdeka dalam 30 detik. AI menganalisis kompetensi, tujuan pembelajaran, dan menghasilkan RPP lengkap dengan ATP & Modul Ajar.",
    icon: FileText,
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-100",
    href: "/guru/rpp-modul",
    features: [
      "Template Kurikulum Merdeka",
      "Auto-generate ATP",
      "Integrasi Profil Pelajar Pancasila",
      "Export ke Word/PDF",
    ],
    status: "ready",
  },
  {
    id: "eyd",
    title: "Korektor EYD & Tata Bahasa",
    description: "Koreksi otomatis EYD, PUEBI, dan tata bahasa Indonesia. Dapatkan saran perbaikan real-time untuk dokumen akademik Anda.",
    icon: PenTool,
    color: "from-blue-500 to-indigo-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    href: "/guru/ai-tools/eyd",
    features: [
      "Koreksi EYD V",
      "Pemeriksaan PUEBI",
      "Saran Kalimat Efektif",
      "Deteksi Plagiasi",
    ],
    status: "new",
  },
  {
    id: "soal",
    title: "Pembuat Soal HOTS",
    description: "Generate soal Higher Order Thinking Skills (HOTS) otomatis untuk berbagai level kognitif. Lengkap dengan kunci jawaban & pembahasan.",
    icon: Zap,
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-100",
    href: "/guru/bank-soal",
    features: [
      "Soal Pilihan Ganda & Essay",
      "Level Kognitif C1-C6",
      "Pembahasan Otomatis",
      "Bank Soal 1000+",
    ],
    status: "ready",
  },
  {
    id: "grading",
    title: "Penilaian Otomatis",
    description: "Sistem penilaian otomatis untuk tugas & ujian. AI menganalisis jawaban siswa dan memberikan nilai objektif dengan rubrik yang sesuai.",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
    href: "/guru/ai-tools/grading",
    features: [
      "Auto-grading Essay",
      "Rubrik Penilaian",
      "Analisis Butir Soal",
      "Rapor Otomatis",
    ],
    status: "new",
  },
  {
    id: "text-analysis",
    title: "Ringkasan Teks & Sastra",
    description: "Ringkas teks panjang, analisis unsur intrinsik sastra, dan identifikasi gaya bahasa secara otomatis dengan AI canggih.",
    icon: BookOpen,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-100",
    href: "/guru/ai-tools/text-analysis",
    features: [
      "Auto-summarization",
      "Analisis Puisi & Cerpen",
      "Deteksi Majas",
      "Struktur Teks",
    ],
    status: "new",
  },
  {
    id: "feedback",
    title: "Feedback Personal Siswa",
    description: "Berikan feedback otomatis dan personal untuk setiap siswa berdasarkan performa mereka. Tingkatkan motivasi & hasil belajar.",
    icon: Heart,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-100",
    href: "/guru/ai-tools/feedback",
    features: [
      "Analisis Individual",
      "Saran Perbaikan",
      "Tracking Progress",
      "Laporan Orang Tua",
    ],
    status: "new",
  },
];

export default function AIToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Teknologi AI Canggih
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Tools untuk Mengajar Lebih{" "}
            <span className="text-red-600">Efisien & Efektif</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Hemat puluhan jam setiap minggu dengan AI yang dirancang khusus untuk guru Bahasa Indonesia. Dari RPP hingga penilaian, semua otomatis.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="text-center p-4 bg-white rounded-xl border shadow-sm">
            <p className="text-3xl font-bold text-red-600">6</p>
            <p className="text-sm text-gray-600">AI Tools</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border shadow-sm">
            <p className="text-3xl font-bold text-blue-600">50+</p>
            <p className="text-sm text-gray-600">Fitur AI</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border shadow-sm">
            <p className="text-3xl font-bold text-green-600">10x</p>
            <p className="text-sm text-gray-600">Lebih Cepat</p>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border shadow-sm">
            <p className="text-3xl font-bold text-purple-600">10K+</p>
            <p className="text-sm text-gray-600">Guru Aktif</p>
          </div>
        </div>

        {/* AI Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} href={tool.href}>
                <Card className={`h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${tool.borderColor} border-2`}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${tool.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {tool.status === "new" && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Baru
                        </Badge>
                      )}
                      {tool.status === "ready" && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Siap
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {tool.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700">
                      Gunakan Sekarang
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center p-8 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl text-white">
          <h2 className="text-2xl font-bold mb-2">Siap Mengajar Lebih Efisien?</h2>
          <p className="text-red-100 mb-6">
            Mulai gunakan AI tools sekarang dan rasakan perbedaannya!
          </p>
          <Link href="/guru/rpp-modul">
            <button className="bg-white text-red-600 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition-colors">
              Coba Generator RPP Gratis
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
