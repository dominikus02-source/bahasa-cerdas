"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";

interface FeedbackFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const TONES = [
  { value: "ramah", label: "Ramah" },
  { value: "tegas", label: "Tegas" },
  { value: "akademik", label: "Akademik" },
];

export function FeedbackForm({ onSubmit, loading }: FeedbackFormProps) {
  const [text, setText] = useState("");
  const [grade, setGrade] = useState("");
  const [tone, setTone] = useState("ramah");
  const [includeRevisionTips, setIncludeRevisionTips] = useState(true);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({
      text: text.trim(),
      grade: grade.trim() || undefined,
      tone,
      includeRevisionTips,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tulisan / Karya yang Akan Diberi Feedback</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tempelkan tulisan siswa atau teks yang ingin diberi umpan balik..."
          className="min-h-[200px] resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang (opsional)</label>
          <Input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Contoh: 7, 10, SD, SMA"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nada Feedback</label>
          <Tabs value={tone} onValueChange={setTone}>
            <TabsList className="grid grid-cols-3">
              {TONES.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={includeRevisionTips} onChange={(e) => setIncludeRevisionTips(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
        <span className="text-xs text-gray-600">Sertakan tips revisi dan contoh</span>
      </label>

      <Button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI sedang membuat feedback...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Buat Feedback</>
        )}
      </Button>
    </div>
  );
}
