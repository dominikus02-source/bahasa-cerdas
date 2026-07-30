"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Database, BookOpen, BarChart3, TrendingUp, Users, Loader2 } from "lucide-react";

interface AdminSoal {
  id: string;
  kodeSoal: string | null;
  judul: string | null;
  text: string;
  type: string;
  difficulty: string;
  topik: string | null;
  kelas: string | null;
  semester: number | null;
  levelBerpikir: number | null;
  usedCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number | null;
}

const KELAS_OPTIONS = ["1","2","3","4","5","6","7","8","9","10","11","12"];

export default function AdminBankSoalPage() {
  const [soals, setSoals] = useState<AdminSoal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalInDataFiles, setTotalInDataFiles] = useState(0);
  const [temas, setTemas] = useState<string[]>([]);
  const [themesMeta, setThemesMeta] = useState<{ id: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTema, setFilterTema] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterTema) params.set("tema", filterTema);
    if (filterKelas) params.set("kelas", filterKelas);
    params.set("page", String(page));

    fetch(`/api/admin/bank-soal?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setSoals(data.soals || []);
        setTotal(data.total || 0);
        setTotalInDataFiles(data.totalInDataFiles || 0);
        setTemas(data.temas || []);
        setThemesMeta(data.themesMeta || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const stats = [
    { label: "Total Soal di Data", value: totalInDataFiles, icon: Database, color: "text-blue-600 bg-blue-50" },
    { label: "Total Tema", value: themesMeta.length, icon: BookOpen, color: "text-emerald-600 bg-emerald-50" },
    { label: "Total Soal di DB", value: total, icon: BarChart3, color: "text-violet-600 bg-violet-50" },
    { label: "Rata-rata Akurasi", value: soals.length > 0 ? `${Math.round(soals.reduce((s, q) => s + (q.accuracy || 0), 0) / soals.length)}%` : "-", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Master Bank Soal</h1>
        <p className="mt-1 text-sm text-gray-500">Kelola bank soal Bahasa Indonesia untuk seluruh tema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Theme distribution */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Distribusi Tema</h3>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {themesMeta.map(t => (
            <div key={t.id} className="p-2 rounded-lg bg-gray-50 border text-center">
              <p className="text-xs font-medium text-gray-900 truncate">{t.id.replace(/-/g, " ")}</p>
              <p className="text-lg font-bold text-emerald-600">{t.count}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cari soal (judul, teks, kode)..."
            className="pl-9"
          />
        </div>
        <select value={filterTema} onChange={(e) => { setFilterTema(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-xl border text-sm bg-white">
          <option value="">Semua Tema</option>
          {temas.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterKelas} onChange={(e) => { setFilterKelas(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-xl border text-sm bg-white">
          <option value="">Semua Kelas</option>
          {KELAS_OPTIONS.map(k => <option key={k} value={k}>Kelas {k}</option>)}
        </select>
        <Button onClick={handleSearch} variant="outline">Cari</Button>
      </div>

      {/* Soal list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : soals.length === 0 ? (
        <Card className="py-16 text-center">
          <Database className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 font-semibold text-gray-900">Belum ada soal di database</h3>
          <p className="mt-1 text-sm text-gray-500">Jalankan seeder untuk mengisi data: npm run seed:question-bank</p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {soals.map((s) => (
              <Card key={s.id} className="p-3 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {s.kodeSoal && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-white font-mono">{s.kodeSoal}</Badge>
                      )}
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700">{s.topik || "Umum"}</Badge>
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700">{s.type?.replace("_", " ")}</Badge>
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${
                        s.difficulty === "EASY" ? "bg-green-100 text-green-700" :
                        s.difficulty === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>{s.difficulty}</Badge>
                      {s.kelas && <Badge className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600">Kelas {s.kelas}</Badge>}
                      {s.levelBerpikir && <Badge className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700">Lvl {s.levelBerpikir}</Badge>}
                    </div>
                    {s.judul && <p className="text-sm font-semibold text-gray-900">{s.judul}</p>}
                    <p className="text-sm text-gray-700 line-clamp-2 mt-0.5">{s.text}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={12} /> {s.usedCount} dipakai</span>
                      {s.accuracy !== null && (
                        <span className={`flex items-center gap-1 ${s.accuracy >= 70 ? "text-green-600" : "text-orange-600"}`}>
                          <TrendingUp size={12} /> {s.accuracy}% benar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Sebelumnya
              </Button>
              <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Selanjutnya
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
