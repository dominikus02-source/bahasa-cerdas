"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Loader2, 
  Presentation, 
  Download,
  CheckCircle2,
  FileText,
  Layers
} from "lucide-react";

export default function AdminPPTGeneratorPage() {
  const [title, setTitle] = useState("");
  const [topik, setTopik] = useState("");
  const [grade, setGrade] = useState("SMA Kelas 10");
  const [kurikulum, setKurikulum] = useState("MERDEKA");
  const [jumlahSlide, setJumlahSlide] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const grades = [
    "SD Kelas 1", "SD Kelas 2", "SD Kelas 3", "SD Kelas 4", "SD Kelas 5", "SD Kelas 6",
    "SMP Kelas 7", "SMP Kelas 8", "SMP Kelas 9",
    "SMA Kelas 10", "SMA Kelas 11", "SMA Kelas 12",
  ];

  const handleGenerate = async () => {
    if (!title || !topik) {
      setError("Judul dan topik wajib diisi");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/generate-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, topik, grade, kurikulum, jumlahSlide }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal generate PPT");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Presentation className="w-4 h-4" />
            Admin Only
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Generator PPT Materi Ajar
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Generate presentasi PowerPoint profesional dengan branding BahasaCerdas. Konten sesuai Kurikulum Merdeka.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Parameter Presentasi</CardTitle>
              <CardDescription>
                Isi detail materi yang akan di-generate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Judul Materi *
                </label>
                <Input
                  placeholder="Contoh: Teks Prosedur"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Topik/Pembahasan *
                </label>
                <Textarea
                  placeholder="Deskripsikan topik yang akan dibahas..."
                  value={topik}
                  onChange={(e) => setTopik(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Kelas
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Kurikulum
                  </label>
                  <select
                    value={kurikulum}
                    onChange={(e) => setKurikulum(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="MERDEKA">Kurikulum Merdeka</option>
                    <option value="K13">Kurikulum 2013</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Jumlah Slide: {jumlahSlide}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={jumlahSlide}
                  onChange={(e) => setJumlahSlide(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5 slide</span>
                  <span>20 slide</span>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading || !title || !topik}
                className="w-full bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generate PPT...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate PPT dengan AI
                  </>
                )}
              </Button>

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
              <CardTitle>Hasil Generate</CardTitle>
              <CardDescription>
                Preview dan download PPT yang sudah di-generate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <Presentation className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Belum ada hasil</p>
                  <p className="text-sm">Isi parameter dan klik "Generate PPT dengan AI"</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
                  <p className="text-lg font-medium text-gray-600">AI sedang generate PPT...</p>
                  <p className="text-sm text-gray-400">Mohon tunggu sebentar</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Success Card */}
                  <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <p className="font-medium text-green-700">PPT Berhasil Di-generate!</p>
                    </div>
                    <p className="text-sm text-green-600">
                      {result.slides} slide telah dibuat dan tersimpan di database
                    </p>
                  </div>

                  {/* Research Summary */}
                  {result.materi?.content && JSON.parse(result.materi.content).risetSummary && (
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                      <p className="text-sm font-medium text-purple-700 mb-1">📚 Ringkasan Riset AI</p>
                      <p className="text-sm text-purple-600">{JSON.parse(result.materi.content).risetSummary}</p>
                    </div>
                  )}

                  {/* Kompetensi */}
                  {result.materi?.content && JSON.parse(result.materi.content).kompetensiDasar && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-2">🎯 Kompetensi & Capaian Pembelajaran</p>
                      <div className="space-y-1">
                        {JSON.parse(result.materi.content).kompetensiDasar.map((kd: string, i: number) => (
                          <p key={i} className="text-xs text-blue-600">• {kd}</p>
                        ))}
                        {JSON.parse(result.materi.content).capaianPembelajaran && (
                          <p className="text-xs text-blue-600 mt-2">
                            <strong>CP:</strong> {JSON.parse(result.materi.content).capaianPembelajaran}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sumber Gambar */}
                  {result.materi?.content && JSON.parse(result.materi.content).sumberGambar && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                      <p className="text-sm font-medium text-green-700 mb-2">📷 Sumber Gambar Gratis (Bebas Copyright)</p>
                      <div className="space-y-1">
                        <a href={JSON.parse(result.materi.content).sumberGambar.unsplash} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline block">
                          • Unsplash: {JSON.parse(result.materi.content).sumberGambar.unsplash}
                        </a>
                        <a href={JSON.parse(result.materi.content).sumberGambar.pexels} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline block">
                          • Pexels: {JSON.parse(result.materi.content).sumberGambar.pexels}
                        </a>
                        <a href={JSON.parse(result.materi.content).sumberGambar.pixabay} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline block">
                          • Pixabay: {JSON.parse(result.materi.content).sumberGambar.pixabay}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Contoh Implementasi */}
                  {result.materi?.content && JSON.parse(result.materi.content).contohImplementasi && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-sm font-medium text-amber-700 mb-2">💡 Contoh Implementasi Materi</p>
                      <div className="space-y-2">
                        {JSON.parse(result.materi.content).contohImplementasi.latihanKelas && (
                          <div>
                            <p className="text-xs font-medium text-amber-600">Latihan Kelas:</p>
                            {JSON.parse(result.materi.content).contohImplementasi.latihanKelas.map((l: string, i: number) => (
                              <p key={i} className="text-xs text-amber-600 ml-2">• {l}</p>
                            ))}
                          </div>
                        )}
                        {JSON.parse(result.materi.content).contohImplementasi.aktivitasInteraktif && (
                          <div>
                            <p className="text-xs font-medium text-amber-600">Aktivitas Interaktif:</p>
                            {JSON.parse(result.materi.content).contohImplementasi.aktivitasInteraktif.map((a: string, i: number) => (
                              <p key={i} className="text-xs text-amber-600 ml-2">• {a}</p>
                            ))}
                          </div>
                        )}
                        {JSON.parse(result.materi.content).contohImplementasi.proyekMini && (
                          <div>
                            <p className="text-xs font-medium text-amber-600">Proyek Mini:</p>
                            <p className="text-xs text-amber-600 ml-2">{JSON.parse(result.materi.content).contohImplementasi.proyekMini}</p>
                          </div>
                        )}
                        {JSON.parse(result.materi.content).contohImplementasi.rubrikPenilaian && (
                          <div>
                            <p className="text-xs font-medium text-amber-600">Rubrik Penilaian:</p>
                            <p className="text-xs text-amber-600 ml-2">{JSON.parse(result.materi.content).contohImplementasi.rubrikPenilaian}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Info Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Judul</p>
                      <p className="text-sm font-medium text-gray-900">{result.materi?.title}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Kelas</p>
                      <p className="text-sm font-medium text-gray-900">{result.materi?.grade}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Jumlah Slide</p>
                      <p className="text-sm font-medium text-gray-900">{result.slides}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">File Type</p>
                      <p className="text-sm font-medium text-gray-900">{result.materi?.fileType}</p>
                    </div>
                  </div>

                  {/* Slide Preview */}
                  {result.materi?.content && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview Slide</p>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {JSON.parse(result.materi.content).slides?.map((slide: any, i: number) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Slide {i + 1}
                              </Badge>
                              <span className="text-xs text-gray-500">{slide.type}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-700">{slide.title}</p>
                            {slide.bullets && (
                              <ul className="text-xs text-gray-500 mt-1">
                                {slide.bullets.slice(0, 2).map((b: string, j: number) => (
                                  <li key={j}>• {b}</li>
                                ))}
                                {slide.bullets.length > 2 && (
                                  <li>... dan {slide.bullets.length - 2} lainnya</li>
                                )}
                              </ul>
                            )}
                            {slide.imageSuggestion && (
                              <p className="text-xs text-blue-600 mt-1">
                                📷 {slide.imageSuggestion.description}
                              </p>
                            )}
                            {slide.contohImplementasi && (
                              <p className="text-xs text-amber-600 mt-1">
                                💡 {slide.contohImplementasi}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Download Button */}
                  <a
                    href={result.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <Download className="w-4 h-4 mr-2" />
                      Download PPTX
                    </Button>
                  </a>

                  {/* Features */}
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-2">Fitur PPT</p>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Riset Mendalam (KD, CP, Kurikulum)
                      </li>
                      <li className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Saran Gambar Gratis (Unsplash/Pexels/Pixabay)
                      </li>
                      <li className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Contoh Implementasi (Latihan/Aktivitas/Proyek)
                      </li>
                      <li className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Branding BahasaCerdas (Logo & Copyright)
                      </li>
                      <li className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Template Profesional
                      </li>
                      <li className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Catatan Presenter (Tips Mengajar)
                      </li>
                      <li className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Sesuai Kurikulum Merdeka
                      </li>
                    </ul>
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
