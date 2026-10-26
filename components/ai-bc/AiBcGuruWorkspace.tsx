"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, MessageSquarePlus, RefreshCw, Send, Square } from "lucide-react";
import AiBcMarkdown from "./AiBcMarkdown";
import AiBcWelcome from "./AiBcWelcome";
import useAiBcViewport from "./useAiBcViewport";
import styles from "./ai-bc-workspace.module.css";
import AICompanionCharacter from "./AICompanionCharacter";
import { BcStreamError, streamBcChat } from "./ai-bc-stream";
import type { BcClientMessage, BcHint } from "./ai-bc-types";

/**
 * AI BC 2.2 — GURU FULLSCREEN CONVERSATION WORKSPACE.
 * Identitas tampilan: NARA (Narasumber Andalan, Rekan Anda).
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
  "Bantu saya membuat asesmen untuk materi ini.",
  "Bantu saya membuat aktivitas untuk melatih literasi siswa.",
];

const AI_LABEL = "NARA";
const THINKING_LABEL = "Nara sedang berpikir…";
const WRITING_LABEL = "Nara sedang menulis…";
const STOPPED_NOTE = "_(Jawaban dihentikan.)_";
const STOPPED_EMPTY_COPY = "Jawaban dihentikan sebelum Nara sempat menulis.";
const ERROR_COPY =
  "Maaf, Nara belum bisa menjawab sekarang. Silakan kirim ulang pesan Anda.";
const WELCOME_HEADLINE = "Halo! Saya Nara, rekan Anda di BahasaCerdas.";
const WELCOME_LINE =
  "Mau bertanya, mencari ide, atau menyiapkan sesuatu hari ini? Mari kita kerjakan bersama!";
const PLACEHOLDER = "Tulis pesan untuk Nara…";
const SCROLL_NEAR_BOTTOM_PX = 140;
const COMPOSER_MAX_HEIGHT_PX = 128;

interface AiBcGuruWorkspaceProps {
  userName: string;
  personaTitle: string;
  greeting: string;
  hints?: BcHint[];
}

export default function AiBcGuruWorkspace({
  personaTitle,
  greeting,
  hints = [],
}: AiBcGuruWorkspaceProps) {
  const [messages, setMessages] = useState<BcClientMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);
  useAiBcViewport(workspaceRef);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Controller yang dihentikan pengguna lewat tombol "Hentikan" (bukan reset).
  const stoppedRef = useRef<AbortController | null>(null);
  const nearBottomRef = useRef(true);
  const lastUserTextRef = useRef("");

  useEffect(() => () => abortRef.current?.abort(), []);

  const hasConversation = messages.length > 0;

  const scrollToBottom = (smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth && !reduceMotion ? "smooth" : "auto",
    });
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
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_NEAR_BOTTOM_PX;
  };

  const send = useCallback(async (text: string, history: BcClientMessage[]) => {
    setStreaming(true);
    setDraftText("");
    const controller = new AbortController();
    abortRef.current = controller;
    let partial = "";
    try {
      const result = await streamBcChat({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        onDelta: (delta) => {
          if (controller.signal.aborted) return;
          partial += delta;
          setDraftText((prev) => prev + delta);
        },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setDraftText("");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            result.text ||
            "Maaf, Nara belum bisa menjawab kali ini. Coba lagi ya.",
        },
      ]);
    } catch (e) {
      const isAbort = e instanceof Error && e.name === "AbortError";
      if (!isAbort && !controller.signal.aborted) {
        setDraftText("");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            // Pesan BcStreamError sudah ramah (mis. sesi berakhir); selain itu pakai salinan umum.
            content: e instanceof BcStreamError && e.message ? e.message : ERROR_COPY,
            isError: true,
          },
        ]);
      }
    } finally {
      if (abortRef.current === controller) {
        if (stoppedRef.current === controller) {
          // Dihentikan pengguna: simpan jawaban sebagian agar tidak hilang.
          stoppedRef.current = null;
          setDraftText("");
          const kept = partial.trim();
          setMessages((prev) => [
            ...prev,
            kept
              ? { role: "assistant", content: `${kept}\n\n${STOPPED_NOTE}` }
              : { role: "assistant", content: STOPPED_EMPTY_COPY, isError: true },
          ]);
        }
        setStreaming(false);
        abortRef.current = null;
      }
    }
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    lastUserTextRef.current = text;
    const next: BcClientMessage[] =
      messages.length === 0
        ? [
            { role: "assistant", content: greeting },
            { role: "user", content: text },
          ]
        : [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    void send(text, next);
  };

  const handleSuggested = (prompt: string) => {
    const text = prompt.trim();
    if (!text || streaming) return;
    lastUserTextRef.current = text;
    const next: BcClientMessage[] =
      messages.length === 0
        ? [
            { role: "assistant", content: greeting },
            { role: "user", content: text },
          ]
        : [...messages, { role: "user", content: text }];
    setMessages(next);
    void send(text, next);
  };

  const handleRetry = () => {
    const text = lastUserTextRef.current;
    if (!text || streaming) return;
    const prior = messages.filter((message) => !message.isError);
    const lastUserIndex = prior.map((message) => message.role).lastIndexOf("user");
    if (lastUserIndex >= 0) prior.splice(lastUserIndex, 1);
    const next: BcClientMessage[] = [
      ...prior,
      { role: "user", content: text },
    ];
    setMessages(next);
    void send(text, next);
  };

  const handleStop = () => {
    const controller = abortRef.current;
    if (!controller || controller.signal.aborted) return;
    stoppedRef.current = controller;
    controller.abort();
  };

  const handleReset = () => {
    stoppedRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    nearBottomRef.current = true;
    if (inputRef.current) inputRef.current.style.height = "auto";
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
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard bisa ditolak (izin/HTTP/iframe) — jangan tampilkan "Tersalin".
      return;
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Samakan bleed dengan padding shell guru: 14 / 24 / 32px; nav hilang di md.
  const workspaceClass =
    `ai-bc-guru-workspace flex w-full flex-col ${styles.workspace} ${styles.guruWorkspace} ` +
    "-mx-3.5 sm:-mx-6 lg:-mx-8 -mt-3.5 sm:-mt-6 lg:-mt-8 -mb-24 md:-mb-8";

  return (
    <div ref={workspaceRef} className={workspaceClass}>
      {/* Baris identitas produk dalam konten (BUKAN navigasi kedua — tidak ada
          link nav/sidebar; hanya judul + aksi percakapan). */}
      <div className="shrink-0 border-b border-border bg-background px-3 py-2">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <AICompanionCharacter state="idle" size="sm" />
            <div className="min-w-0">
              <p className={`text-base ${styles.naraWordmark}`}>
                {AI_LABEL}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {personaTitle}
              </p>
            </div>
          </div>
          {hasConversation && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="Mulai percakapan baru"
              className={`${styles.secondaryAction} flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground`}
            >
              <MessageSquarePlus size={14} /> Mulai baru
            </button>
          )}
        </div>
      </div>

      {/* Area percakapan — sapaan awal ATAU riwayat + streaming */}
      {!hasConversation && !streaming ? (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`ai-bc-guru-welcome min-h-0 flex-1 overflow-y-auto ${styles.welcome}`}
        >
          <AiBcWelcome
            role="teacher"
            personaTitle={personaTitle}
            headline={WELCOME_HEADLINE}
            description={WELCOME_LINE}
            prompts={GURU_AI_BC_SUGGESTED_PROMPTS}
            hints={hints}
            onPick={handleSuggested}
          />
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          aria-live="polite"
          className="ai-bc-guru-messages min-h-0 flex-1 overflow-y-auto px-3 md:px-6"
        >
          <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 py-4">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex min-w-0 justify-end gap-3">
                  <div
                    className={`${styles.userBubble} min-w-0 max-w-[90%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex min-w-0 gap-2 sm:gap-3">
                  <AICompanionCharacter
                    state="idle"
                    size="sm"
                    className="mt-0.5"
                  />
                  <div
                    className={`${styles.reply} rounded-2xl rounded-bl-md border bg-card p-3.5 sm:p-4 ${
                      msg.isError ? "border-destructive/40" : "border-border"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      {AI_LABEL}
                    </p>
                    {msg.isError ? (
                      <div>
                        <p className="text-sm text-destructive">
                          {msg.content}
                        </p>
                        <button
                          type="button"
                          onClick={handleRetry}
                          disabled={streaming}
                          className={`${styles.secondaryAction} mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground`}
                        >
                          <RefreshCw size={13} /> Coba Lagi
                        </button>
                      </div>
                    ) : (
                      <>
                        <AiBcMarkdown content={msg.content} />
                        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, i)}
                            className={`${styles.secondaryAction} flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs ${
                              copiedId === i
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {copiedId === i ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                            {copiedId === i ? "Tersalin" : "Salin"}
                          </button>
                          {!streaming && i === messages.length - 1 && (
                            <button
                              type="button"
                              onClick={handleRetry}
                              title="Ulangi pertanyaan terakhir"
                              className={`${styles.secondaryAction} flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground`}
                            >
                              <RefreshCw size={12} /> Tanya ulang
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ),
            )}

            {streaming && (
              <div
                className="flex min-w-0 gap-2 sm:gap-3"
                role="status"
                aria-live="polite"
              >
                <AICompanionCharacter
                  state="thinking"
                  size="sm"
                  className="mt-0.5"
                />
                <div
                  className={`${styles.reply} rounded-2xl rounded-bl-md border border-border bg-card p-3.5 sm:p-4`}
                >
                  {draftText ? (
                    <>
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                        {WRITING_LABEL}
                      </p>
                      <AiBcMarkdown content={draftText} />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 py-1.5">
                      <span className="text-sm text-muted-foreground">
                        {THINKING_LABEL}
                      </span>
                      <span
                        className="flex items-center gap-1"
                        aria-hidden="true"
                      >
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current text-muted-foreground motion-reduce:animate-none" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current text-muted-foreground motion-reduce:animate-none [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current text-muted-foreground motion-reduce:animate-none [animation-delay:300ms]" />
                      </span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStop}
                      aria-label="Hentikan jawaban"
                      className={`${styles.secondaryAction} inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground`}
                    >
                      <Square size={12} aria-hidden="true" /> Hentikan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Komposer — SELALU tampil (tanpa gerbang), melekat di dasar workspace */}
      <div className="ai-bc-guru-composer shrink-0 border-t border-border bg-background/80 px-3 pb-2 pt-3 backdrop-blur safe-area-bottom">
        <div className="mx-auto w-full max-w-[900px]">
          <div
            className={`${styles.composerField} flex min-w-0 items-end gap-2 rounded-2xl border border-input bg-card px-3 py-2`}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={PLACEHOLDER}
              aria-label="Tulis pesan untuk Nara"
              className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              aria-label="Kirim pertanyaan"
              title="Kirim pertanyaan"
              className={`${styles.sendButton} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl`}
            >
              {streaming ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground sm:mt-2 sm:text-xs">
            Nara bisa keliru. Periksa kembali informasi penting.
            <span className="hidden sm:inline">
              {" "}· Enter untuk kirim · Shift+Enter untuk baris baru
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
