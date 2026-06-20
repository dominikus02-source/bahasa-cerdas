"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Bot } from "lucide-react";

interface BCAssistantFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

export function BCAssistantForm({ onSubmit, loading }: BCAssistantFormProps) {
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSubmit({
      message: message.trim(),
      context: context.trim() || undefined,
      mode: "guru",
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">AI BC Assistant</p>
        </div>
        <p className="text-xs text-emerald-600">
          Tanya apa pun tentang Bahasa Indonesia. Saya bisa mengarahkan Anda ke agent khusus jika diperlukan.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Pesan</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tanyakan tentang materi, RPP, soal, atau apa pun seputar Bahasa Indonesia..."
          className="min-h-[120px] resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Konteks Tambahan <span className="text-gray-400">(opsional)</span>
        </label>
        <input type="text" value={context} onChange={(e) => setContext(e.target.value)}
          placeholder="Contoh: Kelas X, materi teks negosiasi"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !message.trim()}
        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI BC sedang menjawab...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Tanya AI BC</>
        )}
      </Button>
    </div>
  );
}
