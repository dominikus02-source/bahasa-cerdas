"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BcClientMessage, BcRole } from "./ai-bc-types";
import { COMPANION_BUBBLES, COMPANION_LABELS, PLACEHOLDERS } from "./ai-bc-types";
import AICompanionCharacter, { type CompanionState } from "./AICompanionCharacter";

interface AiBcChatViewProps {
  role: BcRole;
  personaTitle: string;
  messages: BcClientMessage[];
  streaming: boolean;
  streamingText?: string;
  disabled: boolean;
  companion: CompanionState;
  onSend: (text: string) => void;
  onRetry: () => void;
}

const TONES: Record<BcRole, { userBubble: string; focus: string }> = {
  student: {
    userBubble: "bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-md",
    focus: "focus:border-violet-500 focus:ring-violet-200 dark:focus:ring-violet-900",
  },
  teacher: {
    userBubble: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-md",
    focus: "focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-900",
  },
};

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-violet-600 prose-strong:text-slate-800 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:bg-slate-900 prose-code:text-slate-800 dark:prose-headings:text-slate-100 dark:prose-a:text-violet-400 dark:prose-strong:text-slate-100 dark:prose-p:text-slate-300 dark:prose-li:text-slate-300 dark:prose-code:text-slate-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default function AiBcChatView({ role, personaTitle, messages, streaming, streamingText, disabled, companion, onSend, onRetry }: AiBcChatViewProps) {
  const tone = TONES[role];
  const bubbles = COMPANION_BUBBLES[role];
  const companionLabel = COMPANION_LABELS[role];
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, streamingText]);

  const canSend = input.trim().length > 0 && !streaming && !disabled;

  const handleSend = () => {
    const text = input.trim();
    if (!text || !canSend) return;
    setInput("");
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stripBubble = streaming ? bubbles.thinking : messages.length > 0 ? bubbles.done : bubbles.idle;

  return (
    <div className="flex h-[calc(100dvh-232px)] min-h-[420px] flex-col sm:h-[calc(100dvh-244px)]">
      {/* Pesan */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-4" aria-live="polite">
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end gap-3">
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-md sm:max-w-[75%] ${tone.userBubble}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <AICompanionCharacter state="idle" size="sm" className="mt-0.5" />
              <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-bl-md border bg-white p-4 shadow-sm dark:bg-slate-900/80 sm:max-w-[78%] ${
                msg.isError ? "border-rose-200 dark:border-rose-900" : "border-slate-200 dark:border-slate-700/70"
              }`}>
                {msg.isError ? (
                  <div>
                    <p className="text-sm text-rose-600 dark:text-rose-400">{msg.content}</p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    >
                      <RefreshCw size={13} /> Coba lagi
                    </button>
                  </div>
                ) : (
                  <>
                    <MarkdownContent content={msg.content} />
                    <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, i)}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors ${
                          copiedId === i ? "text-emerald-500" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {copiedId === i ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === i ? "Tersalin" : "Salin"}
                      </button>
                      <button
                        type="button"
                        onClick={onRetry}
                        className="flex items-center gap-1 text-[11px] text-slate-400 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Ulangi pertanyaan terakhir"
                      >
                        <RefreshCw size={12} /> Tanya ulang
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}

        {streaming && streamingText && (
          <div className="flex gap-3" role="status">
            <AICompanionCharacter state="thinking" size="sm" />
            <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{bubbles.thinking}</p>
              <MarkdownContent content={streamingText} />
            </div>
          </div>
        )}

        {streaming && !streamingText && (
          <div className="flex gap-3" role="status">
            <AICompanionCharacter state="thinking" size="sm" />
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
              <p className="text-xs text-slate-400">{bubbles.thinking}</p>
            </div>
          </div>
        )}
      </div>

      {/* Komposer */}
      <div className="border-t border-slate-200 bg-white px-1 pb-2 pt-3 dark:border-slate-700/60 dark:bg-slate-900/60">
        {/* Karakter AI BC — alur idle → thinking → done */}
        <div
          className="mb-2 flex items-center gap-2 px-1"
          role={streaming ? "status" : undefined}
          aria-live="polite"
        >
          {streaming ? (
            <AICompanionCharacter state="thinking" size="sm" />
          ) : (
            <AICompanionCharacter
              state="idle"
              size="sm"
              interactive
              label={companionLabel}
              onClick={() => inputRef.current?.focus()}
            />
          )}
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{stripBubble}</span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={PLACEHOLDERS[role]}
            aria-label="Tulis pertanyaan"
            className={`max-h-32 flex-1 resize-none rounded-2xl border-2 border-slate-200 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 dark:border-slate-700 dark:text-slate-100 ${tone.focus}`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Kirim"
            className={`w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r ${tone.userBubble} flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100`}
          >
            {streaming ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-300 dark:text-slate-600">
          Enter untuk kirim · Shift+Enter untuk baris baru · {personaTitle}
        </p>
      </div>
    </div>
  );
}