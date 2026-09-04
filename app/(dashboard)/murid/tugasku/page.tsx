"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Clock, CheckCircle, AlertCircle, Play, BarChart3, Calendar, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuizAssignment {
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
    id: string;
    status: string;
    score: number | null;
    attemptNumber: number;
    submittedAt: string | null;
  } | null;
  isOverdue: boolean;
}

interface PenugasanItem {
  id: string;
  judul: string;
  deskripsi: string | null;
  jenis: string;
  tenggat: string | null;
  createdAt: string;
  group: { id: string; name: string };
  unit: { title: string };
  submission: {
    id: string;
    status: string;
    score: number | null;
    completedAt: string | null;
  } | null;
}

type MergedItem =
  | { kind: "quiz"; data: QuizAssignment }
  | { kind: "penugasan"; data: PenugasanItem };

export default function MuridTugaskuPage() {
  const [quizAvailable, setQuizAvailable] = useState<QuizAssignment[]>([]);
  const [quizInProgress, setQuizInProgress] = useState<QuizAssignment[]>([]);
  const [quizCompleted, setQuizCompleted] = useState<QuizAssignment[]>([]);
  const [penugasans, setPenugasans] = useState<PenugasanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "inProgress" | "completed">("available");

  useEffect(() => {
    Promise.all([
      fetch("/api/murid/tugas").then((r) => r.json()),
      fetch("/api/murid/penugasan").then((r) => r.json()),
    ])
      .then(([t, p]) => {
        setQuizAvailable(t.available || []);
        setQuizInProgress(t.inProgress || []);
        setQuizCompleted(t.completed || []);
        setPenugasans(p.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const penugasanAvailable = penugasans.filter((p) => p.submission?.status !== "COMPLETED");
  const penugasanCompleted = penugasans.filter((p) => p.submission?.status === "COMPLETED");

  const tabs = [
    { id: "available" as const, label: "Tersedia", count: quizAvailable.length + penugasanAvailable.length, icon: Play },
    { id: "inProgress" as const, label: "Sedang Dikerjakan", count: quizInProgress.length, icon: Clock },
    { id: "completed" as const, label: "Selesai", count: quizCompleted.length + penugasanCompleted.length, icon: CheckCircle },
  ];

  const mergedList: MergedItem[] = activeTab === "available"
    ? [
        ...quizAvailable.map((q) => ({ kind: "quiz" as const, data: q })),
        ...penugasanAvailable.map((p) => ({ kind: "penugasan" as const, data: p })),
      ]
    : activeTab === "completed"
    ? [
        ...quizCompleted.map((q) => ({ kind: "quiz" as const, data: q })),
        ...penugasanCompleted.map((p) => ({ kind: "penugasan" as const, data: p })),
      ]
    : quizInProgress.map((q) => ({ kind: "quiz" as const, data: q }));

  const getTypeColor = (type: string) => {
    switch (type) {
      case "LATIHAN": return "bg-blue-100 text-blue-700 dark:text-blue-300";
      case "TUGAS": return "bg-emerald-100 text-emerald-700 dark:text-emerald-300";
      case "UJIAN": return "bg-red-100 text-red-700 dark:text-red-300";
      default: return "bg-slate-100 dark:bg-slate-800/70 text-slate-700";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/murid/beranda" className="p-2 hover:bg-slate-100 dark:bg-slate-800/70 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tugasku</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kuis dan tugas dari guru</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-violet-100 text-violet-700 dark:text-violet-300" : "bg-gray-100 dark:bg-slate-800/80 text-gray-600 hover:bg-gray-200"}`}
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
          <p className="text-slate-500 dark:text-slate-400">Memuat tugas...</p>
        </div>
      ) : mergedList.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 dark:text-slate-300 mb-2">
            {activeTab === "available" ? "Belum ada tugas tersedia" : activeTab === "inProgress" ? "Tidak ada yang sedang dikerjakan" : "Belum ada tugas selesai"}
          </h3>
          <p className="text-sm text-slate-400">
            {activeTab === "available" ? "Tugas akan muncul saat guru mengassign" : activeTab === "inProgress" ? "Mulai kerjakan tugas yang tersedia" : "Selesaikan tugasmu untuk melihat hasil"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mergedList.map((item) => {
            if (item.kind === "quiz") {
              const a = item.data;
              return (
                <Card key={a.id} className={`p-5 border transition-all ${a.isOverdue ? "border-red-200 bg-red-50/30" : "border-slate-100 dark:border-slate-800 hover:shadow-md"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{a.quiz.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(a.quiz.type)}`}>
                          {a.quiz.type}
                        </span>
                        {a.isOverdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:text-red-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Terlambat
                          </span>
                        )}
                        {a.submission && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.submission.status === "GRADED" ? "bg-green-100 text-green-700 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:text-blue-300"}`}>
                            {a.submission.status === "SUBMITTED" ? "Menunggu Dinilai" : a.submission.status === "GRADED" ? "Dinilai" : a.submission.status}
                          </span>
                        )}
                      </div>
                      {a.quiz.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{a.quiz.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span>{a.group.name}</span>
                        <span>{a.quiz._count.questions} soal</span>
                        {a.quiz.timeLimit && <span>{a.quiz.timeLimit} menit</span>}
                        {a.quiz.topik && <span className="text-violet-600 dark:text-violet-400">{a.quiz.topik}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Deadline: {formatDate(a.dueDate)}
                        </span>
                        {a.submission && a.submission.score != null && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Nilai: {Math.round(a.submission.score)}%</span>
                        )}
                      </div>
                      {a.notes && (
                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">{a.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {activeTab === "available" && (
                        <Link href={`/murid/tugasku/${a.id}/take`}>
                          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                            <Play className="w-4 h-4 mr-1" /> Kerjakan
                          </Button>
                        </Link>
                      )}
                      {activeTab === "inProgress" && (
                        <Link href={`/murid/tugasku/${a.id}/take`}>
                          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                            <Play className="w-4 h-4 mr-1" /> Lanjutkan
                          </Button>
                        </Link>
                      )}
                      {activeTab === "completed" && (
                        <Link href={`/murid/tugasku/${a.submission?.id}/result`}>
                          <Button variant="outline" className="border-violet-200 text-violet-700 dark:text-violet-300 hover:bg-violet-50">
                            <BarChart3 className="w-4 h-4 mr-1" /> Lihat Hasil
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            }

            // Penugasan item
            const p = item.data;
            const isCompleted = p.submission?.status === "COMPLETED";
            return (
              <Card key={p.id} className={`p-5 border transition-all ${p.tenggat && new Date(p.tenggat) < new Date() && !isCompleted ? "border-red-200 bg-red-50/30" : "border-slate-100 dark:border-slate-800 hover:shadow-md"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{p.judul}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:text-violet-300">
                        {p.jenis === "KUIS" ? "Latihan" : "Tugas"}
                      </span>
                      {p.tenggat && new Date(p.tenggat) < new Date() && !isCompleted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:text-red-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Terlambat
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:text-green-300">
                          Selesai
                        </span>
                      )}
                      {p.submission?.status === "IN_PROGRESS" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:text-blue-300">
                          Dikerjakan
                        </span>
                      )}
                    </div>
                    {p.deskripsi && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{p.deskripsi}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span>{p.group.name}</span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {p.unit.title}
                      </span>
                      {p.tenggat && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Deadline: {formatDate(p.tenggat)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {activeTab === "available" && (
                      <Link href={`/arena/tugas/${p.id}/kerjakan`}>
                        <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                          <Play className="w-4 h-4 mr-1" /> Kerjakan
                        </Button>
                      </Link>
                    )}
                    {activeTab === "completed" && isCompleted && (
                      <Link href={`/arena/tugas/${p.id}/kerjakan`}>
                        <Button variant="outline" className="border-violet-200 text-violet-700 dark:text-violet-300 hover:bg-violet-50">
                          <BarChart3 className="w-4 h-4 mr-1" /> Lihat Hasil
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
