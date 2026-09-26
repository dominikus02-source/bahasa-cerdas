"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, MessageSquarePlus, RefreshCw, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AICompanionCharacter from "./AICompanionCharacter";
import { streamBcChat } from "./ai-bc-stream";
import type { BcClientMessage, BcHint } from "./ai-bc-types";

/**
 * AI BC 2.2 — GURU FULLSCREEN CONVERSATION WORKSPACE (Teman Guru).
 *
 * Permukaan guru (/guru/ai-bc) yang setara kualitasnya dengan workspace murid
 * 2.1 (AiBcArenaWorkspace) DI DALAM Unified App Shell (sidebar global + header
 * global disediakan guru layout — komponen ini TIDAK membawa navigasi kedua).
 *
 * - Tinggi viewport-anchored mengikuti preseden Obrolan/arena-AI; bleeding
 *   melewati padding kanvas guru (px/py/pb) sehingga workspace fullscreen
 *   tanpa double scrollbar. Mobile memperhitungkan GuruMobileNav (lg:hidden).
 * - Keadaan awal: Zelby reading + "Teman Guru" + headline sapa + komposer
 *   SUDAH terlihat (tanpa gerbang percakapan).
 * - Zelby memakai registry resmi gambarKarakter("zelby", pose) lewat
 *   AICompanionCharacter — TIDAK ada path aset yang di-hardcode.
 * - Streaming SSE via streamBcChat (route /api/ai/bc/chat TIDAK berubah).
 * - Persona guru (Teman Guru) dijamin server-side di halaman — peran selalu
 *   dari sesi, tidak pernah dari klien.
 */

// Saran awal guru (prompt discovery, BUKAN navigasi) — bahasa produk:
// "rencana pembelajaran" sebagai copy default.
export const GURU_AI_BC_SUGGESTED_PROMPTS: string[] = [
  "Bantu saya menyusun rencana pembelajaran Bahasa Indonesia.",
  "Bagaimana membuat pembelajaran cerpen lebih menarik?",
  "Bantu saya membuat aktivitas untuk melatih literasi siswa.",
  "Saya punya siswa yang kesulitan memahami teks. Apa strategi yang bisa saya coba?",
  "Bantu saya membuat asesmen untuk materi ini.",
  "Bagaimana cara membuat diskusi kelas lebih aktif?",
];

const AI_LABEL = "AI BC";
const THINKING_LABEL = "Sebentar, aku pikirkan…";
const ERROR_COPY = "Maaf, aku belum bisa menjawab sekarang.";
const WELCOME_HEADLINE = "Mau kita pikirkan apa hari ini?";
const WELCOME_LINE = "Teman berdiskusi untuk mengembangkan pembelajaranmu.";
const PLACEHOLDER = "Tanyakan sesuatu tentang pembelajaran...";
const SCROLL_NEAR_BOTTOM_PX = 140;
const COMPOSER_MAX_HEIGHT_PX = 128;

function MarkdownContent({ content }: { content: string }) {
  return (
 <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-blue-600 prose-strong:text-slate-800 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:bg-slate-900 prose-code:text-slate-800 dark:prose-headings:text-slate-100 dark:prose-a:text-blue-300 dark:prose-strong:text-slate-100 dark:prose-p:text-slate-300 dark:prose-li:text-slate-300 dark:prose-code:text-slate-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

interface AiBcGuruWorkspaceProps {
  userName: string;
  personaTitle: string;
  greeting: string;
  hints?: BcHint[];
}

export default function AiBcGuruWorkspace({ userName, personaTitle, greeting, hints = [] }: AiBcGuruWorkspaceProps) {
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

  // Tinggi workspace mengikuti preseden arena-AI/Obrolan:
  // WEB desktop = header global (3.5rem); mobile = header + GuruMobileNav (4rem).
  // Bleeding melewati padding kanvas guru (px/py/pb) supaya fullscreen tanpa
  // double scrollbar — satu layer scroll percakapan, nol scroll halaman.
  const workspaceClass =
    "ai-bc-guru-workspace flex w-full flex-col h-[calc(100dvh-7.5rem)] lg:h-[calc(100dvh-3.5rem)] min-h-[420px] " +
    "-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 -mb-24 lg:-mb-8";

  return (
    <div className={workspaceClass}>
      {/* Baris identitas produk dalam konten (BUKAN navigasi kedua — tidak ada
          link nav/sidebar; hanya judul + aksi percakapan). */}
 <div className="shrink-0 border-b border-slate-200/70 bg-white/70 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <AICompanionCharacter state="idle" size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{AI_LABEL}</p>
              <p className="truncate text-[11px] text-blue-600 dark:text-blue-300">{personaTitle}</p>
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
        <div ref={scrollRef} onScroll={handleScroll} className="ai-bc-guru-welcome min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex h-full w-full max-w-[900px] flex-col items-center justify-center gap-4 px-4 py-6 text-center">
            <AICompanionCharacter state="idle" size="lg" priority />
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{AI_LABEL}</span>
 <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
                  {personaTitle}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{WELCOME_HEADLINE}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{WELCOME_LINE}</p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {GURU_AI_BC_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggested(prompt)}
 className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-600 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
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
 className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-blue-950/50"
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
        <div ref={scrollRef} onScroll={handleScroll} aria-live="polite" className="ai-bc-guru-messages min-h-0 flex-1 overflow-y-auto px-3 md:px-6">
          <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 py-4">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end gap-3">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-blue-700 to-sky-600 p-3.5 text-sm leading-relaxed text-white shadow-md sm:max-w-[75%]">
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
                              copiedId === i ? "text-blue-500" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 motion-reduce:animate-none" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 motion-reduce:animate-none [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 motion-reduce:animate-none [animation-delay:300ms]" />
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
 <div className="ai-bc-guru-composer shrink-0 border-t border-slate-200/70 bg-white/80 px-3 pb-2 pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 safe-area-bottom">
        <div className="mx-auto w-full max-w-[900px]">
 <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-blue-500/20">
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-700 to-sky-600 text-white shadow-md transition-all hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
