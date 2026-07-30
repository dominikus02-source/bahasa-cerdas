"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Loader2, Search, BookOpen, Users, TrendingUp,
  Clock, Check, X, Trash2, BarChart3, ClipboardList,
  Send, GraduationCap, Target, Zap, Eye, Sparkles,
  HelpCircle, ChevronRight, ChevronLeft, ChevronDown,
  Brain, Headphones, School, MoreVertical, Gamepad2,
} from "lucide-react";

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];

const THEMES = [
  "SPOK", "Kalimat Efektif", "Cerpen", "Puisi", "Pantun",
  "Teks Deskripsi", "Teks Prosedur", "Teks Eksplanasi", "Teks Persuasi",
  "Teks Argumentasi", "Teks Eksposisi", "Teks Berita", "Fabel", "Legenda",
  "Hikayat", "Drama", "Surat Dinas", "Surat Pribadi", "Iklan", "Poster",
  "Resensi", "Novel", "Majas", "EYD/PUEBI", "Imbuhan", "Sinonim", "Antonim",
  "Paragraf", "Ide Pokok", "Makna Kata",
];

const THEME_EMOJI: Record<string, string> = {
  "SPOK": "🔤", "Kalimat Efektif": "✏️", "Cerpen": "📖", "Puisi": "📝",
  "Pantun": "🎵", "Teks Deskripsi": "🏔️", "Teks Prosedur": "📋",
  "Teks Eksplanasi": "🔬", "Teks Persuasi": "💬", "Teks Argumentasi": "⚖️",
  "Teks Eksposisi": "📰", "Teks Berita": "📺", "Fabel": "🦊", "Legenda": "🏯",
  "Hikayat": "👑", "Drama": "🎭", "Surat Dinas": "📄", "Surat Pribadi": "💌",
  "Iklan": "📢", "Poster": "🖼️", "Resensi": "📚", "Novel": "📕", "Majas": "🎨",
  "EYD/PUEBI": "✅", "Imbuhan": "🔗", "Sinonim": "🔄", "Antonim": "⚡",
  "Paragraf": "📑", "Ide Pokok": "💡", "Makna Kata": "📖",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HARD: "bg-red-100 text-red-700",
  VERY_HARD: "bg-purple-100 text-purple-700",
};

type LatihanItem = {
  id: string;
  title: string;
  topik: string | null;
  kelas: string | null;
  difficulty: string | null;
  totalSoal: number;
  totalAssignments: number;
  totalSubmitted: number;
  avgScore: number | null;
  createdAt: string;
};

