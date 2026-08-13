"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, MessageSquarePlus, RefreshCw, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AICompanionCharacter from "./AICompanionCharacter";
import { streamBcChat } from "./ai-bc-stream";
import type { BcClientMessage, BcHint } from "./ai-bc-types";

/**
 * AI BC 2.1 — ARENA AI FULLSCREEN CONVERSATION WORKSPACE (student).
 *
 * Permukaan murid (/arena/ai) yang professional: workspace percakapan
 * layar-penuh DI DALAM Unified App Shell (sidebar global + header global
 * disediakan app/arena/layout.tsx — komponen ini TIDAK membawa navigasi
 * kedua, sidebar, atau header sendiri).
 *
 * - Tinggi viewport-anchored (h-[calc(100dvh-*)]), mengikuti preseden
 *   app/arena/chat/chat-client.tsx; tanpa double scrollbar.
 * - Keadaan awal: komposer SUDAH terlihat (tanpa gerbang "mulai percakapan",
 *   tanpa blank state) — "Mau tanya apa?" + saran pertanyaan murid.
 * - Zelby memakai registry resmi gambarKarakter("zelby", pose) lewat
 *   AICompanionCharacter — TIDAK ada path aset yang di-hardcode.
 * - Streaming SSE via streamBcChat (route /api/ai/bc/chat TIDAK berubah).
 * - Persona murid (Teman Belajarmu) dijamin server-side di halaman — tidak
 *   ada CTA guru di permukaan ini.
 */

// Saran awal murid (student-safe ONLY) — tanpa alur kerja guru.
export const ARENA_AI_SUGGESTED_PROMPTS: string[] = [
  "Jelaskan materi ini dengan sederhana",
  "Bantu aku memahami soal ini",
  "Ajari aku cara menemukan ide pokok",
  "Aku ingin latihan Bahasa Indonesia",
  "Kenapa jawaban ini salah?",
  "Jelaskan seperti aku masih pemula",
];

const AI_LABEL = "AI BC";
const THINKING_LABEL = "Sebentar, aku pikirkan…";
const ERROR_COPY = "Maaf, aku belum bisa menjawab sekarang. Coba kirim pertanyaanmu lagi.";
const WELCOME_HEADLINE = "Mau tanya apa?";
const WELCOME_LINE = "Aku siap membantu kamu memahami pelajaran dan belajar lebih seru.";
const PLACEHOLDER = "Tanyakan sesuatu tentang pelajaranmu...";
const SCROLL_NEAR_BOTTOM_PX = 140;
const COMPOSER_MAX_HEIGHT_PX = 128;

/** Deteksi APK (TWA) via cookie bc_apk — sama dengan chat-client.tsx. */
function useIsApkClient() {
  const [isApk, setIsApk] = useState(false);
  useEffect(() => {
    setIsApk(typeof document !== "undefined" && document.cookie.includes("bc_apk=1"));
  }, []);
  return isApk;
}

