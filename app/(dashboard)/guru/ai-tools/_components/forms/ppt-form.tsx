"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface PPTFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const GRADE_OPTIONS = ["VII", "VIII", "IX", "X", "XI", "XII"];
const TEACHING_STYLES = [
  { value: "ceramah_interaktif", label: "Ceramah Interaktif" },
  { value: "diskusi", label: "Diskusi" },
  { value: "project_based", label: "Project Based" },
  { value: "game_based", label: "Game Based" },
  { value: "storytelling", label: "Storytelling" },
];

export function PPTForm({ onSubmit, loading }: PPTFormProps) {
  const [subject, setSubject] = useState("Bahasa Indonesia");
  const [grade, setGrade] = useState("X");
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [learningObjective, setLearningObjective] = useState("");
  const [teachingStyle, setTeachingStyle] = useState("ceramah_interaktif");
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [includeActivity, setIncludeActivity] = useState(true);

  const handleSubmit = () => {
    if (!topic.trim() || !learningObjective.trim()) return;
    onSubmit({
      subject: subject.trim(),
      grade,
      topic: topic.trim(),
      slideCount,
      learningObjective: learningObjective.trim(),
      teachingStyle,
      visualStyle: "premium_education",
      includeQuiz,
      includeActivity,
      languageStyle: "ringkas",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
            {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Topik</label>
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
          placeholder="Contoh: Teks Anekdot"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah Slide</label>
          <input type="number" min={5} max={30} value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gaya Mengajar</label>
          <select value={teachingStyle} onChange={(e) => setTeachingStyle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
            {TEACHING_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tujuan Pembelajaran</label>
        <input type="text" value={learningObjective} onChange={(e) => setLearningObjective(e.target.value)}
          placeholder="Contoh: Menganalisis struktur dan kebahasaan teks anekdot"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={includeQuiz} onChange={(e) => setIncludeQuiz(e.target.checked)}
            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
          Sertakan kuis
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={includeActivity} onChange={(e) => setIncludeActivity(e.target.checked)}
            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
          Sertakan aktivitas
        </label>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !topic.trim() || !learningObjective.trim()}
        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI sedang menyusun rancangan slide...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Buat Rancangan PPT</>
        )}
      </Button>
    </div>
  );
}
