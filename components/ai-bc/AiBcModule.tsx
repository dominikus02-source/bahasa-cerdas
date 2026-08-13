"use client";

import { useCallback, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { STUDENT_PERSONA, TEACHER_PERSONA } from "@/src/ai/bc/personas";
import AiBcLanding from "./AiBcLanding";
import AiBcChatView from "./AiBcChatView";
import AICompanionCharacter, { type CompanionState } from "./AICompanionCharacter";
import { streamBcChat } from "./ai-bc-stream";
import { STUDENT_QUICK_ACTIONS, TEACHER_QUICK_ACTIONS } from "./ai-bc-types";
import type { BcClientMessage, BcHint, BcRole } from "./ai-bc-types";

interface AiBcModuleProps {
  role: BcRole;
  userName?: string;
  hints?: BcHint[];
}

export default function AiBcModule({ role, userName, hints = [] }: AiBcModuleProps) {
  const persona = role === "teacher" ? TEACHER_PERSONA : STUDENT_PERSONA;
  const quickActions = role === "teacher" ? TEACHER_QUICK_ACTIONS : STUDENT_QUICK_ACTIONS;

  const [mode, setMode] = useState<"landing" | "chat">("landing");
  const [messages, setMessages] = useState<BcClientMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [lastUserText, setLastUserText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const companion: CompanionState = streaming ? "thinking" : "idle";

  const send = useCallback(async (text: string, history: BcClientMessage[]) => {
    setStreaming(true);
    setDisabled(true);
    setDraftText("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await streamBcChat({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        onDelta: (delta) => setDraftText((prev) => prev + delta),
        signal: controller.signal,
      });

      setDraftText("");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.text || "Maaf, aku belum bisa menjawab kali ini. Coba lagi ya." },
      ]);
    } catch (e) {
      setDraftText("");
      const message = e instanceof Error && e.name !== "AbortError" ? e.message : "Layanan AI sedang sibuk. Coba lagi.";
      setMessages((prev) => [...prev, { role: "assistant", content: message, isError: true }]);
    } finally {
      setStreaming(false);
      setDisabled(false);
      abortRef.current = null;
    }
  }, []);

  const startConversation = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (!text) return;
      const history: BcClientMessage[] = [{ role: "assistant", content: persona.greeting }, { role: "user", content: text }];
      setLastUserText(text);
      setMessages(history);
      setMode("chat");
      void send(text, history);
    },
    [persona.greeting, send]
  );

  const handleSend = useCallback(
    (text: string) => {
      if (streaming || disabled) return;
      const next: BcClientMessage[] = [...messages, { role: "user", content: text }];
      setLastUserText(text);
      setMessages(next);
      void send(text, next);
    },
    [messages, streaming, disabled, send]
  );

  const handleRetry = useCallback(() => {
    if (!lastUserText || streaming || disabled) return;
    const next: BcClientMessage[] = [...messages.filter((m) => !m.isError), { role: "user", content: lastUserText }];
    setMessages(next);
    void send(lastUserText, next);
  }, [lastUserText, messages, streaming, disabled, send]);

  const resetConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setLastUserText("");
    setStreaming(false);
    setDraftText("");
    setDisabled(false);
    setMode("landing");
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Baris header modul — identitas produk dalam aplikasi (bukan header global) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <AICompanionCharacter state={companion} size="sm" />
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">AI BC</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{persona.title}</p>
          </div>
        </div>
        {mode === "chat" && (
          <button
            type="button"
            onClick={resetConversation}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <MessageSquarePlus size={14} /> Mulai baru
          </button>
        )}
      </div>

      {mode === "landing" ? (
        <AiBcLanding
          role={role}
          userName={userName ?? ""}
          personaTitle={persona.title}
          greeting={persona.greeting}
          quickActions={quickActions}
          hints={hints}
          companion={companion}
          onPick={startConversation}
        />
      ) : (
        <AiBcChatView
          role={role}
          personaTitle={persona.title}
          messages={messages}
          streaming={streaming}
          streamingText={draftText}
          disabled={disabled}
          companion={companion}
          onSend={handleSend}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}