function MarkdownContent({ content }: { content: string }) {
  return (
 <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-violet-600 prose-strong:text-slate-800 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:bg-slate-900 prose-code:text-slate-800 dark:prose-headings:text-slate-100 dark:prose-a:text-violet-400 dark:prose-strong:text-slate-100 dark:prose-p:text-slate-300 dark:prose-li:text-slate-300 dark:prose-code:text-slate-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

interface AiBcArenaWorkspaceProps {
  userName: string;
  personaTitle: string;
  greeting: string;
  hints?: BcHint[];
}

export default function AiBcArenaWorkspace({ userName, personaTitle, greeting, hints = [] }: AiBcArenaWorkspaceProps) {
  const isApk = useIsApkClient();

  const [messages, setMessages] = useState<BcClientMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nearBottomRef = useRef(true);
  const lastUserTextRef = useRef("");

  const hasConversation = messages.length > 0;

  const scrollToBottom = (smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  };

  // Auto-scroll HANYA bila pengguna berada di dekat dasar — jika pengguna
  // menggulir ke atas, jangan paksa turun saat streaming.
  useEffect(() => {
    if (nearBottomRef.current) {
      scrollToBottom(messages.length > 0);
    }
  }, [messages, streaming, draftText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_NEAR_BOTTOM_PX;
  };

  const send = useCallback(async (text: string, history: BcClientMessage[]) => {
    setStreaming(true);
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
      const isAbort = e instanceof Error && e.name === "AbortError";
      if (!isAbort) {
        setDraftText("");
        setMessages((prev) => [...prev, { role: "assistant", content: ERROR_COPY, isError: true }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    lastUserTextRef.current = text;
    const next: BcClientMessage[] =
      messages.length === 0
        ? [{ role: "assistant", content: greeting }, { role: "user", content: text }]
        : [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    void send(text, next);
  };

  const handleSuggested = (prompt: string) => {
    const text = prompt.trim();
    if (!text || streaming) return;
    lastUserTextRef.current = text;
    const next: BcClientMessage[] =
      messages.length === 0
        ? [{ role: "assistant", content: greeting }, { role: "user", content: text }]
        : [...messages, { role: "user", content: text }];
    setMessages(next);
    void send(text, next);
  };

  const handleRetry = () => {
    const text = lastUserTextRef.current;
    if (!text || streaming) return;
    const next: BcClientMessage[] = [...messages.filter((m) => !m.isError), { role: "user", content: text }];
    setMessages(next);
    void send(text, next);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setDraftText("");
    setInput("");
    lastUserTextRef.current = "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
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

  // Tinggi workspace mengikuti preseden Obrolan (chat-client.tsx):
  // WEB = chrome header global (h-14 = 3.5rem), APK = header + BottomNav (4rem).
  const workspaceHeight = isApk
    ? "h-[calc(100dvh-7.5rem)]"
    : "h-[calc(100dvh-3.5rem)]";

  return (
    <div className={`ai-bc-workspace flex w-full flex-col ${workspaceHeight} min-h-[420px]`}>
      {/* Baris identitas produk dalam konten (BUKAN navigasi kedua — tidak ada
          link nav/sidebar; hanya judul + aksi percakapan). */}
 <div className="shrink-0 border-b border-slate-200/70 bg-white/70 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <AICompanionCharacter state="idle" size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{AI_LABEL}</p>
              <p className="truncate text-[11px] text-violet-500 dark:text-violet-400">{personaTitle}</p>
            </div>
          </div>
          {hasConversation && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="Mulai percakapan baru"
 className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <MessageSquarePlus size={14} /> Mulai baru
            </button>
          )}
        </div>
      </div>

      {/* Area percakapan — sapaan awal ATAU riwayat + streaming */}
      {!hasConversation && !streaming ? (
        <div ref={scrollRef} onScroll={handleScroll} className="ai-bc-welcome min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex h-full w-full max-w-[900px] flex-col items-center justify-center gap-4 px-4 py-6 text-center">
            <AICompanionCharacter state="idle" size="lg" priority />
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{AI_LABEL}</span>
 <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300">
                  {personaTitle}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{WELCOME_HEADLINE}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{WELCOME_LINE}</p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ARENA_AI_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggested(prompt)}
 className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-600 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 :border-violet-800 dark:hover:bg-violet-950/40"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {hints.length > 0 && (
              <div className="w-full">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Saran untukmu
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {hints.map((hint) => (
                    <button
                      key={hint.label}
                      type="button"
                      onClick={() => handleSuggested(hint.prompt)}
 className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-violet-950/50"
                    >
                      {hint.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} onScroll={handleScroll} aria-live="polite" className="ai-bc-messages min-h-0 flex-1 overflow-y-auto px-3 md:px-6">
          <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 py-4">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end gap-3">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-600 to-purple-600 p-3.5 text-sm leading-relaxed text-white shadow-md sm:max-w-[75%]">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <AICompanionCharacter state="idle" size="sm" className="mt-0.5" />
                  <div
                    className={`max-w-[85%] rounded-2xl rounded-bl-md border bg-white p-3.5 shadow-sm sm:max-w-[78%] dark:bg-slate-900/80 ${
 msg.isError ? "border-rose-200 dark:border-rose-900" : "border-slate-200 dark:border-slate-700/70"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{AI_LABEL}</p>
                    {msg.isError ? (
                      <div>
                        <p className="text-sm text-rose-600 dark:text-rose-400">{msg.content}</p>
                        <button
                          type="button"
                          onClick={handleRetry}
 className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <RefreshCw size={13} /> Coba Lagi
                        </button>
                      </div>
                    ) : (
                      <>
                        <MarkdownContent content={msg.content} />
                        <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, i)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors ${
                              copiedId === i ? "text-emerald-500" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            {copiedId === i ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === i ? "Tersalin" : "Salin"}
                          </button>
                          <button
                            type="button"
                            onClick={handleRetry}
                            title="Ulangi pertanyaan terakhir"
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
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

            {streaming && (
              <div className="flex gap-3" role="status" aria-live="polite">
                <AICompanionCharacter state="thinking" size="sm" className="mt-0.5" />
 <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white p-3.5 shadow-sm sm:max-w-[78%] dark:border-slate-700/70 dark:bg-slate-900/80">
                  {draftText ? (
                    <>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{THINKING_LABEL}</p>
                      <MarkdownContent content={draftText} />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 py-1.5">
                      <span className="text-xs text-slate-400">{THINKING_LABEL}</span>
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 motion-reduce:animate-none" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 motion-reduce:animate-none [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 motion-reduce:animate-none [animation-delay:300ms]" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Komposer — SELALU tampil (tanpa gerbang), melekat di dasar workspace */}
 <div className="ai-bc-composer shrink-0 border-t border-slate-200/70 bg-white/80 px-3 pb-2 pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 safe-area-bottom">
        <div className="mx-auto w-full max-w-[900px]">
 <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-violet-500/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={PLACEHOLDER}
              aria-label="Pertanyaan untuk AI BC"
 className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              aria-label="Kirim pertanyaan"
              title="Kirim pertanyaan"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md transition-all hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {streaming ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-400 dark:text-slate-600">
            Enter untuk kirim · Shift+Enter untuk baris baru
          </p>
        </div>
      </div>
    </div>
  );
}
