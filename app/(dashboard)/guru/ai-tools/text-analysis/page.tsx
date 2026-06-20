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
  Copy, 
  BookOpen, 
  FileText, 
  PenTool,
  Layers,
  Search
} from "lucide-react";

interface RingkasanResult {
  ringkasan: string;
  idePokok: string[];
  kataKunci: string[];
  jumlahKataAsli: number;
  jumlahKataRingkasan: number;
  persentasePemadatan: number;
  jenisTeks: string;
}

interface PuisiResult {
  judul: string;
  pengarang: string;
  tema: string;
  amanat: string;
  majas: { jenis: string; contoh: string; makna: string }[];
  diksi: { kataKunci: string[]; gayaBahasa: string };
  struktur: { jumlahBait: number; jumlahBaris: number; polaRima: string; irama: string };
  interpretasi: string;
}

interface CerpenResult {
  tema: string;
  alur: string;
  tokoh: { nama: string; peran: string; watak: string; penokohan: string }[];
  latar: { tempat: string; waktu: string; suasana: string };
  amanat: string;
  sudutPandang: string;
  konflik: { utama: string; jenis: string };
  penilaian: { skor: number; kelebihan: string[]; kekurangan: string[] };
}

interface MajasResult {
  totalMajas: number;
  majas: { jenis: string; kelompok: string; kutipan: string; makna: string; fungsi: string }[];
  ringkasan: string;
}

interface StrukturResult {
  jenisTeks: string;
  struktur: { bagian: string; paragraf: string; fungsi: string; isi: string }[];
  koherensi: { skor: number; keterangan: string };
  kataPenghubung: string[];
  penilaian: { skor: number; kelebihan: string[]; saran: string[] };
}

