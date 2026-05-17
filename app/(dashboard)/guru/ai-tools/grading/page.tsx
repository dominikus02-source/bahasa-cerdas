"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  GraduationCap,
  BookOpen,
  FileText
} from "lucide-react";

interface DetailNilai {
  [key: string]: {
    skor: number;
    maksimal: number;
    komentar: string;
  };
}

interface GradingResult {
  skor: number;
  grade: string;
  status: string;
  detailNilai: DetailNilai;
  feedbackPositif: string[];
  feedbackPerbaikan: string[];
  saran: string;
  ringkasan: string;
}

export default function AutoGradingPage() {
  const [soal, setSoal] = useState("");
  const [jawabanSiswa, setJawabanSiswa] = useState("");
  const [rubrik, setRubrik] = useState("");
  const [tipeSoal, setTipeSoal] = useState("essay");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState("");

  const handleGrade = async () => {
    if (!soal || !jawabanSiswa) {
      setError("Soal dan jawaban siswa wajib diisi");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soal, jawabanSiswa, rubrik, tipeSoal }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal melakukan penilaian");
        return;
      }

      setResult(data.result);
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-100 text-green-700 border-green-200";
      case "B": return "bg-blue-100 text-blue-700 border-blue-200";
      case "C": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "D": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-red-100 text-red-700 border-red-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <GraduationCap className="w-4 h-4" />
            AI Penilaian Otomatis
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Penilaian Otomatis Essay
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Sistem penilaian otomatis untuk tugas & ujian. AI menganalisis jawaban siswa dan memberikan nilai objektif dengan rubrik yang sesuai.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Input Penilaian</CardTitle>
              <CardDescription>
                Masukkan soal dan jawaban siswa untuk dinilai
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={tipeSoal} onValueChange={setTipeSoal}>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="essay">Essay</TabsTrigger>
                  <TabsTrigger value="pilihanGanda">Pilihan Ganda</TabsTrigger>
                </TabsList>
              </Tabs>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Soal / Pertanyaan
                </label>
                <Textarea
                  placeholder="Masukkan soal atau pertanyaan..."
                  value={soal}
                  onChange={(e) => setSoal(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Jawaban Siswa
                </label>
                <Textarea
                  placeholder="Masukkan jawaban siswa..."
                  value={jawabanSiswa}
                  onChange={(e) => setJawabanSiswa(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Rubrik Penilaian (Opsional)
                </label>
                <Textarea
                  placeholder="Masukkan rubrik penilaian jika ada..."
                  value={rubrik}
                  onChange={(e) => setRubrik(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {soal.length + jawabanSiswa.length} karakter total
                </span>
                <Button
                  onClick={handleGrade}
                  disabled={loading || !soal || !jawabanSiswa}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menilai...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Nilai dengan AI
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
              <CardTitle>Hasil Penilaian</CardTitle>
              <CardDescription>
                Hasil analisis AI terhadap jawaban siswa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <GraduationCap className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Belum ada hasil</p>
                  <p className="text-sm">Masukkan soal dan jawaban, lalu klik "Nilai dengan AI"</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
                  <p className="text-lg font-medium text-gray-600">AI sedang menilai...</p>
                  <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Score Card */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border">
                    <div>
                      <p className="text-sm text-gray-600">Nilai Akhir</p>
                      <p className="text-3xl font-bold text-gray-900">{result.skor}/100</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`text-lg px-4 py-2 ${getGradeColor(result.grade)}`}>
                        Grade {result.grade}
                      </Badge>
                      <Badge className={result.status === "LULUS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {result.status === "LULUS" ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                        {result.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Ringkasan Penilaian</p>
                    <p className="text-sm text-gray-600">{result.ringkasan}</p>
                  </div>

                  {/* Detail Nilai */}
                  {result.detailNilai && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Detail Nilai</p>
                      <div className="space-y-2">
                        {Object.entries(result.detailNilai).map(([key, value]) => (
                          <div key={key} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className="text-sm text-gray-600">
                                {value.skor}/{value.maksimal}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-600 h-2 rounded-full" 
                                style={{ width: `${(value.skor / value.maksimal) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{value.komentar}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback Positif */}
                  {result.feedbackPositif && result.feedbackPositif.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Feedback Positif</p>
                      <ul className="space-y-1">
                        {result.feedbackPositif.map((feedback, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {feedback}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Feedback Perbaikan */}
                  {result.feedbackPerbaikan && result.feedbackPerbaikan.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Perlu Diperbaiki</p>
                      <ul className="space-y-1">
                        {result.feedbackPerbaikan.map((feedback, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            {feedback}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Saran */}
                  {result.saran && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-1">Saran</p>
                      <p className="text-sm text-blue-600">{result.saran}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
