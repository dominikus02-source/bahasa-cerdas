"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Clock, CheckCircle, AlertCircle, Play, BarChart3, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Assignment {
  id: string;
  assignedAt: string;
  dueDate: string | null;
  notes: string | null;
  isPublished: boolean;
  quiz: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    timeLimit: number | null;
    maxAttempts: number;
    passingScore: number | null;
    kelas: string;
    subject: string;
    topik: string | null;
    difficulty: string;
    _count: { questions: number };
  };
  group: { id: string; name: string };
  submission: {
    status: string;
    score: number | null;
    attemptNumber: number;
    submittedAt: string | null;
  } | null;
  isOverdue: boolean;
}

export default function MuridTugaskuPage() {
  const [available, setAvailable] = useState<Assignment[]>([]);
  const [inProgress, setInProgress] = useState<Assignment[]>([]);
  const [completed, setCompleted] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "inProgress" | "completed">("available");

  const fetchTugas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/murid/tugas");
      const data = await res.json();
      if (data.available) setAvailable(data.available);
      if (data.inProgress) setInProgress(data.inProgress);
      if (data.completed) setCompleted(data.completed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTugas(); }, []);

  const tabs = [
    { id: "available" as const, label: "Tersedia", count: available.length, icon: Play },
    { id: "inProgress" as const, label: "Sedang Dikerjakan", count: inProgress.length, icon: Clock },
    { id: "completed" as const, label: "Selesai", count: completed.length, icon: CheckCircle },
  ];

  const currentList = activeTab === "available" ? available : activeTab === "inProgress" ? inProgress : completed;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "LATIHAN": return "bg-blue-100 text-blue-700";
      case "TUGAS": return "bg-emerald-100 text-emerald-700";
      case "UJIAN": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/murid/beranda" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tugasku</h1>
          <p className="text-sm text-slate-500">Kuis dan tugas dari guru</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat tugas...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">
            {activeTab === "available" ? "Belum ada tugas tersedia" : activeTab === "inProgress" ? "Tidak ada yang sedang dikerjakan" : "Belum ada tugas selesai"}
          </h3>
          <p className="text-sm text-slate-400">
            {activeTab === "available" ? "Tugas akan muncul saat guru mengassign" : activeTab === "inProgress" ? "Mulai kerjakan tugas yang tersedia" : "Selesaikan tugasmu untuk melihat hasil"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map(item => (
            <Card key={item.id} className={`p-5 border transition-all ${item.isOverdue ? "border-red-200 bg-red-50/30" : "border-slate-100 hover:shadow-md"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{item.quiz.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(item.quiz.type)}`}>
                      {item.quiz.type}
                    </span>
                    {item.isOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Terlambat
                      </span>
                    )}
                    {item.submission && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.submission.status === "GRADED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {item.submission.status === "SUBMITTED" ? "Menunggu Dinilai" : item.submission.status === "GRADED" ? "Dinilai" : item.submission.status}
                      </span>
                    )}
                  </div>
                  {item.quiz.description && (
                    <p className="text-sm text-slate-500 line-clamp-1 mb-2">{item.quiz.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span>Kelas {item.quiz.kelas}</span>
                    <span>{item.quiz._count.questions} soal</span>
                    {item.quiz.timeLimit && <span>{item.quiz.timeLimit} menit</span>}
                    {item.quiz.topik && <span className="text-violet-600">{item.quiz.topik}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Deadline: {formatDate(item.dueDate)}
                    </span>
                    {item.submission && item.submission.score != null && (
                      <span className="font-semibold text-emerald-600">Nilai: {Math.round(item.submission.score)}%</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg p-2">{item.notes}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {activeTab === "available" && (
                    <Link href={`/murid/tugasku/${item.id}/take`}>
                      <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                        <Play className="w-4 h-4 mr-1" /> Kerjakan
                      </Button>
                    </Link>
                  )}
                  {activeTab === "inProgress" && (
                    <Link href={`/murid/tugasku/${item.id}/take`}>
                      <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                        <Play className="w-4 h-4 mr-1" /> Lanjutkan
                      </Button>
                    </Link>
                  )}
                  {activeTab === "completed" && (
                    <Link href={`/murid/tugasku/${item.id}/result`}>
                      <Button variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50">
                        <BarChart3 className="w-4 h-4 mr-1" /> Lihat Hasil
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
