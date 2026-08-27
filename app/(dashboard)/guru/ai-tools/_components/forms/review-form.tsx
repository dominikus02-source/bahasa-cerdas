"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";

interface ReviewFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const CONTENT_TYPES = [
  { value: "rpp", label: "Rencana Pembelajaran" },
  { value: "soal", label: "Soal" },
  { value: "artikel", label: "Artikel / Karya" },
  { value: "lainnya", label: "Lainnya" },
];

export function ReviewForm({ onSubmit, loading }: ReviewFormProps) {
  const [contentType, setContentType] = useState("artikel");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({
      content: content.trim(),
      contentType,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Konten</label>
        <select value={contentType} onChange={(e) => setContentType(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
          {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Konten yang Ingin Direview</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tempelkan konten Rencana Pembelajaran, soal, atau materi yang ingin direview oleh AI..."
          className="min-h-[200px] resize-none"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || content.trim().length < 20}
        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI sedang menilai kualitas materi...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Review Materi</>
        )}
      </Button>
    </div>
  );
}