export default function TextAnalysisPage() {
  const [teks, setTeks] = useState("");
  const [mode, setMode] = useState("ringkasan");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (teks.length < 50) {
      setError("Teks terlalu pendek (minimal 50 karakter)");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/text-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teks, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal melakukan analisis");
        return;
      }

      setResult(data.result);
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const modeLabels: Record<string, string> = {
    ringkasan: "Ringkasan Teks",
    puisi: "Analisis Puisi",
    cerpen: "Analisis Cerpen",
    majas: "Deteksi Majas",
    struktur: "Analisis Struktur",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="mb-6 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-emerald-700">
            Versi baru alat ini tersedia di{" "}
            <a href="/guru/ai-tools?agent=text-analysis" className="font-medium underline hover:text-emerald-800">Alat AI utama</a>.
          </p>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            AI Analisis Teks & Sastra
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ringkasan Teks & Sastra
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Ringkas teks panjang, analisis unsur intrinsik sastra, dan identifikasi gaya bahasa secara otomatis dengan AI canggih.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Teks untuk Dianalisis</CardTitle>
              <CardDescription>
                Masukkan teks yang ingin Anda analisis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="grid grid-cols-5">
                  <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
                  <TabsTrigger value="puisi">Puisi</TabsTrigger>
                  <TabsTrigger value="cerpen">Cerpen</TabsTrigger>
                  <TabsTrigger value="majas">Majas</TabsTrigger>
                  <TabsTrigger value="struktur">Struktur</TabsTrigger>
                </TabsList>
              </Tabs>

              <Textarea
                placeholder={`Masukkan ${mode === "puisi" ? "puisi" : mode === "cerpen" ? "cerpen" : "teks"} Anda di sini...`}
                value={teks}
                onChange={(e) => setTeks(e.target.value)}
                className="min-h-[300px] resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {teks.length} karakter
                </span>
                <Button
                  onClick={handleAnalyze}
                  disabled={loading || teks.length < 50}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analisis dengan AI
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
              <CardTitle>Hasil Analisis</CardTitle>
              <CardDescription>
                {modeLabels[mode]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <BookOpen className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Belum ada hasil</p>
                  <p className="text-sm">Masukkan teks dan klik "Analisis dengan AI"</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
                  <p className="text-lg font-medium text-gray-600">AI sedang menganalisis...</p>
                  <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                </div>
              )}

              {result && mode === "ringkasan" && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-1">Ringkasan</p>
                    <p className="text-sm text-green-600">{result.ringkasan}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Ide Pokok</p>
                    <ul className="space-y-1">
                      {result.idePokok?.map((ide: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Layers className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {ide}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500">Kata Asli</p>
                      <p className="text-lg font-bold">{result.jumlahKataAsli}</p>
                    </div>
                    <div className="flex-1 p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500">Kata Ringkasan</p>
                      <p className="text-lg font-bold text-green-600">{result.jumlahKataRingkasan}</p>
                    </div>
                    <div className="flex-1 p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500">Pemadatan</p>
                      <p className="text-lg font-bold text-blue-600">{result.persentasePemadatan}%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Kata Kunci</p>
                    <div className="flex flex-wrap gap-2">
                      {result.kataKunci?.map((kata: string, i: number) => (
                        <Badge key={i} variant="secondary">{kata}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Jenis Teks</p>
                    <Badge className="bg-blue-100 text-blue-700">{result.jenisTeks}</Badge>
                  </div>
                </div>
              )}

              {result && mode === "puisi" && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                    <p className="text-sm font-medium text-purple-700 mb-1">Tema & Amanat</p>
                    <p className="text-sm text-purple-600"><strong>Tema:</strong> {result.tema}</p>
                    <p className="text-sm text-purple-600"><strong>Amanat:</strong> {result.amanat}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Majas</p>
                    <div className="space-y-2">
                      {result.majas?.map((m: any, i: number) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <Badge className="mb-1">{m.jenis}</Badge>
                          <p className="text-sm text-gray-600 italic">"{m.contoh}"</p>
                          <p className="text-xs text-gray-500">{m.makna}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-1">Interpretasi</p>
                    <p className="text-sm text-blue-600">{result.interpretasi}</p>
                  </div>
                </div>
              )}

              {result && mode === "cerpen" && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                    <p className="text-sm font-medium text-orange-700 mb-1">Unsur Intrinsik</p>
                    <p className="text-sm text-orange-600"><strong>Tema:</strong> {result.tema}</p>
                    <p className="text-sm text-orange-600"><strong>Alur:</strong> {result.alur}</p>
                    <p className="text-sm text-orange-600"><strong>Sudut Pandang:</strong> {result.sudutPandang}</p>
                    <p className="text-sm text-orange-600"><strong>Amanat:</strong> {result.amanat}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Tokoh</p>
                    <div className="space-y-2">
                      {result.tokoh?.map((t: any, i: number) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge>{t.nama}</Badge>
                            <Badge variant="outline">{t.peran}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">{t.watak}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Konflik</p>
                    <p className="text-sm text-gray-600">{result.konflik?.utama}</p>
                    <Badge className="mt-1">{result.konflik?.jenis}</Badge>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-1">Penilaian</p>
                    <p className="text-lg font-bold text-green-600">{result.penilaian?.skor}/100</p>
                  </div>
                </div>
              )}

              {result && mode === "majas" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-lg">
                    <p className="text-sm font-medium text-purple-700">Total Majas Ditemukan</p>
                    <Badge className="text-lg">{result.totalMajas}</Badge>
                  </div>

                  <div className="space-y-2">
                    {result.majas?.map((m: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge>{m.jenis}</Badge>
                          <Badge variant="outline">{m.kelompok}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 italic">"{m.kutipan}"</p>
                        <p className="text-xs text-gray-500">{m.makna}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-1">Ringkasan</p>
                    <p className="text-sm text-blue-600">{result.ringkasan}</p>
                  </div>
                </div>
              )}

              {result && mode === "struktur" && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-1">Jenis Teks</p>
                    <Badge className="text-lg">{result.jenisTeks}</Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Struktur Teks</p>
                    <div className="space-y-2">
                      {result.struktur?.map((s: any, i: number) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium">{s.bagian}</p>
                          <p className="text-xs text-gray-500">Paragraf: {s.paragraf}</p>
                          <p className="text-xs text-gray-600">{s.fungsi}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500">Koherensi</p>
                      <p className="text-lg font-bold text-green-600">{result.koherensi?.skor}%</p>
                    </div>
                    <div className="flex-1 p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500">Penilaian</p>
                      <p className="text-lg font-bold text-blue-600">{result.penilaian?.skor}/100</p>
                    </div>
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
