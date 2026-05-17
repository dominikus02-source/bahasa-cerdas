"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, Calendar, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Group {
  id: string;
  name: string;
  accessCode: string;
  grade: string;
  _count: { members: number };
}

interface Assignment {
  id: string;
  groupId: string;
  group: { name: string; accessCode: string };
  dueDate: string | null;
  isPublished: boolean;
  _count: { submissions: number };
}

export default function AssignQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [quizId, setQuizId] = useState<string>("");
  const [quiz, setQuiz] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    params.then(p => setQuizId(p.id));
  }, [params]);

  useEffect(() => {
    if (!quizId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [quizRes, groupsRes] = await Promise.all([
          fetch(`/api/guru/quiz/${quizId}`),
          fetch("/api/group"),
        ]);
        const quizData = await quizRes.json();
        const groupsData = await groupsRes.json();
        if (quizData.quiz) setQuiz(quizData.quiz);
        if (groupsData.groups) setGroups(groupsData.groups);
        if (quizData.quiz?.assignments) setExistingAssignments(quizData.quiz.assignments);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quizId]);

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedGroups.length === 0) {
      setMsg({ type: "error", text: "Pilih minimal 1 kelas" });
      return;
    }
    setAssigning(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/guru/quiz/${quizId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupIds: selectedGroups,
          dueDate: dueDate || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (data.assignments) {
        setMsg({ type: "success", text: `Berhasil assign ke ${data.assignments.length} kelas` });
        setTimeout(() => router.push("/guru/kuis"), 1500);
      } else {
        setMsg({ type: "error", text: data.error || "Gagal assign" });
      }
    } catch (e) {
      setMsg({ type: "error", text: "Gagal assign" });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru/kuis" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assign Kuis</h1>
          <p className="text-sm text-slate-500">{quiz?.title}</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Existing Assignments */}
      {existingAssignments.length > 0 && (
        <Card className="p-5 mb-6 border-emerald-200 bg-emerald-50/50">
          <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Sudah Di-assign ke:
          </h3>
          <div className="flex flex-wrap gap-2">
            {existingAssignments.map(a => (
              <span key={a.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-emerald-200 text-sm">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {a.group.name}
                <span className="text-xs text-slate-400">({a._count.submissions} siswa mengerjakan)</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Select Groups */}
      <Card className="p-5 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" /> Pilih Kelas
        </h3>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Belum ada kelas. Buat kelas di KelasKu terlebih dahulu.</p>
        ) : (
          <div className="space-y-2">
            {groups.map(g => {
              const isSelected = selectedGroups.includes(g.id);
              const isAssigned = existingAssignments.some(a => a.groupId === g.id);
              return (
                <div
                  key={g.id}
                  onClick={() => !isAssigned && toggleGroup(g.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isAssigned ? "border-emerald-200 bg-emerald-50 opacity-60 cursor-not-allowed" :
                    isSelected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                      {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{g.name}</p>
                      <p className="text-xs text-slate-400">Kode: {g.accessCode} · {g._count.members} anggota</p>
                    </div>
                  </div>
                  {isAssigned && (
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">Sudah di-assign</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Settings */}
      <Card className="p-5 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" /> Pengaturan
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deadline (opsional)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (opsional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="Contoh: Kerjakan dengan jujur, tidak boleh buka buku"
          />
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href="/guru/kuis" className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-center hover:bg-slate-50">
          Batal
        </Link>
        <Button
          onClick={handleAssign}
          disabled={assigning || selectedGroups.length === 0}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 h-auto disabled:opacity-50"
        >
          {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {assigning ? "Meng-assign..." : `Assign ke ${selectedGroups.length} Kelas`}
        </Button>
      </div>
    </div>
  );
}
