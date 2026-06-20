"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Heart,
  TrendingUp,
  Target
} from "lucide-react";

interface AnalisisPerforma {
  skor: number;
  status: string;
  tren: string;
  kekuatan: string[];
  kelemahan: string[];
}

interface FeedbackPersonal {
  apresiasi: string;
  motivasi: string;
  saranPerbaikan: string[];
}

interface Rekomendasi {
  materiPerluDipelajari: string[];
  strategiBelajar: string[];
  targetNilai: number;
}

interface LaporanOrangTua {
  ringkasan: string;
  saranOrangTua: string[];
  areaPerhatian: string[];
}

interface FeedbackResult {
  analisisPerforma: AnalisisPerforma;
  feedbackPersonal: FeedbackPersonal;
  rekomendasi: Rekomendasi;
  laporanOrangTua: LaporanOrangTua;
  pesanMotivasi: string;
}

export default function StudentFeedbackPage() {
  const [namaSiswa, setNamaSiswa] = useState("");
  const [nilai, setNilai] = useState("");
  const [riwayatNilai, setRiwayatNilai] = useState("");
  const [catatanGuru, setCatatanGuru] = useState("");
  const [mode, setMode] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [error, setError] = useState("");

  const handleFeedback = async () => {
    if (!namaSiswa || !nilai) {
      setError("Nama siswa dan nilai wajib diisi");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          namaSiswa, 
          nilai: parseInt(nilai), 
          riwayatNilai: riwayatNilai ? riwayatNilai.split("\n").map(line => {
            const [mapel, nilai, tanggal] = line.split(":");
            return { mapel: mapel?.trim(), nilai: parseInt(nilai?.trim()), tanggal: tanggal?.trim() };
          }) : [],
          catatanGuru,
          mode 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal membuat feedback");
        return;
      }

      setResult(data.result);
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const getTrenIcon = (tren: string) => {
    switch (tren) {
      case "Meningkat": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "Menurun": return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <Target className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="mb-6 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-emerald-700">
            Versi baru alat ini tersedia di{" "}
            <a href="/guru/ai-tools?agent=feedback" className="font-medium underline hover:text-emerald-800">Alat AI utama</a>.
          </p>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            AI Feedback Personal
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Feedback Personal Siswa
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Berikan feedback otomatis dan personal untuk setiap siswa berdasarkan performa mereka. Tingkatkan motivasi & hasil belajar.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Data Siswa</CardTitle>
              <CardDescription>
                Masukkan data siswa untuk mendapatkan feedback personal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="individual">Individual</TabsTrigger>
                  <TabsTrigger value="orangtua">Laporan Orang Tua</TabsTrigger>
                </TabsList>
              </Tabs>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Nama Siswa
                </label>
                <Input
                  placeholder="Masukkan nama siswa..."
                  value={namaSiswa}
                  onChange={(e) => setNamaSiswa(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Nilai Terakhir
                </label>
                <Input
                  type="number"
                  placeholder="0-100"
                  value={nilai}
                  onChange={(e) => setNilai(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Riwayat Nilai (Opsional)
                </label>
                <Textarea
                  placeholder="Format: Mapel: Nilai: Tanggal (satu per baris)"
                  value={riwayatNilai}
                  onChange={(e) => setRiwayatNilai(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Catatan Guru (Opsional)
                </label>
                <Textarea
                  placeholder="Catatan tambahan tentang siswa..."
                  value={catatanGuru}
                  onChange={(e) => setCatatanGuru(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {namaSiswa.length + nilai.length} karakter
                </span>
                <Button
                  onClick={handleFeedback}
                  disabled={loading || !namaSiswa || !nilai}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Membuat Feedback...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Buat Feedback dengan AI
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result Section */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback Personal</CardTitle>
              <CardDescription>
                Hasil analisis AI untuk siswa {namaSiswa || "..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <Users className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Belum ada feedback</p>
                  <p className="text-sm">Masukkan data siswa dan klik "Buat Feedback dengan AI"</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-4" />
                  <p className="text-lg font-medium text-gray-600">AI sedang membuat feedback...</p>
                  <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Performance Analysis */}
                  <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Analisis Performa</p>
                      <div className="flex items-center gap-2">
                        {getTrenIcon(result.analisisPerforma.tren)}
                        <Badge className={result.analisisPerforma.status === "LULUS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {result.analisisPerforma.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{result.analisisPerforma.skor}/100</p>
                    <p className="text-sm text-gray-600">Tren: {result.analisisPerforma.tren}</p>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">Kekuatan</p>
                      <ul className="space-y-1">
                        {result.analisisPerforma.kekuatan.map((k: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-2">Kelemahan</p>
                      <ul className="space-y-1">
                        {result.analisisPerforma.kelemahan.map((k: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Personal Feedback */}
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-1">Apresiasi</p>
                    <p className="text-sm text-blue-600">{result.feedbackPersonal.apresiasi}</p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-1">Motivasi</p>
                    <p className="text-sm text-green-600">{result.feedbackPersonal.motivasi}</p>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Rekomendasi</p>
                    <div className="space-y-2">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-1">Materi Perlu Dipelajari</p>
                        <ul className="space-y-1">
                          {result.rekomendasi.materiPerluDipelajari.map((m: string, i: number) => (
                            <li key={i} className="text-sm text-gray-600">• {m}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-1">Strategi Belajar</p>
                        <ul className="space-y-1">
                          {result.rekomendasi.strategiBelajar.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-gray-600">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-1">Target Nilai</p>
                        <p className="text-lg font-bold text-violet-600">{result.rekomendasi.targetNilai}/100</p>
                      </div>
                    </div>
                  </div>

                  {/* Parent Report */}
                  {mode === "orangtua" && result.laporanOrangTua && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <p className="text-sm font-medium text-orange-700 mb-1">Laporan untuk Orang Tua</p>
                      <p className="text-sm text-orange-600">{result.laporanOrangTua.ringkasan}</p>
                    </div>
                  )}

                  {/* Motivational Message */}
                  <div className="p-4 bg-gradient-to-r from-violet-100 to-purple-100 rounded-lg border border-violet-200">
                    <p className="text-sm font-medium text-violet-700 mb-1">Pesan Motivasi untuk {namaSiswa}</p>
                    <p className="text-sm text-violet-600 italic">{result.pesanMotivasi}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
