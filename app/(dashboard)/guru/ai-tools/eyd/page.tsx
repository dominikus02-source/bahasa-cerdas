"use client";

import { useState } from "react";
import { getUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  Copy, 
  Download,
  BookOpen,
  PenTool,
  FileText
} from "lucide-react";

interface KoreksiItem {
  asli: string;
  benar: string;
  jenis: string;
  penjelasan: string;
  posisi: string;
}

interface EYDResult {
  skor: number;
  grade: string;
  jumlahKesalahan: number;
  koreksi: KoreksiItem[];
  teksDikoreksi: string;
  saranPerbaikan: string[];
  ringkasan: string;
}

export default function EYDCheckerPage() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("eyd");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EYDResult | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (text.length < 10) {
      setError("Teks terlalu pendek (minimal 10 karakter)");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/eyd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal melakukan koreksi");
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

  const getJenisIcon = (jenis: string) => {
    switch (jenis) {
      case "ejaan": return <FileText className="w-4 h-4" />;
      case "tandabaca": return <PenTool className="w-4 h-4" />;
      case "tatabahasa": return <BookOpen className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="mb-6 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-emerald-700">
            Versi baru alat ini tersedia di{" "}
            <a href="/guru/ai-tools?agent=eyd" className="font-medium underline hover:text-emerald-800">Alat AI utama</a>.
          </p>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI Korektor Bahasa Indonesia
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Korektor EYD & Tata Bahasa
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Koreksi otomatis EYD V, PUEBI, dan tata bahasa Indonesia. Dapatkan saran perbaikan real-time untuk dokumen akademik Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Teks yang Akan Dikoreksi</CardTitle>
              <CardDescription>
                Masukkan teks yang ingin Anda periksa ejaan dan tata bahasanya
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="eyd">EYD V</TabsTrigger>
                  <TabsTrigger value="puebi">PUEBI</TabsTrigger>
                  <TabsTrigger value="tataBahasa">Tata Bahasa</TabsTrigger>
                  <TabsTrigger value="lengkap">Lengkap</TabsTrigger>
                </TabsList>
              </Tabs>

              <Textarea
                placeholder="Masukkan teks Anda di sini..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[300px] resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {text.length} karakter
                </span>
                <Button
                  onClick={handleCheck}
                  disabled={loading || text.length < 10}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengecek...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Koreksi dengan AI
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
              <CardTitle>Hasil Koreksi</CardTitle>
              <CardDescription>
                Hasil analisis AI terhadap teks Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Belum ada hasil</p>
                  <p className="text-sm">Masukkan teks dan klik "Koreksi dengan AI"</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-lg font-medium text-gray-600">AI sedang menganalisis...</p>
                  <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Score Card */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                    <div>
                      <p className="text-sm text-gray-600">Skor Kebenaran</p>
                      <p className="text-3xl font-bold text-gray-900">{result.skor}%</p>
                    </div>
                    <Badge className={`text-lg px-4 py-2 ${getGradeColor(result.grade)}`}>
                      Grade {result.grade}
                    </Badge>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Ringkasan</p>
                    <p className="text-sm text-gray-600">{result.ringkasan}</p>
                  </div>

                  {/* Corrections */}
                  {result.koreksi && result.koreksi.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Koreksi ({result.jumlahKesalahan} kesalahan ditemukan)
                      </p>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {result.koreksi.map((k, i) => (
                          <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                            <div className="flex items-start gap-2">
                              {getJenisIcon(k.jenis)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-red-600 line-through text-sm">{k.asli}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-green-600 font-medium text-sm">{k.benar}</span>
                                </div>
                                <p className="text-xs text-gray-500">{k.penjelasan}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Corrected Text */}
                  {result.teksDikoreksi && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Teks yang Sudah Dikoreksi</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(result.teksDikoreksi)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Salin
                        </Button>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.teksDikoreksi}</p>
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {result.saranPerbaikan && result.saranPerbaikan.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Saran Perbaikan</p>
                      <ul className="space-y-1">
                        {result.saranPerbaikan.map((saran, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {saran}
                          </li>
                        ))}
                      </ul>
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
