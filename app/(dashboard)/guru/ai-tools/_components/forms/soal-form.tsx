"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { GRADE_OPTIONS } from "@/lib/kurikulum/jenjang";

interface SoalFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const QUESTION_TYPES = [
  { value: "pilihan_ganda", label: "Pilihan Ganda" },
  { value: "pilihan_ganda_kompleks", label: "PG Kompleks" },
  { value: "benar_salah", label: "Benar/Salah" },
  { value: "menjodohkan", label: "Menjodohkan" },
  { value: "isian_singkat", label: "Isian Singkat" },
  { value: "uraian", label: "Uraian" },
  { value: "cloze", label: "Cloze" },
  { value: "akm_literasi", label: "AKM Literasi" },
  { value: "pisa_style", label: "PISA Style" },
];

// Grades come from the shared list so SD (I-VI) is available here too.

export function SoalForm({ onSubmit, loading }: SoalFormProps) {
  const [subject, setSubject] = useState("Bahasa Indonesia");
  const [grade, setGrade] = useState("VII");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<string[]>(["pilihan_ganda"]);
  const [difficulty, setDifficulty] = useState("campuran");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [includeExplanation, setIncludeExplanation] = useState(true);

  const toggleType = (type: string) => {
    if (types.includes(type)) {
      if (types.length > 1) setTypes(types.filter((t) => t !== type));
    } else {
      setTypes([...types, type]);
    }
  };

  const handleSubmit = () => {
    if (!topic.trim() || types.length === 0) return;
    onSubmit({
      subject: subject.trim(),
      grade,
      topic: topic.trim(),
      questionCount: count,
      questionTypes: types,
      difficulty,
      includeAnswerKey,
      includeExplanation,
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
            {GRADE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Topik</label>
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
          placeholder="Contoh: Teks Prosedur"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah Soal</label>
          <input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tingkat Kesulitan</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
            <option value="campuran">Campuran</option>
            <option value="mudah">Mudah</option>
            <option value="sedang">Sedang</option>
            <option value="sulit">Sulit</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Jenis Soal</label>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => toggleType(t.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                types.includes(t.value)
                  ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                  : "bg-white border-gray-200 text-gray-500 hover:border-emerald-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={includeAnswerKey} onChange={(e) => setIncludeAnswerKey(e.target.checked)}
            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
          Kunci jawaban
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={includeExplanation} onChange={(e) => setIncludeExplanation(e.target.checked)}
            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
          Pembahasan
        </label>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !topic.trim() || types.length === 0}
        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI sedang menyusun soal, kunci, dan pembahasan...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Buat Soal</>
        )}
      </Button>
    </div>
  );
}
