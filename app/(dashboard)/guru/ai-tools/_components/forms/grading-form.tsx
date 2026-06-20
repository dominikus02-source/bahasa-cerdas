"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";

interface GradingFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const TONES = [
  { value: "ramah", label: "Ramah" },
  { value: "tegas", label: "Tegas" },
  { value: "akademik", label: "Akademik" },
];

export function GradingForm({ onSubmit, loading }: GradingFormProps) {
  const [studentAnswer, setStudentAnswer] = useState("");
  const [questionOrTask, setQuestionOrTask] = useState("");
  const [rubric, setRubric] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [grade, setGrade] = useState("");
  const [feedbackTone, setFeedbackTone] = useState("akademik");

  const handleSubmit = () => {
    if (!studentAnswer.trim()) return;
    const parsedMax = parseInt(maxScore, 10);
    onSubmit({
      studentAnswer: studentAnswer.trim(),
      questionOrTask: questionOrTask.trim() || undefined,
      rubric: rubric.trim() || undefined,
      maxScore: isNaN(parsedMax) || parsedMax < 1 ? 100 : parsedMax,
      grade: grade.trim() || undefined,
      feedbackTone,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Soal / Tugas</label>
        <Textarea
          value={questionOrTask}
          onChange={(e) => setQuestionOrTask(e.target.value)}
          placeholder="Masukkan soal atau deskripsi tugas..."
          className="min-h-[80px] resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Jawaban Siswa</label>
        <Textarea
          value={studentAnswer}
          onChange={(e) => setStudentAnswer(e.target.value)}
          placeholder="Tempelkan jawaban siswa yang akan dinilai..."
          className="min-h-[150px] resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Rubrik (opsional)</label>
        <Textarea
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
          placeholder="Jika tidak diisi, akan menggunakan rubrik umum (Isi 40%, Struktur 20%, Bahasa 20%, Analisis 20%)"
          className="min-h-[60px] resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Skor Maksimal</label>
          <Input
            type="number"
            min={1}
            max={1000}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang (opsional)</label>
          <Input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="7, 10, SMA"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nada Feedback</label>
          <Tabs value={feedbackTone} onValueChange={setFeedbackTone}>
            <TabsList className="grid grid-cols-3">
              {TONES.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !studentAnswer.trim()}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI sedang menilai...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Nilai dengan AI</>
        )}
      </Button>
    </div>
  );
}
