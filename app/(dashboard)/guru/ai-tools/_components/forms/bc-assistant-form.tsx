"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import AICompanionCharacter from "@/components/ai-bc/AICompanionCharacter";
import styles from "@/components/ai-bc/ai-bc-workspace.module.css";

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
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <AICompanionCharacter state="idle" size="sm" />
          <div>
            <p className="text-sm font-semibold text-foreground">AI BC</p>
            <p className="text-xs text-muted-foreground">Teman Guru</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Diskusikan materi, soal, dan aktivitas pembelajaran Bahasa Indonesia.
        </p>
      </div>

      <div>
        <label
          htmlFor="bc-assistant-message"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Pesan
        </label>
        <Textarea
          id="bc-assistant-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tanyakan tentang materi, Rencana Pembelajaran, soal, atau apa pun seputar Bahasa Indonesia..."
          className="min-h-[120px] resize-none text-base sm:text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="bc-assistant-context"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Konteks tambahan{" "}
          <span className="text-muted-foreground">(opsional)</span>
        </label>
        <input
          id="bc-assistant-context"
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Contoh: Kelas X, materi teks negosiasi"
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !message.trim()}
        className={`${styles.sendButton} min-h-11 w-full`}
      >
        {loading ? (
          <>
            <Loader2
              className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />{" "}
            AI BC sedang menjawab...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Tanya AI BC
          </>
        )}
      </Button>
    </div>
  );
}
