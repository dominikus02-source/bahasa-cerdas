"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Send, Trash2, X } from "lucide-react";

interface CommentAuthor {
  id: string;
  fullName: string | null;
  avatar: string | null;
  displayName: string;
}

interface GuruBerkaryaComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  author: CommentAuthor | null;
}

interface GuruBerkaryaCommentsProps {
  artikelId: string;
  artikelTitle: string;
  onClose: () => void;
  onCountChange: (artikelId: string, count: number) => void;
}

function waktuRelatif(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const detik = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (detik < 60) return "baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return "kemarin";
  if (hari < 7) return `${hari} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(t);
}

function inisial(nama: string | null | undefined): string {
  if (!nama) return "G";
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

/** Panel komentar Guru Berkarya — modal ringan. Komentar di-fetch LAZY (hanya
 * saat panel dibuka), tanpa polling. Like/komentar tidak memberi XP apa pun. */
export function GuruBerkaryaComments({ artikelId, artikelTitle, onClose, onCountChange }: GuruBerkaryaCommentsProps) {
  const [comments, setComments] = useState<GuruBerkaryaComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    fetch(`/api/guru/berkarya/${artikelId}/comments`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        if (!aktif) return;
        setComments(Array.isArray(res?.comments) ? res.comments : []);
      })
      .catch(() => {
        if (aktif) {
          setComments([]);
          setError("Gagal memuat komentar.");
        }
      });
    return () => {
      aktif = false;
    };
  }, [artikelId]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const teks = draft.trim();
    if (!teks || sending) return;

    setSending(true);
    setError(null);
    try {
      const r = await fetch(`/api/guru/berkarya/${artikelId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: teks }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res?.error || "Gagal mengirim komentar");

      setComments((prev) => [...(prev ?? []), res.comment]);
      if (typeof res.commentCount === "number") onCountChange(artikelId, res.commentCount);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim komentar.");
    } finally {
      setSending(false);
    }
  }

  async function hapus(id: string) {
    if (deleting) return;
    setDeleting(id);
    setError(null);
    try {
      const r = await fetch(`/api/guru/berkarya/${artikelId}/comments/${id}`, { method: "DELETE" });
      const res = await r.json();
      if (!r.ok) throw new Error(res?.error || "Gagal menghapus komentar");

      setComments((prev) => (prev ?? []).filter((c) => c.id !== id));
      if (typeof res.commentCount === "number") onCountChange(artikelId, res.commentCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus komentar.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="flex h-[80vh] sm:h-auto sm:max-h-[80vh] w-full sm:max-w-lg flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle size={16} className="shrink-0 text-violet-500" />
            <h3 className="truncate text-sm font-bold text-gray-900">Komentar — {artikelTitle}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!comments ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-violet-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-violet-100 bg-violet-50/40 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-gray-700">Belum ada komentar.</p>
              <p className="mt-1 text-xs text-gray-500">Jadilah guru pertama yang memberi apresiasi.</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                {c.author?.avatar ? (
                  <img src={c.author.avatar} alt={c.author.displayName} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-violet-100" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-xs font-bold text-white ring-2 ring-violet-100">
                    {inisial(c.author?.displayName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-gray-800">{c.author?.displayName || "Guru"}</p>
                    <span className="shrink-0 text-[10px] text-gray-400">{waktuRelatif(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-gray-600">{c.content}</p>
                  {c.isOwner && (
                    <button
                      onClick={() => hapus(c.id)}
                      disabled={deleting === c.id}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {error && <p className="px-5 pb-2 text-xs font-medium text-red-500">{error}</p>}

        <form onSubmit={kirim} className="flex items-center gap-2 border-t border-gray-100 px-5 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Tulis apresiasi Anda…"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Kirim komentar"
            className="rounded-xl bg-violet-600 p-2.5 text-white transition-colors hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
