"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, FileText, Users, Clock, Trophy, MoreVertical, Trash2, Copy, Send, BarChart3, Eye, Edit3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  kelas: string;
  subject: string;
  topik: string | null;
  difficulty: string;
  timeLimit: number | null;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  _count: { questions: number; assignments: number };
  assignments: any[];
}

export default function GuruKuisPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/guru/quiz?${params.toString()}`);
      const data = await res.json();
      if (data.quizzes) setQuizzes(data.quizzes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, [filter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kuis ini?")) return;
    await fetch(`/api/guru/quiz/${id}`, { method: "DELETE" });
    setQuizzes(prev => prev.filter(q => q.id !== id));
    setShowMenu(null);
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/guru/quiz/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (data.quiz) {
      setQuizzes(prev => [data.quiz, ...prev]);
    }
    setShowMenu(null);
  };

  const handlePublish = async (id: string) => {
    const res = await fetch(`/api/guru/quiz/${id}/publish`, { method: "POST" });
    const data = await res.json();
    if (data.quiz) {
      setQuizzes(prev => prev.map(q => q.id === id ? { ...q, status: "PUBLISHED" } : q));
    }
    setShowMenu(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "LATIHAN": return "bg-blue-100 text-blue-700";
      case "TUGAS": return "bg-emerald-100 text-emerald-700";
      case "UJIAN": return "bg-red-100 text-red-700";
      case "GAME": return "bg-purple-100 text-purple-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-slate-100 text-slate-600";
      case "PUBLISHED": return "bg-green-100 text-green-700";
      case "ARCHIVED": return "bg-gray-100 text-gray-600";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case "EASY": return "text-green-600";
      case "MEDIUM": return "text-amber-600";
      case "HARD": return "text-red-600";
      default: return "text-slate-600";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru/beranda" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Kuis & Tugas</h1>
          <p className="text-sm text-slate-500">Buat kuis dari Bank Soal, assign ke kelas, pantau hasil</p>
        </div>
        <Link href="/guru/kuis/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Buat Kuis
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { id: "all", label: "Semua" },
          { id: "DRAFT", label: "Draft" },
          { id: "PUBLISHED", label: "Published" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === tab.id ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat kuis...</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">Belum ada kuis</h3>
          <p className="text-sm text-slate-400 mb-4">Buat kuis dari Bank Soal atau tulis manual</p>
          <Link href="/guru/kuis/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Buat Kuis Pertama</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="p-5 border border-slate-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-lg">{quiz.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(quiz.type)}`}>
                      {quiz.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(quiz.status)}`}>
                      {quiz.status}
                    </span>
                  </div>
                  {quiz.description && (
                    <p className="text-sm text-slate-500 line-clamp-1 mb-3">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {quiz._count.questions} soal
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {quiz._count.assignments} kelas
                    </span>
                    <span>Kelas {quiz.kelas}</span>
                    <span className={getDifficultyColor(quiz.difficulty)}>{quiz.difficulty}</span>
                    {quiz.timeLimit && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {quiz.timeLimit} menit
                      </span>
                    )}
                    {quiz.topik && <span className="text-emerald-600">{quiz.topik}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {quiz.status === "DRAFT" && quiz._count.questions > 0 && (
                    <button
                      onClick={() => handlePublish(quiz.id)}
                      className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                      title="Publish"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <Link href={`/guru/kuis/${quiz.id}/edit`}>
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Ubah">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href={`/guru/kuis/${quiz.id}/results`}>
                    <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="Hasil">
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === quiz.id ? null : quiz.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showMenu === quiz.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-10 min-w-[160px]">
                        <button
                          onClick={() => handleDuplicate(quiz.id)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" /> Duplikat
                        </button>
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
