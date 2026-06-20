"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";

interface EydFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const MODES = [
  { value: "ringan", label: "Ringan" },
  { value: "standar", label: "Standar" },
  { value: "akademik", label: "Akademik" },
];

export function EydForm({ onSubmit, loading }: EydFormProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("standar");
  const [preserveStyle, setPreserveStyle] = useState(false);
  const [explainChanges, setExplainChanges] = useState(true);

  const handleSubmit = () => {
    if (text.trim().length < 10) return;
    onSubmit({
      text: text.trim(),
      mode,
      preserveStyle,
      explainChanges,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Mode Koreksi</label>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid grid-cols-3">
            {MODES.map((m) => (
              <TabsTrigger key={m.value} value={m.value}>{m.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-[10px] text-gray-400 mt-1">
          {mode === "ringan" && "Hanya perbaiki ejaan dan tanda baca yang jelas salah"}
          {mode === "standar" && "Perbaiki ejaan, tanda baca, dan pilihan kata tidak baku"}
          {mode === "akademik" && "Koreksi menyeluruh untuk teks akademik dan formal"}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Teks yang Akan Dikoreksi</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Masukkan teks yang ingin diperiksa ejaan dan tata bahasanya..."
          className="min-h-[200px] resize-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={preserveStyle} onChange={(e) => setPreserveStyle(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-xs text-gray-600">Pertahankan gaya asli</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={explainChanges} onChange={(e) => setExplainChanges(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-xs text-gray-600">Jelaskan perubahan</span>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{text.length} karakter</span>
        <Button
          onClick={handleSubmit}
          disabled={loading || text.trim().length < 10}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengecek...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Koreksi dengan AI</>
          )}
        </Button>
      </div>
    </div>
  );
}
