"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Megaphone, Paperclip, Clock, CheckCircle2,
  ExternalLink, Link2, X, BookOpen,
} from "lucide-react";

interface Pengumuman {
  id: string;
  judul: string;
  deskripsi: string | null;
  tenggat: string | null;
  lampiran: string | null;
  lampiranNama: string | null;
  createdAt: string;
  group: { id: string; name: string; grade: string };
  teacher: { id: string; fullName: string };
  submission: { id: string; karyaUrl: string; catatan: string | null; submittedAt: string } | null;
}

interface Karya {
  id: string;
  title: string;
  type: string;
  user: { id: string };
}

const TYPE_LABEL: Record<string, string> = {
  PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel",
  ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini",
};

function formatTanggal(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function MuridPengumumanList({ userId }: { userId: string }) {
  const [items, setItems] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Pengumuman | null>(null);
  const [karyas, setKaryas] = useState<Karya[]>([]);
  const [selectedKarya, setSelectedKarya] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [karyaLoading, setKaryaLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/murid/pengumuman");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data?.data || []);
    } catch {
      setError("Gagal memuat pengumuman. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openSubmit = async (p: Pengumuman) => {
    setActive(p);
    setSelectedKarya("");
    setManualUrl(p.submission?.karyaUrl || "");
    setCatatan(p.submission?.catatan || "");
    setError("");
    setKaryaLoading(true);
    try {
      const res = await fetch(`/api/siswa/karya?limit=30`);
      const data = await res.json();
      const mine = (data?.karya || []).filter((k: Karya) => k.user.id === userId);
      setKaryas(mine);
      if (mine.length > 0 && p.submission) {
        const match = mine.find((k: Karya) =>
          `${window.location.origin}/murid/karya/${k.id}` === p.submission?.karyaUrl
        );
        if (match) setSelectedKarya(match.id);
      }
    } catch {
      setKaryas([]);
    } finally {
      setKaryaLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!active || submitting) return;
    const url = selectedKarya
      ? `${window.location.origin}/murid/karya/${selectedKarya}`
      : manualUrl.trim();
    if (!url) {
      setError("Pilih karya kamu atau tempel tautan manual.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/murid/pengumuman/${active.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karyaUrl: url, catatan }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal mengumpulkan. Coba lagi.");
        return;
      }
      setActive(null);
      fetchList();
    } catch {
      setError("Gagal mengumpulkan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {error && !active && (
        <p className="text-xs text-red-500 font-medium mb-3">{error}</p>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Megaphone className="w-10 h-10 text-violet-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-800 text-sm">Belum ada pengumuman</p>
          <p className="text-xs text-gray-400 mt-1">Pengumuman dan tugas dari gurumu akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => {
            const lewat = p.tenggat && new Date(p.tenggat).getTime() < Date.now();
            const done = !!p.submission;
            return (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${done ? "border-emerald-200" : "border-gray-100"}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-semibold">
                    {p.group.name} · {p.group.grade}
                  </span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
                      <CheckCircle2 size={11} /> Terkumpul
                    </span>
                  ) : lewat ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">
                      <Clock size={11} /> Lewat
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">
                      <Clock size={11} /> Belum dikumpul
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-gray-900 text-sm leading-snug">{p.judul}</h3>
                {p.deskripsi && (
                  <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap">{p.deskripsi}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {p.tenggat && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[10px] font-semibold">
                      <Clock size={11} /> Tenggat {formatTanggal(p.tenggat)}
                    </span>
                  )}
                  {p.lampiran && (
                    <a
                      href={p.lampiran}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-semibold hover:bg-sky-100"
                    >
                      <Paperclip size={11} /> {p.lampiranNama || "Lampiran"}
                    </a>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-gray-400">
                    {p.teacher.fullName} · {formatTanggal(p.createdAt)}
                  </p>
                  {done ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={p.submission!.karyaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold hover:underline"
                      >
                        <ExternalLink size={11} /> Karyaku
                      </a>
                      <button
                        onClick={() => openSubmit(p)}
                        className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-[11px] font-semibold hover:bg-violet-100 transition-colors"
                      >
                        Ubah
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openSubmit(p)}
                      className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-[11px] font-semibold hover:bg-violet-700 transition-colors"
                    >
                      Kumpulkan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!submitting) setActive(null); }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900">Kumpulkan Tugas</h3>
                <p className="text-xs text-gray-500 truncate">{active.judul}</p>
              </div>
              <button onClick={() => { if (!submitting) setActive(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {error && <p className="text-xs text-red-500 font-medium mb-3">{error}</p>}

            {/* Karya picker */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Pilih karyamu yang sudah terbit</p>
              {karyaLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                </div>
              ) : karyas.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-400 text-center">
                  Belum ada karya. Tulis dulu karyamu lalu kumpulkan di sini, atau tempel tautan manual.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {karyas.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => { setSelectedKarya(k.id); setManualUrl(""); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-all ${
                        selectedKarya === k.id
                          ? "border-violet-400 bg-violet-50 text-violet-800"
                          : "border-gray-200 hover:border-violet-200 hover:bg-violet-50/50"
                      }`}
                    >
                      <BookOpen size={15} className={selectedKarya === k.id ? "text-violet-500" : "text-gray-400"} />
                      <span className="flex-1 truncate font-medium">{k.title}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{TYPE_LABEL[k.type] || k.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Atau tempel tautan karya manual</p>
              <div className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-violet-200">
                <Link2 size={15} className="text-gray-400 shrink-0" />
                <input
                  value={manualUrl}
                  onChange={(e) => { setManualUrl(e.target.value); setSelectedKarya(""); }}
                  placeholder="https://www.bahasacerdas.com/murid/karya/..."
                  className="flex-1 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Catatan untuk guru (opsional)</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="cth: Ini puisi hasil revisi berdasarkan masukan guru"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActive(null)}
                disabled={submitting}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!selectedKarya && !manualUrl.trim())}
                className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Mengumpulkan..." : "Kumpulkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
