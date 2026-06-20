"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";

interface TextAnalysisFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const ANALYSIS_TYPES = [
  { value: "struktur", label: "Struktur" },
  { value: "literasi", label: "Literasi" },
  { value: "gaya_bahasa", label: "Gaya Bahasa" },
  { value: "komprehensif", label: "Lengkap" },
];

export function TextAnalysisForm({ onSubmit, loading }: TextAnalysisFormProps) {
  const [text, setText] = useState("");
  const [analysisType, setAnalysisType] = useState("komprehensif");
  const [grade, setGrade] = useState("");
  const [includeSuggestions, setIncludeSuggestions] = useState(true);

  const handleSubmit = () => {
    if (text.trim().length < 50) return;
    onSubmit({
      text: text.trim(),
      analysisType,
      grade: grade.trim() || undefined,
      includeSuggestions,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Analisis</label>
        <Tabs value={analysisType} onValueChange={setAnalysisType}>
          <TabsList className="grid grid-cols-4">
            {ANALYSIS_TYPES.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-[10px] text-gray-400 mt-1">
          {analysisType === "struktur" && "Fokus pada organisasi teks, alur, dan paragraf"}
          {analysisType === "literasi" && "Fokus pada gagasan utama, argumen, dan koherensi"}
          {analysisType === "gaya_bahasa" && "Fokus pada diksi, majas, dan pilihan kata"}
          {analysisType === "komprehensif" && "Semua aspek: struktur, literasi, dan gaya bahasa"}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Teks yang Akan Dianalisis</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Masukkan teks yang ingin dianalisis (minimal 50 karakter)..."
          className="min-h-[200px] resize-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang (opsional)</label>
          <Input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="SD, SMP, SMA"
          />
        </div>
        <div className="flex items-center pt-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeSuggestions} onChange={(e) => setIncludeSuggestions(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-xs text-gray-600">Sertakan saran perbaikan</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{text.length} karakter</span>
        <Button
          onClick={handleSubmit}
          disabled={loading || text.trim().length < 50}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menganalisis...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Analisis dengan AI</>
          )}
        </Button>
      </div>
    </div>
  );
}
