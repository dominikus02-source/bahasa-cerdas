"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Plus, Trash2, Zap, Loader2, Save, RefreshCw, Check,
  Search, Filter, X, Gamepad2, Play, BarChart3, MoreVertical,
  Edit3, Users, Clock, Star, TrendingUp, GraduationCap, Brain,
  Headphones, Target, School, ClipboardList
} from "lucide-react";

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const KD_OPTIONS = [
  { value: "3.1", label: "3.1 - Teks Deskripsi" },
  { value: "3.2", label: "3.2 - Teks Cerita" },
  { value: "3.3", label: "3.3 - Teks Negosiasi" },
  { value: "3.4", label: "3.4 - Teks Eksposisi" },
  { value: "3.5", label: "3.5 - Teks Anekdot" },
  { value: "3.6", label: "3.6 - Teks Laporan" },
  { value: "3.7", label: "3.7 - Surat Resmi" },
  { value: "3.8", label: "3.8 - Karya Sastra" },
  { value: "4.1", label: "4.1 - Menulis Teks" },
  { value: "4.2", label: "4.2 - Menyunting Teks" },
];

const COVER_COLORS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-cyan-600",
  "from-amber-500 to-orange-600",
  "from-red-500 to-rose-600",
  "from-pink-500 to-fuchsia-600",
  "from-indigo-500 to-blue-600",
  "from-lime-500 to-green-600",
];

const EMOJIS = ["📚", "", "🎯", "", "✏️", "", "🎓", "", "🔤", "", "🌟", ""];

