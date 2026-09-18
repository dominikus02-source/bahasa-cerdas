"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Database, BookOpen, TrendingUp, Users, Loader2, Archive, BadgeCheck } from "lucide-react";

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

const DIFFICULTY_BADGE: Record<string, string> = {
  // Founder bank taxonomy (MUDAH/SEDANG/SULIT)…
  MUDAH: "bg-green-100 text-green-700 dark:text-green-300",
  SEDANG: "bg-amber-100 text-amber-700 dark:text-amber-300",
  SULIT: "bg-red-100 text-red-700 dark:text-red-300",
  // …plus legacy English values so older rows still style correctly.
  EASY: "bg-green-100 text-green-700 dark:text-green-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:text-amber-300",
  HARD: "bg-red-100 text-red-700 dark:text-red-300",
};

export default function AdminBankSoalPage() {
  const [soals, setSoals] = useState<AdminSoal[]>([]);
  const [total, setTotal] = useState(0);
  const [founderCount, setFounderCount] = useState(0);
  const [retiredCount, setRetiredCount] = useState(0);
  const [globalAccuracy, setGlobalAccuracy] = useState<number | null>(null);
  const [temas, setTemas] = useState<string[]>([]);
  const [themesMeta, setThemesMeta] = useState<{ id: string; count: number }[]>([]);
  const [kelasValues, setKelasValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTema, setFilterTema] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(() => {
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
        setFounderCount(data.founderCount ?? 0);
        setRetiredCount(data.retiredCount ?? 0);
        setGlobalAccuracy(data.globalAccuracy ?? null);
        setTemas(data.temas || []);
        setThemesMeta(data.themesMeta || []);
        setKelasValues(data.kelasValues || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filterTema, filterKelas, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
  };

  const stats = [
    { label: "Soal Aktif (Founder)", value: total, icon: Database, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" },
    { label: "Tema Aktif", value: themesMeta.length, icon: BookOpen, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Retired (audit)", value: retiredCount, icon: Archive, color: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60" },
    { label: "Akurasi Global", value: globalAccuracy !== null ? `${globalAccuracy}%` : "-", icon: TrendingUp, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Master Bank Soal</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
          Pustaka soal aktif — sumber yang sama dengan Bank Soal Guru
          {total > 0 && founderCount === total ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <BadgeCheck size={14} /> {founderCount}/{total} soal Founder (BC-GB2-*)
            </span>
          ) : total > 0 ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">⚠ {total - founderCount} soal non-Founder terdeteksi</span>
          ) : null}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Theme distribution (from DB — canonical active themes) */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">
          Distribusi Tema {themesMeta.length > 0 && <span className="text-xs font-normal text-gray-400">({themesMeta.length} tema aktif)</span>}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2">
          {themesMeta.map(t => (
            <div key={t.id} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 border text-center">
              <p className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate" title={t.id}>{t.id}</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{t.count}</p>
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
          className="h-10 px-3 rounded-xl border text-sm bg-white dark:bg-slate-800/90">
          <option value="">Semua Tema</option>
          {temas.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterKelas} onChange={(e) => { setFilterKelas(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-xl border text-sm bg-white dark:bg-slate-800/90">
          <option value="">Semua Kelas</option>
          {kelasValues.map(k => <option key={k} value={k}>{k === "SEMUA" ? "SEMUA (reusable)" : `Kelas ${k}`}</option>)}
        </select>
        <Button onClick={handleSearch} variant="outline">Cari</Button>
      </div>

      {/* Soal list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" /></div>
      ) : soals.length === 0 ? (
        <Card className="py-16 text-center">
          <Database className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 font-semibold text-gray-900 dark:text-slate-100">Tidak ada soal yang cocok</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {total === 0 && !search && !filterTema && !filterKelas
              ? "Bank soal aktif kosong. Konten dikelola lewat scripts/import-founder-bank.ts (dry-run default)."
              : "Coba ubah kata kunci atau reset filter."}
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {soals.map((s) => (
              <Card key={s.id} className="p-3 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {s.kodeSoal && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-white font-mono">{s.kodeSoal}</Badge>
                      )}
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:text-emerald-300">{s.topik || "Umum"}</Badge>
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:text-blue-300">{s.type?.replace("_", " ")}</Badge>
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${DIFFICULTY_BADGE[s.difficulty] ?? "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300"}`}>{s.difficulty}</Badge>
                      {s.kelas && <Badge className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300">{s.kelas === "SEMUA" ? "Reusable (SEMUA)" : `Kelas ${s.kelas}`}</Badge>}
                      {s.levelBerpikir && <Badge className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:text-purple-300">Lvl {s.levelBerpikir}</Badge>}
                    </div>
                    {s.judul && <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{s.judul}</p>}
                    <p className="text-sm text-gray-700 dark:text-slate-300 line-clamp-2 mt-0.5">{s.text}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Users size={12} /> {s.usedCount} dipakai</span>
                      {s.accuracy !== null && (
                        <span className={`flex items-center gap-1 ${s.accuracy >= 70 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
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
              <span className="text-sm text-gray-500 dark:text-slate-400">Halaman {page} dari {totalPages} ({total} soal)</span>
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