export default function BankSoalPage() {
  const router = useRouter();

  // Data state
  const [latihans, setLatihans] = useState<LatihanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterTema, setFilterTema] = useState("");
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [temaList, setTemaList] = useState<string[]>([]);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    sumber: "AI" as "AI" | "BANK",
    tema: "",
    kelas: "",
    jumlah: 10,
    difficulty: "MEDIUM",
    judul: "",
  });
  const [generatedSoal, setGeneratedSoal] = useState<any[]>([]);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignQuiz, setAssignQuiz] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [assignDue, setAssignDue] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Delete confirm
  const [showDelete, setShowDelete] = useState<string | null>(null);

  // UKBI/TKA pools
  const [pools, setPools] = useState<any[]>([]);
  const [poolFilter, setPoolFilter] = useState<"all" | "UKBI" | "TKA">("all");
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentPool, setAssessmentPool] = useState<any>(null);
  const [assessmentGroupId, setAssessmentGroupId] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDue, setAssessmentDue] = useState("");
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [openMenuPoolId, setOpenMenuPoolId] = useState<string | null>(null);

  const fetchLatihans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterKelas) params.set("kelas", filterKelas);
      if (filterTema) params.set("tema", filterTema);

      const res = await fetch(`/api/guru/latihan?${params.toString()}`);
      const data = await res.json();
      if (data.latihans) setLatihans(data.latihans);
      if (data.kelasList) setKelasList(data.kelasList);
      if (data.temaList) setTemaList(data.temaList);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, filterKelas, filterTema]);

  const fetchPools = useCallback(async () => {
    try {
      const res = await fetch("/api/guru/soal-pool");
      const data = await res.json();
      if (data.pools) setPools(data.pools);
    } catch {}
  }, []);

  useEffect(() => {
    fetchLatihans();
    fetchPools();
  }, [fetchLatihans, fetchPools]);

  // Wizard: Step 1 → Step 2
  const handlePickTema = (tema: string) => {
    setWizardForm(f => ({ ...f, tema }));
  };

  // Wizard: Generate AI
  const handleGenerate = async () => {
    setCreateLoading(true);
    setError("");
    try {
      if (wizardForm.sumber === "BANK") {
        const res = await fetch("/api/guru/latihan/pick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tema: wizardForm.tema,
            kelas: wizardForm.kelas,
            jumlah: wizardForm.jumlah,
            difficulty: wizardForm.difficulty,
          }),
        });
        const data = await res.json();
        if (data.success) {
          // Save picked soal as a Quiz (reuse existing POST /api/guru/latihan)
          const saveRes = await fetch("/api/guru/latihan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tema: wizardForm.tema,
              kelas: wizardForm.kelas,
              jumlah: data.soals.length,
              difficulty: wizardForm.difficulty,
              judul: wizardForm.judul || `Latihan: ${wizardForm.tema} (Bank Soal)`,
              _skipAI: true,
              _pickedSoals: data.soals,
            }),
          });
          const saveData = await saveRes.json();
          if (saveData.success) {
            setGeneratedSoal(saveData.soal || []);
            setGeneratedQuiz(saveData.quiz);
            setWizardStep(4);
          } else {
            setError(saveData.error || "Gagal menyimpan soal");
          }
        } else {
          setError(data.error || "Gagal mengambil soal dari bank");
        }
      } else {
        const res = await fetch("/api/guru/latihan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wizardForm),
        });
        const data = await res.json();
        if (data.success) {
          setGeneratedSoal(data.soal || []);
          setGeneratedQuiz(data.quiz);
          setWizardStep(4);
        } else if (data.error === "QUOTA_EXCEEDED") {
          setError(`Batas harian AI terpakai: ${data.used}/${data.limit}. Upgrade untuk limit lebih besar.`);
        } else {
          setError(data.error || "Gagal generate soal");
        }
      }
    } catch {
      setError("Gagal menghubungi server");
    }
    setCreateLoading(false);
  };

  // Reset wizard
  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setWizardForm({ sumber: "AI", tema: "", kelas: "", jumlah: 10, difficulty: "MEDIUM", judul: "" });
    setGeneratedSoal([]);
    setGeneratedQuiz(null);
    setError("");
  };

  // Assign
  const handleOpenAssign = async (latihan: LatihanItem) => {
    setAssignQuiz(latihan);
    setSelectedGroups([]);
    setAssignDue("");
    setShowAssign(true);
    try {
      const res = await fetch("/api/group");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch {}
  };

  const handleAssign = async () => {
    if (!assignQuiz || selectedGroups.length === 0) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/guru/quiz/${assignQuiz.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupIds: selectedGroups,
          dueDate: assignDue || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowAssign(false);
        setAssignSuccess(`✅ Latihan berhasil dikirim ke ${data.groupCount || selectedGroups.length} kelas`);
        setTimeout(() => setAssignSuccess(null), 4000);
        fetchLatihans();
      } else {
        const data = await res.json();
        setAssignSuccess(`❌ ${data.error || "Gagal mengirim latihan"}`);
        setTimeout(() => setAssignSuccess(null), 4000);
      }
    } catch {
      setAssignSuccess("❌ Gagal menghubungi server");
      setTimeout(() => setAssignSuccess(null), 4000);
    }
    setAssignLoading(false);
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/guru/latihan/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDelete(null);
        fetchLatihans();
      }
    } catch {}
  };

  // Assessment modal (UKBI/TKA)
  const handleOpenAssessment = async (pool: any) => {
    setAssessmentPool(pool);
    setAssessmentTitle(`Tugas: ${pool.title}`);
    setAssessmentGroupId("");
    setAssessmentDue("");
    setShowAssessment(true);
    setOpenMenuPoolId(null);
    try {
      const res = await fetch("/api/group");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch {}
  };

  const handleCreateAssessment = async () => {
    if (!assessmentGroupId || !assessmentPool) return;
    setAssessmentLoading(true);
    try {
      const res = await fetch("/api/guru/buat-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paketId: assessmentPool.id,
          groupId: assessmentGroupId,
          title: assessmentTitle,
          dueDate: assessmentDue || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssessment(false);
      } else {
        alert(data.error || "Gagal");
      }
    } catch {}
    setAssessmentLoading(false);
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {assignSuccess && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
          assignSuccess.includes("✅") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {assignSuccess}
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal</h1>
          <p className="mt-1 text-sm text-gray-500">Buat latihan harian dengan AI dan kirim ke kelas</p>
        </div>
        <Button
          onClick={() => { resetWizard(); setShowWizard(true); }}
          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Buat Latihan Baru
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Latihan", value: latihans.length, icon: BookOpen, color: "text-emerald-600 bg-emerald-50" },
          { label: "Total Soal", value: latihans.reduce((s, l) => s + l.totalSoal, 0), icon: HelpCircle, color: "text-blue-600 bg-blue-50" },
          { label: "Dikirim ke Kelas", value: latihans.reduce((s, l) => s + l.totalAssignments, 0), icon: Send, color: "text-amber-600 bg-amber-50" },
          { label: "Dikerjakan Murid", value: latihans.reduce((s, l) => s + l.totalSubmitted, 0), icon: Users, color: "text-violet-600 bg-violet-50" },
        ].map((s, i) => (
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

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari latihan..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">Semua Kelas</option>
          {[...new Set([...kelasList, ...KELAS])].map(k => (
            <option key={k} value={k}>Kelas {k}</option>
          ))}
        </select>
        <select
          value={filterTema}
          onChange={(e) => setFilterTema(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">Semua Tema</option>
          {temaList.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Latihan cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : latihans.length === 0 ? (
        <Card className="py-16 text-center">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold text-gray-900">Belum ada latihan</h3>
          <p className="mt-2 text-sm text-gray-500">Buat latihan baru dengan AI atau gunakan bank soal UKBI/TKA</p>
          <Button onClick={() => setShowWizard(true)} className="mt-4 bg-emerald-600">
            <Plus className="h-4 w-4 mr-1" /> Buat Latihan Pertama
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {latihans.map((latihan) => {
            const emoji = THEME_EMOJI[latihan.topik || ""] || "📝";
            return (
              <Card key={latihan.id} className="overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all">
                {/* Top bar */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{emoji}</span>
                      <div className="text-white">
                        <p className="font-bold text-sm leading-tight line-clamp-1">{latihan.title}</p>
                        <p className="text-[10px] text-emerald-100 mt-0.5">{latihan.topik || "Umum"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/guru/bank-soal/${latihan.id}`)}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                        title="Lihat Analitik"
                      >
                        <BarChart3 size={14} />
                      </button>
                      <button
                        onClick={() => setShowDelete(latihan.id)}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-red-400/40 text-white"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {latihan.kelas && (
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600">
                        Kelas {latihan.kelas}
                      </Badge>
                    )}
                    {latihan.difficulty && DIFFICULTY_BADGE[latihan.difficulty] && (
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${DIFFICULTY_BADGE[latihan.difficulty]}`}>
                        {latihan.difficulty === "EASY" ? "Mudah" : latihan.difficulty === "MEDIUM" ? "Sedang" : latihan.difficulty === "HARD" ? "Sulit" : "Sangat Sulit"}
                      </Badge>
                    )}
                    <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700">
                      {latihan.totalSoal} soal
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Send size={12} />
                      <span>{latihan.totalAssignments} kelas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      <span>{latihan.totalSubmitted} selesai</span>
                    </div>
                    {latihan.avgScore !== null && (
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className={latihan.avgScore >= 70 ? "text-green-500" : "text-orange-500"} />
                        <span className={latihan.avgScore >= 70 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                          Rata-rata {latihan.avgScore}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{new Date(latihan.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleOpenAssign(latihan)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                    >
                      <Send size={14} /> Kirim
                    </button>
                    <button
                      onClick={() => router.push(`/guru/bank-soal/${latihan.id}`)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
                    >
                      <BarChart3 size={14} /> Analitik
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200 pt-8 mt-8">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <GraduationCap className="text-emerald-500" size={20} />
          Bank Soal Kompetensi (UKBI & TKA)
        </h2>

        {/* Filter */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit mb-4">
          {(["all", "UKBI", "TKA"] as const).map(f => (
            <button
              key={f}
              onClick={() => setPoolFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                poolFilter === f ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
              }`}
            >
              {f === "all" ? "Semua" : f}
            </button>
          ))}
        </div>

        {/* Pools list */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {pools
            .filter(p => {
              if (poolFilter === "UKBI") return p.type?.includes("UKBI");
              if (poolFilter === "TKA") return p.type?.includes("TKA");
              return true;
            })
            .map((pool, idx) => {
              const product = pool.type?.includes("UKBI") ? "UKBI" : "TKA";
              const level = pool.type?.includes("SD") ? "SD"
                : pool.type?.includes("SMP") ? "SMP"
                : pool.type?.includes("SMA") ? "SMA"
                : pool.type?.includes("UTBK") ? "UTBK"
                : pool.type?.includes("GURU") ? "Guru"
                : "Umum";
              return (
                <div key={pool.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
                    <BookOpen size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px] text-gray-900 truncate">Latihan {idx + 1}</span>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5 shrink-0">{product}</span>
                    </div>
                    <p className="text-[12px] text-gray-400 mt-0.5 truncate">{level} · {pool.totalQuestions} soal · {pool.duration} mnt</p>
                  </div>
                  <button
                    onClick={() => handleOpenAssessment(pool)}
                    className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                  >
                    Kirim ke Murid
                  </button>
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuPoolId(openMenuPoolId === pool.id ? null : pool.id); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuPoolId === pool.id && (
                      <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl border py-1 min-w-[190px]">
                        <button
                          onClick={() => handleOpenAssessment(pool)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <ClipboardList size={14} /> Kirim ke Murid (Tugas)
                        </button>
                        <button
                          onClick={() => router.push(`/guru/game/lobby?pool=${pool.id}`)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Gamepad2 size={14} /> Pertandingkan (Multi)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          {pools.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-400">
              Belum ada paket soal tersedia
            </div>
          )}
        </div>
      </div>

      {/* WIZARD MODAL */}
      <Modal isOpen={showWizard} onClose={resetWizard} title="" className="max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                wizardStep === step ? "bg-emerald-600 text-white" :
                wizardStep > step ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
              }`}>
                {wizardStep > step ? <Check size={14} /> : step}
              </div>
              <span className={`text-xs font-medium ${wizardStep === step ? "text-emerald-700" : "text-gray-400"}`}>
                {step === 1 ? "Pilih Tema" : step === 2 ? "Konfigurasi" : step === 3 ? "Generate" : "Selesai"}
              </span>
              {step < 4 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {wizardStep === 1 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Pilih Tema Latihan</h3>
            <p className="text-sm text-gray-500 mb-4">Tema apa yang ingin dilatihkan ke murid?</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto">
              {THEMES.map(tema => {
                const emoji = THEME_EMOJI[tema] || "📝";
                const isSelected = wizardForm.tema === tema;
                return (
                  <button
                    key={tema}
                    onClick={() => handlePickTema(tema)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-gray-100 hover:border-gray-200 bg-white"
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{tema}</span>
                    {isSelected && <Check size={12} className="text-emerald-600 mt-0.5" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={resetWizard} className="flex-1">Batal</Button>
              <Button
                onClick={() => setWizardStep(2)}
                disabled={!wizardForm.tema}
                className="flex-1 bg-emerald-600"
              >
                Lanjut <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Konfigurasi Latihan</h3>
            <p className="text-sm text-gray-500 mb-4">Atur kelas, jumlah soal, dan tingkat kesulitan</p>
            {/* Source picker */}
            <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <label className="block text-sm font-medium mb-2">Sumber Soal</label>
              <div className="flex gap-2">
                {[
                  { value: "BANK" as const, label: "Bank Soal BahasaCerdas", desc: "Ambil dari bank soal yang sudah tersedia" },
                  { value: "AI" as const, label: "AI Generate Baru", desc: "Buat soal baru dengan kecerdasan buatan" },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setWizardForm(f => ({ ...f, sumber: s.value }))}
                    className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${
                      wizardForm.sumber === s.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        wizardForm.sumber === s.value ? "border-emerald-500" : "border-gray-300"
                      }`}>
                        {wizardForm.sumber === s.value && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-6">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kelas *</label>
                  <select
                    value={wizardForm.kelas}
                    onChange={(e) => setWizardForm(f => ({ ...f, kelas: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Pilih kelas</option>
                    {KELAS.map(k => <option key={k} value={k}>Kelas {k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jumlah Soal (5-30)</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={wizardForm.jumlah}
                    onChange={(e) => setWizardForm(f => ({ ...f, jumlah: Math.min(30, Math.max(5, parseInt(e.target.value) || 5)) }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tingkat Kesulitan</label>
                <div className="flex gap-2">
                  {[
                    { value: "EASY", label: "Mudah" },
                    { value: "MEDIUM", label: "Sedang" },
                    { value: "HARD", label: "Sulit" },
                  ].map(d => (
                    <button
                      key={d.value}
                      onClick={() => setWizardForm(f => ({ ...f, difficulty: d.value }))}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        wizardForm.difficulty === d.value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Judul (opsional)</label>
                <input
                  value={wizardForm.judul}
                  onChange={(e) => setWizardForm(f => ({ ...f, judul: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder={`Latihan: ${wizardForm.tema || ""}`}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">
                <ChevronLeft size={16} className="mr-1" /> Kembali
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={createLoading || !wizardForm.kelas}
                className="flex-1 bg-emerald-600"
              >
                {createLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Generate...</>
                ) : (
                  <><Sparkles size={16} className="mr-1" /> Generate Soal</>
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-50 rounded-xl text-sm text-red-700">{error}</div>
            )}
          </div>
        )}

        {wizardStep === 3 && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto" />
            <p className="mt-4 font-semibold text-gray-900">AI sedang membuat soal...</p>
            <p className="text-sm text-gray-500">Mohon tunggu sebentar</p>
          </div>
        )}

        {wizardStep === 4 && generatedQuiz && (
          <div>
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-4 text-white mb-4">
              <div className="flex items-center gap-3">
                <Check className="w-8 h-8" />
                <div>
                  <p className="font-bold text-lg">{generatedQuiz.title}</p>
                  <p className="text-sm text-emerald-100">{generatedSoal.length} soal · {wizardForm.kelas && `Kelas ${wizardForm.kelas}`} · {wizardForm.tema}</p>
                </div>
              </div>
            </div>

            <p className="font-semibold text-gray-900 mb-3">Pratinjau Soal</p>
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {generatedSoal.map((s, i) => (
                <div key={s.id || i} className="p-3 rounded-xl border border-gray-100 bg-white">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.text}</p>
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {(s.options || []).map((opt: string, oi: number) => {
                          const isCorrect = String(s.correctAnswer) === String(oi);
                          return (
                            <div key={oi} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs ${
                              isCorrect ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600"
                            }`}>
                              {isCorrect ? <Check size={10} /> : <X size={10} />}
                              <span className="truncate">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {s.explanation && (
                        <p className="text-[11px] text-gray-400 mt-1.5 italic">{s.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={resetWizard} className="flex-1">Tutup</Button>
              <Button
                onClick={() => { handleOpenAssign(generatedQuiz); resetWizard(); }}
                className="flex-1 bg-emerald-600"
              >
                <Send size={16} className="mr-1" /> Kirim ke Kelas
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ASSIGN MODAL */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="Kirim Latihan ke Kelas" className="max-w-md">
        <div className="space-y-4">
          {assignQuiz && (
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-white">
              <p className="text-sm font-bold">{assignQuiz.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{assignQuiz.topik} · {assignQuiz.totalSoal} soal</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Pilih Kelas</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {groups.map((g: any) => {
                const isSelected = selectedGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-400">{g._count?.members || 0} murid</p>
                    </div>
                  </button>
                );
              })}
              {groups.length === 0 && (
                <p className="text-sm text-gray-400 italic">Belum ada kelas. Buat kelas di menu KelasKu.</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Batas Waktu (opsional)</label>
            <input
              type="datetime-local"
              value={assignDue}
              onChange={(e) => setAssignDue(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAssign(false)} className="flex-1">Batal</Button>
            <Button
              onClick={handleAssign}
              disabled={assignLoading || selectedGroups.length === 0}
              className="flex-1 bg-emerald-600"
            >
              {assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} className="mr-1" />}
              {assignLoading ? "..." : `Kirim ke ${selectedGroups.length} Kelas`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)} title="Hapus Latihan" className="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Yakin ingin menghapus latihan ini? Semua data pengiriman dan jawaban murid akan ikut terhapus.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDelete(null)} className="flex-1">Batal</Button>
            <Button
              onClick={() => showDelete && handleDelete(showDelete)}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Trash2 size={16} className="mr-1" /> Hapus
            </Button>
          </div>
        </div>
      </Modal>

      {/* ASSESSMENT MODAL (UKBI/TKA) */}
      <Modal isOpen={showAssessment} onClose={() => setShowAssessment(false)} title="Buat Assessment" className="max-w-md">
        <div className="space-y-4">
          {assessmentPool && (
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
              <p className="text-xs opacity-80">Dari paket</p>
              <p className="font-bold text-sm">{assessmentPool.title}</p>
              <p className="text-xs opacity-80 mt-1">{assessmentPool.totalQuestions} soal · {assessmentPool.duration} menit</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Judul Tugas</label>
            <input value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kelas Tujuan</label>
            <select value={assessmentGroupId} onChange={(e) => setAssessmentGroupId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="">Pilih kelas...</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name} · {g._count?.members || 0} murid</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Batas Waktu (opsional)</label>
            <input type="datetime-local" value={assessmentDue} onChange={(e) => setAssessmentDue(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAssessment(false)} className="flex-1">Batal</Button>
            <Button onClick={handleCreateAssessment} disabled={assessmentLoading || !assessmentGroupId}
              className="flex-1 bg-emerald-600">
              {assessmentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              {assessmentLoading ? "..." : "Kirim Tugas"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