export default function BankSoalPage() {
  const router = useRouter();
  const [view, setView] = useState<"sets" | "questions">("sets");
  const [sets, setSets] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [topikList, setTopikList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [generateMsg, setGenerateMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterTopik, setFilterTopik] = useState("");

  const [showCreateSet, setShowCreateSet] = useState(false);
  const [showAddQuestions, setShowAddQuestions] = useState(false);
  const [selectedSet, setSelectedSet] = useState<any>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Assessment state
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentPool, setAssessmentPool] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDue, setAssessmentDue] = useState("");
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [openMenuPoolId, setOpenMenuPoolId] = useState<string | null>(null);

  const [pools, setPools] = useState<any[]>([]);
  const [poolFilter, setPoolFilter] = useState<"all" | "UKBI" | "TKA">("all");

  const [setForm, setSetForm] = useState({
    title: "",
    description: "",
    kelas: "",
    maxQuestions: 50,
    coverColor: COVER_COLORS[0],
    coverEmoji: "📚",
  });

  const [aiForm, setAiForm] = useState({
    text: "",
    type: "PILIHAN_GANDA",
    difficulty: "MEDIUM",
    kelas: "",
    kd: "",
  });

  // Manual create
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    text: "",
    type: "PILIHAN_GANDA",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    kelas: "",
    kd: "",
    isHOTS: false,
  });

  const fetchSets = useCallback(async () => {
    setFetching(true);
    try {
      let url = "/api/guru/soal-set";
      const params = new URLSearchParams();
      if (filterKelas) params.set("kelas", filterKelas);
      if (searchQuery) params.set("search", searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.sets) setSets(data.sets);
    } catch (e) {
      console.error(e);
    }
    setFetching(false);
  }, [filterKelas, filterTopik, searchQuery]);

  const fetchQuestions = useCallback(async () => {
    try {
      let url = "/api/guru/soal";
      const params = new URLSearchParams();
      if (filterKelas) params.set("kelas", filterKelas);
      if (filterTopik) params.set("topik", filterTopik);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.data) setQuestions(data.data);
      if (data.kelasList) setKelasList(data.kelasList);
      if (data.topikList) setTopikList(data.topikList);
    } catch (e) {
      console.error(e);
    }
  }, [filterKelas, filterTopik]);

  useEffect(() => {
    if (view === "sets") fetchSets();
    else fetchQuestions();
    fetchPools();
  }, [view, fetchSets, fetchQuestions]);

  const fetchPools = useCallback(async () => {
    try {
      const res = await fetch("/api/guru/soal-pool");
      const data = await res.json();
      if (data.pools) setPools(data.pools);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleGenerate = async () => {
    if (!aiForm.text || !aiForm.kelas) return;
    setLoading(true);
    setGenerateMsg("");
    try {
      const res = await fetch("/api/ai/soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiForm.text,
          count: 5,
          type: aiForm.type,
          difficulty: aiForm.difficulty,
          kelas: aiForm.kelas,
          kd: aiForm.kd,
        }),
      });
      const data = await res.json();
      if (data.soal) {
        setGenerateMsg(`✅ ${data.saved || data.soal.length} soal berhasil dibuat!`);
        fetchQuestions();
      } else if (data.error) {
        setGenerateMsg(` ${data.error}`);
      }
    } catch (e) {
      setGenerateMsg(" Gagal generate soal");
    }
    setLoading(false);
  };

  const handleManualCreate = async () => {
    if (!manualForm.text || !manualForm.kelas) return;
    setLoading(true);
    try {
      const res = await fetch("/api/guru/soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: manualForm.text,
          type: manualForm.type,
          kelas: manualForm.kelas,
          kd: manualForm.kd || null,
          options: manualForm.type === "PILIHAN_GANDA" ? manualForm.options.filter(o => o) : [],
          correctAnswer: manualForm.type === "PILIHAN_GANDA" ? manualForm.options[manualForm.correctAnswer] : "",
          explanation: manualForm.explanation || null,
          isHOTS: manualForm.isHOTS,
          source: "MANUAL",
        }),
      });
      if (res.ok) {
        setManualForm({ text: "", type: "PILIHAN_GANDA", options: ["", "", "", ""], correctAnswer: 0, explanation: "", kelas: "", kd: "", isHOTS: false });
        fetchQuestions();
        setGenerateMsg("✅ Soal berhasil dibuat! Lihat di tab Soal.");
      }
    } catch {}
    setLoading(false);
  };

  const handleCreateSet = async () => {
    if (!setForm.title || !setForm.kelas) return;
    setLoading(true);
    try {
      const res = await fetch("/api/guru/soal-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...setForm,
          questionIds: selectedQuestionIds,
        }),
      });
      const data = await res.json();
      if (data.set) {
        setShowCreateSet(false);
        setSelectedQuestionIds([]);
        setSetForm({ title: "", description: "", kelas: "", maxQuestions: 50, coverColor: COVER_COLORS[0], coverEmoji: "" });
        fetchSets();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUseSet = async (setId: string, useType: string) => {
    try {
      const res = await fetch(`/api/guru/soal-set/${setId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useType }),
      });
      const data = await res.json();
      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSet = async (id: string) => {
    if (!confirm("Hapus set ini? Soal tidak akan terhapus.")) return;
    try {
      await fetch(`/api/guru/soal-set/${id}`, { method: "DELETE" });
      fetchSets();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddQuestions = (set: any) => {
    setSelectedSet(set);
    setSelectedQuestionIds([]);
    setShowAddQuestions(true);
    fetchQuestions();
  };

  const handleAddQuestionsToSet = async () => {
    if (!selectedSet || selectedQuestionIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/guru/soal-set/${selectedSet.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: selectedQuestionIds }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddQuestions(false);
        fetchSets();
      } else {
        alert(data.error || "Gagal menambah soal");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const openAssessment = async (pool: any) => {
    setAssessmentPool(pool);
    setAssessmentTitle(`Tugas: ${pool.title}`);
    setSelectedGroupId("");
    setAssessmentDue("");
    setShowAssessment(true);
    setOpenMenuPoolId(null);
    try {
      const res = await fetch("/api/guru/buat-assessment");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAssessment = async () => {
    if (!selectedGroupId || !assessmentPool) return;
    setAssessmentLoading(true);
    try {
      const res = await fetch("/api/guru/buat-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paketId: assessmentPool.id,
          groupId: selectedGroupId,
          title: assessmentTitle,
          dueDate: assessmentDue || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssessment(false);
        alert(`✅ Tugas berhasil dikirim ke kelas!\n${data.totalQuestions} soal · "${data.quiz.title}"`);
      } else {
        alert(data.error || "Gagal membuat assessment");
      }
    } catch (e) {
      alert("Terjadi kesalahan");
    }
    setAssessmentLoading(false);
  };

  const toggleQuestionSelect = (id: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal</h1>
          <p className="mt-1 text-sm text-gray-600">Buat, kelola, dan bagikan soal untuk pembelajaran interaktif</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView(view === "sets" ? "questions" : "sets")}>
            {view === "sets" ? <><BookOpen className="h-4 w-4 mr-1" /> Lihat Soal</> : <><Filter className="h-4 w-4 mr-1" /> Lihat Set</>}
          </Button>
          <Button onClick={() => setShowCreateSet(true)}>
            <Plus className="h-4 w-4 mr-1" /> Buat Set Baru
          </Button>
        </div>
      </div>

      {/* Bank Soal Kompetensi - UKBI & TKA */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="text-emerald-500" size={20} />
            Bank Soal Kompetensi
          </h2>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["all", "UKBI", "TKA"] as const).map(f => (
              <button
                key={f}
                onClick={() => setPoolFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  poolFilter === f ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
                }`}
              >
                {f === "all" ? "Semua" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pools
            .filter(p => {
              if (poolFilter === "all") return true;
              if (poolFilter === "UKBI") return p.type?.includes("UKBI");
              if (poolFilter === "TKA") return p.type?.includes("TKA");
              return true;
            })
            .map(pool => {
              const isUKBI = pool.type?.includes("UKBI");
              const isTKA = pool.type?.includes("TKA");
              const isSimulasi = pool.mode === "SIMULASI";
              const gradient = isUKBI
                ? "from-blue-500 to-indigo-600"
                : isTKA && pool.title?.includes("SMA")
                ? "from-purple-500 to-fuchsia-600"
                : "from-teal-500 to-emerald-600";

              const PoolIcon = isUKBI ? Headphones : isTKA ? Brain : BookOpen;

              return (
                <Card key={pool.id} className={`overflow-hidden transition-all hover:shadow-lg bg-gradient-to-br ${gradient}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <PoolIcon size={20} className="text-white" />
                      </div>
                      <div className="flex gap-1 items-start">
                        {isUKBI && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white rounded-full font-medium">UKBI</span>
                        )}
                        {isTKA && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white rounded-full font-medium">TKA</span>
                        )}
                        {isSimulasi && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-400/30 text-yellow-100 rounded-full font-medium">Simulasi</span>
                        )}
                        {!isSimulasi && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white rounded-full font-medium">Latihan</span>
                        )}
                        {/* Three-dot menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuPoolId(openMenuPoolId === pool.id ? null : pool.id); }}
                            className="p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {openMenuPoolId === pool.id && (
                            <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-xl border py-1 min-w-[160px]">
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  window.location.href = `/kompetisi/${pool.id}?mode=latihan`;
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <Play size={14} /> Latihan (Solo)
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/guru/game/lobby?pool=${pool.id}`); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <Gamepad2 size={14} /> Pertandingkan (Multi)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-sm leading-tight mb-1 line-clamp-2">{pool.title}</h3>
                    <p className="text-white/70 text-xs line-clamp-1 mb-3">{pool.description}</p>
                    <div className="flex items-center gap-3 text-white/80 text-xs mb-3">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> {pool.totalQuestions} soal
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {pool.duration} mnt
                      </span>
                    </div>

                  </div>
                </Card>
              );
            })}
        </div>
      </div>

      {/* AI Generate */}
      <Card className="p-4 mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-semibold text-amber-800">Generate Soal dengan AI</p>
          </div>
          <button onClick={() => setShowManualForm(!showManualForm)}
            className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1">
            {showManualForm ? "Sembunyikan" : "+ Buat Manual"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={aiForm.text}
            onChange={(e) => setAiForm({ ...aiForm, text: e.target.value })}
            className="flex-1 min-w-[160px] rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white"
            placeholder="Topik/Materi, contoh: Puisi"
          />
          <select value={aiForm.kelas} onChange={(e) => setAiForm({ ...aiForm, kelas: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="">Kelas</option>
            {KELAS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={aiForm.type} onChange={(e) => setAiForm({ ...aiForm, type: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="PILIHAN_GANDA">PG</option>
            <option value="ESSAY">Essay</option>
            <option value="ISIAN">Isian</option>
          </select>
          <select value={aiForm.difficulty} onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="EASY">Mudah</option>
            <option value="MEDIUM">Sedang</option>
            <option value="HARD">Sulit</option>
          </select>
          <select value={aiForm.kd} onChange={(e) => setAiForm({ ...aiForm, kd: e.target.value })} className="rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white">
            <option value="">KD</option>
            {KD_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <Button onClick={handleGenerate} disabled={loading || !aiForm.text || !aiForm.kelas} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? "..." : "Generate 5 Soal"}
          </Button>
        </div>
        {generateMsg && (
          <div className={`mt-2 text-sm rounded-lg px-3 py-1.5 flex items-center gap-2 ${generateMsg.includes("✅") ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
            <span>{generateMsg}</span>
            {generateMsg.includes("✅") && (
              <button onClick={() => setView("questions")} className="ml-auto text-xs font-semibold underline hover:no-underline">
                Lihat Soal
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Manual Create Form */}
      {showManualForm && (
        <Card className="p-4 mb-6 border-emerald-200 bg-emerald-50/30">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Buat Soal Manual</p>
          </div>
          <div className="space-y-3">
            <input value={manualForm.text} onChange={(e) => setManualForm({ ...manualForm, text: e.target.value })}
              className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-sm bg-white"
              placeholder="Teks pertanyaan..." />
            <div className="flex gap-2">
              <select value={manualForm.type} onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm bg-white">
                <option value="PILIHAN_GANDA">PG</option>
                <option value="ESSAY">Essay</option>
                <option value="ISIAN">Isian</option>
              </select>
              <select value={manualForm.kelas} onChange={(e) => setManualForm({ ...manualForm, kelas: e.target.value })}
                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm bg-white">
                <option value="">Kelas</option>
                {KELAS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={manualForm.kd} onChange={(e) => setManualForm({ ...manualForm, kd: e.target.value })}
                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm bg-white">
                <option value="">KD</option>
                {KD_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            {manualForm.type === "PILIHAN_GANDA" && (
              <div className="grid grid-cols-2 gap-2">
                {manualForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={manualForm.correctAnswer === i}
                      onChange={() => setManualForm({ ...manualForm, correctAnswer: i })}
                      className="text-emerald-600 focus:ring-emerald-500" />
                    <input value={opt} onChange={(e) => {
                      const opts = [...manualForm.options];
                      opts[i] = e.target.value;
                      setManualForm({ ...manualForm, options: opts });
                    }} className="flex-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm bg-white"
                      placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                  </div>
                ))}
              </div>
            )}
            <textarea value={manualForm.explanation} onChange={(e) => setManualForm({ ...manualForm, explanation: e.target.value })}
              className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-sm bg-white" rows={1}
              placeholder="Penjelasan jawaban (opsional)" />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={manualForm.isHOTS}
                  onChange={(e) => setManualForm({ ...manualForm, isHOTS: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500" /> Soal HOTS
              </label>
              <button onClick={handleManualCreate} disabled={!manualForm.text || !manualForm.kelas}
                className="ml-auto px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                Simpan Soal
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari set atau soal..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k} value={k}>Kelas {k}</option>)}
        </select>
      </div>

      {/* Sets View - Kahoot Style Cards */}
      {view === "sets" && (
        <>
          {fetching ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
          ) : sets.length === 0 ? (
            <Card className="py-16 text-center">
              <BookOpen className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 font-semibold">Belum ada set soal</h3>
              <p className="mt-2 text-sm text-gray-500">Buat set baru atau generate soal dengan AI</p>
              <Button onClick={() => setShowCreateSet(true)} className="mt-4 bg-emerald-600">
                <Plus className="h-4 w-4 mr-1" /> Buat Set Pertama
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sets.map(set => (
                <div key={set.id} className="group relative">
                  <Card className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br ${set.coverColor}`}>
                    {/* Card Header */}
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <span className="text-3xl">{set.coverEmoji || "📚"}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 pt-0">
                      <h3 className="font-bold text-white text-lg leading-tight mb-1 line-clamp-2">{set.title}</h3>
                      {set.description && (
                        <p className="text-white/70 text-xs line-clamp-1 mb-3">{set.description}</p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-white/80 text-xs mb-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" /> {set._count?.questions || 0} soal
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Kelas {set.kelas}
                        </span>
                      </div>

                      {set.description && !set.topik && (
                        <p className="text-white/60 text-[10px] line-clamp-1 mb-1">{set.description}</p>
                      )}
                    </div>

                    {/* Card Footer - Action Buttons */}
                    <div className="px-4 pb-4 pt-2 border-t border-white/20">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUseSet(set.id, "LATIHAN"); }}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                          disabled={!set._count?.questions}
                        >
                          <Play className="w-4 h-4" />
                          Latihan
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUseSet(set.id, "KUIS"); }}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                          disabled={!set._count?.questions}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Kuis
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUseSet(set.id, "GAME"); }}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                          disabled={!set._count?.questions}
                        >
                          <Gamepad2 className="w-4 h-4" />
                          Pertandingkan
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* Add Questions Button */}
                  <button
                    onClick={() => openAddQuestions(set)}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-full shadow-lg hover:bg-emerald-700 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    + Tambah Soal
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Questions View - List */}
      {view === "questions" && (
        <div className="space-y-2">
          {questions.length === 0 ? (
            <Card className="py-16 text-center">
              <BookOpen className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 font-semibold">Belum ada soal</h3>
              <p className="mt-2 text-sm text-gray-500">Generate dengan AI terlebih dahulu</p>
            </Card>
          ) : (
            questions.map((soal) => (
              <Card key={soal.id} className="p-3 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700">
                        {soal.type?.replace("_", " ") || "PG"}
                      </Badge>
                      <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">Kelas {soal.kelas}</Badge>
                      {soal.soalSet && (
                        <Badge className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700">
                           {soal.soalSet.title}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{soal.text}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create Set Modal */}
      <Modal isOpen={showCreateSet} onClose={() => setShowCreateSet(false)} title="Buat Set Soal Baru" className="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Set *</label>
            <input
              value={setForm.title}
              onChange={(e) => setSetForm({ ...setForm, title: e.target.value })}
              className="w-full rounded-lg border px-4 py-2 text-sm"
              placeholder="Contoh: Puisi Kelas 7"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi / Topik</label>
            <textarea
              value={setForm.description}
              onChange={(e) => setSetForm({ ...setForm, description: e.target.value })}
              className="w-full rounded-lg border px-4 py-2 text-sm"
              rows={2}
              placeholder="Contoh: Kumpulan soal puisi untuk latihan kelas 7 semester 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Kelas *</label>
              <select
                value={setForm.kelas}
                onChange={(e) => setSetForm({ ...setForm, kelas: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Pilih</option>
                {KELAS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maks Soal</label>
              <input
                type="number"
                value={setForm.maxQuestions}
                onChange={(e) => setSetForm({ ...setForm, maxQuestions: parseInt(e.target.value) || 50 })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Pilih Cover</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSetForm({ ...setForm, coverColor: color })}
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} ${setForm.coverColor === color ? "ring-2 ring-offset-2 ring-emerald-500" : ""}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSetForm({ ...setForm, coverEmoji: emoji })}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg ${setForm.coverEmoji === emoji ? "border-emerald-500 bg-emerald-50" : "border-gray-200"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateSet(false)} className="flex-1">Batal</Button>
            <Button onClick={handleCreateSet} disabled={loading || !setForm.title || !setForm.kelas} className="flex-1 bg-emerald-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? "..." : "Buat Set"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Questions Modal */}
      <Modal isOpen={showAddQuestions} onClose={() => setShowAddQuestions(false)} title={`Tambah Soal ke "${selectedSet?.title}"`} className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{selectedSet?._count?.questions || 0} / {selectedSet?.maxQuestions || 50} soal</span>
            <span>{selectedQuestionIds.length} dipilih</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {questions
              .filter(q => !q.soalSetId || q.soalSetId === selectedSet?.id)
              .map((soal) => {
                const isSelected = selectedQuestionIds.includes(soal.id);
                const alreadyInSet = soal.soalSetId === selectedSet?.id;
                return (
                  <div
                    key={soal.id}
                    onClick={() => !alreadyInSet && toggleQuestionSelect(soal.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      alreadyInSet ? "bg-emerald-50 border-emerald-200 opacity-60" :
                      isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!alreadyInSet && (
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                      )}
                      {alreadyInSet && (
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{soal.text}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{soal.type?.replace("_", " ")}</span>
                          <span className="text-xs text-gray-400">Kelas {soal.kelas}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowAddQuestions(false)} className="flex-1">Batal</Button>
            <Button
              onClick={handleAddQuestionsToSet}
              disabled={loading || selectedQuestionIds.length === 0}
              className="flex-1 bg-emerald-600"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah {selectedQuestionIds.length} Soal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assessment Modal */}
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
            <input
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm"
              placeholder="Tugas: ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kelas Tujuan *</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
            >
              <option value="">Pilih kelas...</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} (Kelas {g.grade}) · {g._count?.members || 0} murid
                </option>
              ))}
            </select>
            {groups.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Belum ada kelas. Buat kelas dulu di menu KelasKu.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Batas Waktu (opsional)</label>
            <input
              type="datetime-local"
              value={assessmentDue}
              onChange={(e) => setAssessmentDue(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAssessment(false)} className="flex-1">Batal</Button>
            <Button
              onClick={handleCreateAssessment}
              disabled={assessmentLoading || !selectedGroupId}
              className="flex-1 bg-emerald-600"
            >
              {assessmentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              {assessmentLoading ? "..." : "Kirim Tugas"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
