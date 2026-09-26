"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Star, Check, Trash2, Share2, Bookmark, Flag, Trophy, Medal, School as SchoolIcon, BookmarkCheck, Search, Sparkles, Lightbulb, Users, Wand2, ArrowRight } from "lucide-react";
import { IconBolt, IconFlame, IconTarget, IconPen, IconChat, IconHeart, IconEye, IconClock, IconSchool, IconLocation } from "@/lib/icons";

type KaryaType = "PUISI" | "CERPEN" | "ARTIKEL" | "ANEKDOT" | "PANTUN" | "OPINI";

interface Karya {
  id: string; title: string; content: string; excerpt: string;
  type: KaryaType; coverImage?: string; isFeatured: boolean;
  likesCount: number; viewsCount: number; createdAt: string;
  user: { id: string; fullName: string; avatar?: string; profile?: { school?: string; city?: string } };
  _count?: { likes: number; comments: number };
}

interface Comment {
  id: string; content: string; createdAt: string;
  user: { id: string; fullName: string; avatar?: string };
}

const TYPE_META: Record<string, { label: string; badge: string }> = {
  PUISI:    { label: "Puisi",    badge: "bg-rose-100 text-rose-700" },
  CERPEN:   { label: "Cerpen",   badge: "bg-blue-100 text-blue-700" },
  ARTIKEL:  { label: "Artikel",  badge: "bg-amber-100 text-amber-700" },
  ANEKDOT:  { label: "Anekdot",  badge: "bg-orange-100 text-orange-700" },
  PANTUN:   { label: "Pantun",   badge: "bg-teal-100 text-teal-700" },
  OPINI:    { label: "Opini",    badge: "bg-violet-100 text-violet-700" },
};

export default function GuruFeedKaryaPage() {
  const [user, setUser] = useState<any>(null);
  const [karyaList, setKaryaList] = useState<Karya[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType] = useState<string>("");
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Modal state
  const [modalKarya, setModalKarya] = useState<Karya | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // ── Hasil Karya leaderboard ──
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [scope, setScope] = useState("all");
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [reportKarya, setReportKarya] = useState<Karya | null>(null);
  const [reportAlasan, setReportAlasan] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── PUSAT LITERASI state ──
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [aiFeedback, setAiFeedback] = useState<{ open: boolean; loading: boolean; result: any; error: string }>({ open: false, loading: false, result: null, error: "" });
  // Scope feed: "students" = Karya Muridku (monitoring), "global" = Jelajah
  // Indonesia (discovery nasional). Default students — monitoring dulu.
  const [feedScope, setFeedScope] = useState<"students" | "global">("students");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    fetch("/api/user/me").then(r => r.ok ? r.json() : null).then(d => setUser(d?.user || null));
    fetch("/api/group").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.groups) setGroups(d.groups);
    });
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("bc-saved-karya") || "[]");
      const m: Record<string, boolean> = {};
      saved.forEach((id: string) => { m[id] = true; });
      setSavedMap(m);
    } catch { /* kosong */ }
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    const params = new URLSearchParams();
    if (selectedGroupId) params.set("groupId", selectedGroupId);
    fetch(`/api/guru/literasi/stats?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [selectedGroupId]);

  useEffect(() => {
    fetch(`/api/guru/hasil-karya/leaderboard?scope=${scope}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLeaderboard(d); })
      .catch(() => {});
  }, [scope]);

  const fetchKarya = useCallback(async (cursorVal: string | null, type: string, append: boolean) => {
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({ limit: "30" });
      if (type) params.set("type", type);
      if (feedScope === "global") params.set("scope", "global");
      else if (selectedGroupId) params.set("groupId", selectedGroupId);
      if (search.trim()) params.set("q", search.trim());
      if (cursorVal) params.set("cursor", cursorVal);
      const res = await fetch(`/api/siswa/karya?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Gagal memuat karya");
      const data = await res.json();
      const items = Array.isArray(data?.karya) ? data.karya : [];
      setKaryaList(prev => append ? [...prev, ...items] : items);
      setLikedMap(prev => {
        const n = append ? { ...prev } : ({} as Record<string, boolean>);
        for (const k of items) if (k?.likedByCurrentUser) n[k.id] = true;
        return n;
      });
      const more = !!data?.nextCursor;
      setHasMore(more);
      hasMoreRef.current = more;
      if (more) {
        const nc = data.nextCursor;
        setCursor(nc);
        cursorRef.current = nc;
      }
    } catch {
      if (!append) setKaryaList([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [selectedGroupId, search, feedScope]);

  useEffect(() => {
    setLoading(true); setKaryaList([]); setCursor(null); setHasMore(true); hasMoreRef.current = true; cursorRef.current = null;
    fetchKarya(null, activeType, false);
  }, [activeType, fetchKarya]);

  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      if (loadingMoreRef.current) return;
      if (!hasMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      fetchKarya(cursorRef.current, activeType, true);
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeType, fetchKarya]);

  const TYPES = ["", "PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN", "OPINI"];

  // ── Like handler (optimistic + rollback) ──
  const handleLike = async (karyaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasLiked = !!likedMap[karyaId];
    setLikedMap(prev => ({ ...prev, [karyaId]: !wasLiked }));
    setKaryaList(prev => prev.map(k =>
      k.id === karyaId ? { ...k, likesCount: Math.max(0, k.likesCount + (wasLiked ? -1 : 1)) } : k
    ));
    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data.liked === "boolean") setLikedMap(prev => ({ ...prev, [karyaId]: data.liked }));
      if (typeof data.likeCount === "number") {
        setKaryaList(prev => prev.map(k => k.id === karyaId ? { ...k, likesCount: data.likeCount } : k));
      }
    } catch {
      setLikedMap(prev => ({ ...prev, [karyaId]: wasLiked }));
      setKaryaList(prev => prev.map(k =>
        k.id === karyaId ? { ...k, likesCount: Math.max(0, k.likesCount + (wasLiked ? 1 : -1)) } : k
      ));
    }
  };

  // ── Open modal ──
  const openModal = async (k: Karya) => {
    setModalKarya(k);
    setModalLoading(true);
    setCommentText("");
    try {
      const res = await fetch(`/api/siswa/karya/${k.id}`);
      const d = await res.json();
      if (d?.karya) {
        setComments(d.karya.comments || []);
      }
    } catch {}
    setModalLoading(false);
  };

  const closeModal = () => {
    setModalKarya(null);
    setComments([]);
  };

  // ── Like in modal ──
  const handleModalLike = async () => {
    if (!modalKarya) return;
    const res = await fetch(`/api/siswa/karya/${modalKarya.id}/like`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setLikedMap(prev => ({ ...prev, [modalKarya.id]: data.liked }));
    setModalKarya(prev => prev ? { ...prev, likesCount: prev.likesCount + (data.liked ? 1 : -1) } : prev);
    setKaryaList(prev => prev.map(k =>
      k.id === modalKarya.id ? { ...k, likesCount: k.likesCount + (data.liked ? 1 : -1) } : k
    ));
  };

  // ── Comment in modal ──
  // Optimistic, like CommentSection: render the comment straight away and swap
  // in the server copy on success, roll back on failure.
  const handleModalComment = async () => {
    const text = commentText.trim();
    if (!modalKarya || !text || submittingComment) return;
    setSubmittingComment(true);

    const karyaId = modalKarya.id;
    const optimistic: Comment = {
      id: `temp-${Date.now()}`,
      content: text,
      createdAt: new Date().toISOString(),
      user: { id: "", fullName: "" },
    };
    const bumpCount = (delta: number) =>
      setKaryaList(prev => prev.map(k =>
        k.id === karyaId ? { ...k, _count: { likes: k._count?.likes ?? 0, comments: (k._count?.comments ?? 0) + delta } } : k
      ) as Karya[]);

    setComments(prev => [optimistic, ...prev]);
    bumpCount(1);
    setCommentText("");

    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error("gagal");
      const data = await res.json();
      setComments(prev => prev.map(c => (c.id === optimistic.id ? data.comment : c)));
    } catch {
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      bumpCount(-1);
      setCommentText(text);
    }
    setSubmittingComment(false);
  };

  // ── Hapus komentar (screening guru) ──
  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId) return;
    if (!confirm("Hapus komentar ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(`/api/guru/karya-comment/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        if (modalKarya) {
          setKaryaList(prev => prev.map(k =>
            k.id === modalKarya.id
              ? { ...k, _count: { likes: k._count?.likes ?? 0, comments: Math.max(0, (k._count?.comments ?? 1) - 1) } }
              : k
          ) as Karya[]);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Gagal menghapus komentar");
      }
    } catch {
      alert("Gagal menghapus komentar");
    }
    setDeletingCommentId(null);
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [commentText]);

  // ── Grading state ──
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [nilaiModal, setNilaiModal] = useState<{ karya: Karya; open: boolean } | null>(null);
  const [nilaiSkor, setNilaiSkor] = useState("");
  const [nilaiKategoriId, setNilaiKategoriId] = useState("");
  const [nilaiKeterangan, setNilaiKeterangan] = useState("");
  const [savingNilai, setSavingNilai] = useState(false);
  const [featureLoading, setFeatureLoading] = useState<string | null>(null);

  const toggleFeatured = async (karya: Karya, e: React.MouseEvent) => {
    e.stopPropagation();
    setFeatureLoading(karya.id);
    try {
      const res = await fetch(`/api/siswa/karya/${karya.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !karya.isFeatured }),
      });
      if (res.ok) {
        const data = await res.json();
        setKaryaList(prev => prev.map(k =>
          k.id === karya.id ? { ...k, isFeatured: data.karya.isFeatured } : k
        ));
        setModalKarya(prev => prev?.id === karya.id ? { ...prev, isFeatured: data.karya.isFeatured } : prev);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Gagal mengubah status pilihan");
      }
    } catch {
      alert("Gagal mengubah status pilihan");
    }
    setFeatureLoading(null);
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetch(`/api/guru/nilai-kategori?groupId=${selectedGroupId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setKategoris(d?.kategori || []));
    } else {
      setKategoris([]);
    }
  }, [selectedGroupId]);

  const openNilaiModal = (k: Karya, e: React.MouseEvent) => {
    e.stopPropagation();
    setNilaiModal({ karya: k, open: true });
    setNilaiSkor("");
    setNilaiKategoriId(kategoris[0]?.id || "");
    setNilaiKeterangan(`Dari karya: ${k.title}`);
  };

  const handleSaveNilai = async () => {
    if (!nilaiModal || !nilaiSkor || !nilaiKategoriId) return;
    const skor = parseInt(nilaiSkor);
    if (isNaN(skor) || skor < 0 || skor > 100) return;

    setSavingNilai(true);
    await fetch("/api/guru/nilai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: nilaiModal.karya.user.id,
        groupId: selectedGroupId,
        kategoriId: nilaiKategoriId,
        skor,
        sumberType: "KARYA",
        sumberId: nilaiModal.karya.id,
        keterangan: nilaiKeterangan || null,
      }),
    });
    setSavingNilai(false);
    setNilaiModal(null);
  };

  // ── Bagikan / Simpan / Laporkan ──
  const shareKarya = (k: Karya, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/murid/karya/${k.id}`;
    const text = `Karya "${k.title}" oleh ${k.user.fullName} di BahasaCerdas`;
    if (navigator.share) {
      navigator.share({ title: k.title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {});
      setToast(`Tautan ${k.title} disalin!`);
    }
  };

  const toggleSave = (k: Karya, e: React.MouseEvent) => {
    e.stopPropagation();
    let saved: string[];
    try { saved = JSON.parse(localStorage.getItem("bc-saved-karya") || "[]"); } catch { saved = []; }
    const idx = saved.indexOf(k.id);
    if (idx >= 0) saved = saved.filter(x => x !== k.id);
    else saved.push(k.id);
    localStorage.setItem("bc-saved-karya", JSON.stringify(saved));
    setSavedMap(prev => ({ ...prev, [k.id]: idx < 0 }));
  };

  const submitReport = async () => {
    if (!reportKarya || reportSending) return;
    setReportSending(true);
    try {
      await fetch(`/api/siswa/karya/${reportKarya.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan: reportAlasan }),
      });
      setToast("Laporan terkirim ke tim BahasaCerdas. Terima kasih!");
      setReportKarya(null);
      setReportAlasan("");
    } catch {
      setToast("Gagal mengirim laporan. Coba lagi.");
    } finally {
      setReportSending(false);
    }
  };

  // ── Umpan balik AI untuk karya murid (reuse feedback-agent, tanpa menyimpan riwayat) ──
  const handleAIFeedback = async (k: Karya) => {
    if (aiFeedback.loading) return;
    setAiFeedback({ open: true, loading: true, result: null, error: "" });
    try {
      const plain = (k.content || "").replace(/<[^>]*>/g, "").slice(0, 6000);
      const res = await fetch("/api/ai/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "feedback",
          input: { text: plain, tone: "ramah", includeRevisionTips: true },
          saveToHistory: false,
          outputFormat: "json",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAiFeedback({ open: true, loading: false, result: null, error: data.error || "Gagal membuat umpan balik. Coba lagi." });
        return;
      }
      setAiFeedback({ open: true, loading: false, result: data.output || data.text || null, error: "" });
    } catch {
      setAiFeedback({ open: true, loading: false, result: null, error: "Gagal membuat umpan balik. Coba lagi." });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      {user && (
        <div className="bc-guru-hero rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-lg">Pusat Literasi</p>
              <p className="text-sm text-blue-100 mt-0.5">Pantau, apresiasi, dan banggakan karya literasi murid-muridmu</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <IconPen size={18} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full"><IconBolt size={14} />{user.xp?.toLocaleString() || 0} XP</span>
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full"><IconFlame size={14} />{user.streak || 0} hr</span>
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full"><IconTarget size={14} />Lv.{user.level || 1}</span>
            {stats?.mingguIni && (
              <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full">
                <IconPen size={14} />{stats.mingguIni.karya} karya minggu ini
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Statistik ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Karya", value: stats?.total?.karya ?? "–", icon: <IconPen size={16} />, tint: "bg-blue-50 text-blue-600" },
          { label: "Penulis", value: stats?.total?.penulis ?? "–", icon: <Users size={16} />, tint: "bg-violet-100 text-violet-600" },
          { label: "Apresiasi", value: stats?.total?.likes ?? "–", icon: <IconHeart size={16} />, tint: "bg-rose-100 text-rose-500" },
          { label: "Dibaca", value: stats?.total?.views ?? "–", icon: <IconEye size={16} />, tint: "bg-sky-100 text-sky-600" },
        ].map((s, i) => (
          <div key={i} className="bc-guru-card rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.tint} mb-2`}>{s.icon}</div>
            <p className="text-xl font-bold text-gray-900 leading-none">{typeof s.value === "number" ? s.value.toLocaleString("id-ID") : s.value}</p>
            <p className="text-[11px] text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Karya Terbaru ── */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Sparkles size={16} className="text-blue-700" /> Karya Terbaru</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari judul, isi, atau penulis..."
              className="w-56 pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* ── Scope Feed: Discovery Nasional vs Monitoring Murid ── */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFeedScope("students")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              feedScope === "students"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200/60"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🏫 Karya Muridku
          </button>
          <button
            onClick={() => setFeedScope("global")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              feedScope === "global"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200/60"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🌎 Jelajah Indonesia
          </button>
        </div>

      {/* ── Filter Kelas (hanya untuk Karya Muridku) ── */}
      {feedScope === "students" && groups.length > 0 && (
        <div className="mb-3">
          <select
            value={selectedGroupId}
            onChange={e => setSelectedGroupId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px',
            }}
          >
            <option value="">Semua Kelas</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.grade}) — {g._count?.members || g.members?.length || 0} murid</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Kategori ── */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {TYPES.map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeType === type
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200/60"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {TYPE_META[type]?.label || type || "Semua"}
          </button>
        ))}
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-7 h-7 border-[3px] border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : karyaList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <IconPen size={24} className="text-emerald-500" />
          </div>
          {feedScope === "students" ? (
            <>
              <p className="text-gray-500 font-medium">Belum ada karya dari muridmu.</p>
              <p className="text-gray-400 text-sm mt-1">Ajak muridmu menulis, atau jelajahi karya murid Indonesia.</p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setFeedScope("global")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                >
                  Jelajahi karya murid Indonesia →
                </button>
                <Link
                  href="/guru/kelasku"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  Ajak muridmu berkarya →
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-500 font-medium">Belum ada karya dari murid Indonesia.</p>
              <p className="text-gray-400 text-sm mt-1">Karya murid dari seluruh Indonesia akan muncul di sini.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {karyaList.map(karya => {
            const m = TYPE_META[karya.type] || TYPE_META.OPINI;
            const isLiked = likedMap[karya.id];
            return (
            <div key={karya.id} onClick={() => openModal(karya)} className="bc-guru-card block rounded-xl hover:shadow-lg transition-all overflow-hidden group cursor-pointer">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                  {karya.isFeatured && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-0.5"><Star size={9} /> Pilihan Kelas</span>}
                  {karya.likesCount >= 20 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-0.5">🔥 Sedang Ramai</span>}
                  {leaderboard?.topCreator && leaderboard.topCreator.user.id === karya.user.id && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-0.5"><Trophy size={9} /> Penulis Terbaik</span>
                  )}
                </div>
                <h2 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-blue-700 transition-colors mb-2">{karya.title}</h2>
                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed mb-4">
                  {karya.excerpt || karya.content.replace(/<[^>]*>/g, "").slice(0, 200)}
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    <span className="relative z-0">{karya.user.fullName.charAt(0)}</span>
                    {karya.user.avatar && (
                      <img src={karya.user.avatar} alt="" className="absolute inset-0 z-10 w-full h-full rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <span className="font-semibold text-gray-800">{karya.user.fullName}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-400">{karya.user.profile?.school ? karya.user.profile.school.split(" ").slice(0, 2).join(" ") : "Siswa"}</span>
                    {karya.user.profile?.city && <span className="text-gray-300 mx-1">·</span>}
                    {karya.user.profile?.city && <span className="text-gray-400">{karya.user.profile.city}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                  <button onClick={(e) => handleLike(karya.id, e)}
                    className={`flex items-center gap-1 transition-colors ${isLiked ? "text-red-500" : "hover:text-red-500"}`}
                  >
                    <IconHeart size={14} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-500" : "text-gray-400"} />
                    {karya.likesCount}
                  </button>
                  <span className="flex items-center gap-1" onClick={(e) => { e.stopPropagation(); openModal(karya); }}>
                    <IconChat size={14} />{karya._count?.comments || 0}
                  </span>
                  <span className="flex items-center gap-1"><IconEye size={14} />{karya.viewsCount}</span>
                  {selectedGroupId && kategoris.length > 0 && (
                    <button onClick={(e) => openNilaiModal(karya, e)}
                      className="flex items-center gap-1 text-amber-500 hover:text-amber-600 transition-colors">
                      <Star size={14} /> Nilai
                    </button>
                  )}
                  <button onClick={(e) => shareKarya(karya, e)}
                    className="flex items-center gap-1 hover:text-blue-700 transition-colors" title="Bagikan">
                    <Share2 size={14} /> Bagikan
                  </button>
                  <button onClick={(e) => toggleSave(karya, e)}
                    className={`flex items-center gap-1 transition-colors ${savedMap[karya.id] ? "text-sky-600" : "hover:text-sky-600"}`} title="Simpan">
                    {savedMap[karya.id] ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {savedMap[karya.id] ? "Tersimpan" : "Simpan"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setReportKarya(karya); }}
                    className="flex items-center gap-1 hover:text-red-600 transition-colors text-gray-300" title="Laporkan">
                    <Flag size={14} /> Laporkan
                  </button>
                  <span className="flex items-center gap-1 ml-auto"><IconClock size={14} />{new Date(karya.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            </div>
          );})}
          <div ref={loaderRef} className="flex justify-center py-4">
            {loadingMore && <div className="animate-spin w-6 h-6 border-[3px] border-blue-500 border-t-transparent rounded-full" />}
          </div>
        </div>
      )}
      </section>

      {/* ── Pilihan AI ── */}
      <section>
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Wand2 size={16} className="text-violet-600" /> Pilihan AI</h2>
        {statsLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin w-6 h-6 border-[3px] border-violet-500 border-t-transparent rounded-full" /></div>
        ) : !stats?.pilihanAI?.length ? (
          <p className="text-sm text-gray-400 py-6 text-center bg-white rounded-2xl border border-gray-100">Belum ada rekomendasi. Ajak muridmu berkarya dulu.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.pilihanAI.map((k: any) => (
              <button key={k.id} onClick={() => { const mapped = karyaList.find(x => x.id === k.id); if (mapped) openModal(mapped); }}
                className="text-left bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all p-4 group">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${(TYPE_META[k.type] || TYPE_META.OPINI).badge}`}>{TYPE_META[k.type]?.label || k.type}</span>
                  {k.isFeatured && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-0.5"><Star size={9} /> Pilihan Kelas</span>}
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-violet-700 line-clamp-2">{k.title}</p>
                <p className="text-[11px] text-gray-400 mt-1 truncate">{k.user.fullName}{k.user.school ? ` · ${k.user.school}` : ""}</p>
                <p className="text-[10px] text-gray-400 mt-1.5">{k.alasan}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Paling Banyak Diapresiasi ── */}
      <section>
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><IconHeart size={16} className="text-rose-500" /> Paling Banyak Diapresiasi</h2>
        {!stats?.palingPopuler?.length ? (
          <p className="text-sm text-gray-400 py-6 text-center bg-white rounded-2xl border border-gray-100">Belum ada karya yang diapresiasi.</p>
        ) : (
          <div className="space-y-2">
            {stats.palingPopuler.map((k: any, i: number) => (
              <button key={k.id} onClick={() => { const mapped = karyaList.find(x => x.id === k.id); if (mapped) openModal(mapped); }}
                className="w-full text-left flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-rose-200 hover:shadow-md transition-all">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{k.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">{k.user.fullName} · {TYPE_META[k.type]?.label || k.type}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400 shrink-0">
                  <span className="flex items-center gap-0.5"><IconHeart size={11} className="text-rose-400" />{k.likesCount}</span>
                  <span className="flex items-center gap-0.5"><IconChat size={11} className="text-emerald-400" />{k.commentsCount}</span>
                  <span className="flex items-center gap-0.5"><IconEye size={11} className="text-sky-400" />{k.viewsCount}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Apresiasi Minggu Ini ── */}
      {leaderboard && (
        <section>
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Trophy size={16} className="text-amber-500" /> Apresiasi Minggu Ini</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-15"><Trophy size={130} /></div>
              {leaderboard.topCreator ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-100 flex items-center gap-1.5"><Trophy size={13} /> Penulis Terbaik Minggu Ini</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="relative w-14 h-14 rounded-full bg-white/20 ring-2 ring-white/60 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      <span className="relative z-0">{leaderboard.topCreator.user.fullName.charAt(0)}</span>
                      {leaderboard.topCreator.user.avatar && (
                        <img src={leaderboard.topCreator.user.avatar} alt="" className="absolute inset-0 z-10 w-full h-full rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-lg leading-tight truncate">{leaderboard.topCreator.user.fullName}</p>
                      <p className="text-xs text-amber-100 truncate">{leaderboard.topCreator.user.school || "Siswa BahasaCerdas"}</p>
                      <p className="text-[11px] text-amber-50/90 mt-0.5 truncate">"{leaderboard.topCreator.karya.title}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full"><IconHeart size={12} /> {leaderboard.topCreator.likes} like</span>
                    <span className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full"><IconChat size={12} /> {leaderboard.topCreator.comments} komentar</span>
                    <span className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full"><Medal size={12} /> Lv.{leaderboard.topCreator.user.level}</span>
                    <span className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full"><Trophy size={12} /> {leaderboard.topCreator.user.rankTitle}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/murid/karya/${leaderboard.topCreator.karya.id}`; }}
                    className="mt-3 text-[11px] font-semibold bg-white/25 hover:bg-white/40 transition-colors px-3 py-1.5 rounded-full"
                  >
                    Buka karyanya →
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-100 flex items-center gap-1.5"><Trophy size={13} /> Penulis Terbaik Minggu Ini</p>
                  <p className="text-sm mt-3 text-amber-50">Belum ada karya minggu ini. Ajak muridmu berkarya!</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-3"><SchoolIcon size={15} className="text-blue-700" /> Sekolah Paling Aktif</p>
              {leaderboard.topSchools.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data minggu ini.</p>
              ) : (
                <div className="space-y-2.5">
                  {leaderboard.topSchools.slice(0, 5).map((s: any) => (
                    <div key={s.school} className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.rank === 1 ? "bg-amber-100 text-amber-700" : s.rank === 2 ? "bg-slate-200 text-slate-600" : s.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{s.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{s.school}</p>
                        <p className="text-[10px] text-gray-400">{s.karyaCount} karya · {s.likeCount} like · {s.commentCount} komentar</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="font-bold text-sm text-gray-900 flex items-center gap-2"><Trophy size={15} className="text-amber-500" /> Peringkat Penulis</p>
                <div className="flex gap-1 overflow-x-auto">
                  {[["all", "Semua"], ["school", "Sekolah Saya"], ["city", "Kabupaten"], ["province", "Provinsi"], ["country", "Indonesia"]].map(([val, label]) => (
                    <button key={val} onClick={() => setScope(val)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${scope === val ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {leaderboard.leaderboard.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Belum ada karya di lingkup ini minggu ini.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.leaderboard.slice(0, 8).map((c: any) => (
                    <div key={c.user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${c.rank === 1 ? "bg-amber-400 text-white" : c.rank === 2 ? "bg-slate-400 text-white" : c.rank === 3 ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-500"}`}>{c.rank}</span>
                      <div className="relative w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-[10px] font-bold shrink-0">
                        <span className="relative z-0">{c.user.fullName.charAt(0)}</span>
                        {c.user.avatar && <img src={c.user.avatar} alt="" className="absolute inset-0 z-10 w-full h-full rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{c.user.fullName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{c.user.school || "Siswa"} · "{c.karya.title}"</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 shrink-0">
                        <span className="flex items-center gap-0.5"><IconHeart size={10} className="text-rose-400" />{c.likes}</span>
                        <span className="flex items-center gap-0.5"><IconChat size={10} className="text-emerald-400" />{c.comments}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-3"><Medal size={15} className="text-violet-500" /> Guru Penggerak Literasi</p>
              {leaderboard.topTeachers.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada karya dari kelasmu minggu ini.</p>
              ) : (
                <div className="space-y-2.5">
                  {leaderboard.topTeachers.slice(0, 5).map((s: any) => (
                    <div key={s.school} className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.rank === 1 ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"}`}>{s.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{s.school}</p>
                        <p className="text-[10px] text-gray-400">{s.muridKarya} karya murid · {s.likeCount} like · {s.commentCount} komentar</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Penulis Teraktif ── */}
      <section>
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Users size={16} className="text-blue-700" /> Penulis Teraktif</h2>
        {!stats?.penulisTeraktif?.length ? (
          <p className="text-sm text-gray-400 py-6 text-center bg-white rounded-2xl border border-gray-100">Belum ada penulis di kelasmu.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stats.penulisTeraktif.map((p: any) => (
              <div key={p.user.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${p.rank === 1 ? "bg-emerald-500 text-white" : p.rank === 2 ? "bg-slate-400 text-white" : p.rank === 3 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"}`}>{p.rank}</span>
                <div className="relative w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-[10px] font-bold shrink-0">
                  <span className="relative z-0">{p.user.fullName.charAt(0)}</span>
                  {p.user.avatar && <img src={p.user.avatar} alt="" className="absolute inset-0 z-10 w-full h-full rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.user.fullName}</p>
                  <p className="text-[10px] text-gray-400 truncate">{p.user.school || "Siswa"} · {p.user.rankTitle}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 shrink-0">
                  <span className="flex items-center gap-0.5"><IconPen size={10} className="text-emerald-500" />{p.karya}</span>
                  <span className="flex items-center gap-0.5"><IconHeart size={10} className="text-rose-400" />{p.likes}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Tantangan Literasi ── */}
      {stats?.challenge && (
        <section>
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-20"><Trophy size={100} /></div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-violet-200 flex items-center gap-1.5"><Trophy size={13} /> Tantangan Literasi · {stats.challenge.weekLabel}</p>
            <h2 className="font-bold text-lg mt-1.5">{stats.challenge.theme}</h2>
            <p className="text-sm text-violet-100 mt-1 max-w-md">{stats.challenge.prompt}</p>
            <p className="text-xs text-violet-200 mt-3">Karya pertama pemenang tantangan mendapat koin bonus.</p>
            <a href="/guru/kelasku" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors px-3.5 py-2 rounded-full">
              Ajak Kelas Ikut <ArrowRight size={12} />
            </a>
          </div>
        </section>
      )}

      {/* ── Wawasan AI ── */}
      {stats?.insight?.length > 0 && (
        <section>
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Lightbulb size={16} className="text-amber-500" /> Wawasan AI</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2.5">
            {stats.insight.map((t: string, i: number) => (
              <p key={i} className="text-sm text-gray-700 flex items-start gap-2"><Sparkles size={14} className="text-amber-400 mt-0.5 shrink-0" />{t}</p>
            ))}
          </div>
        </section>
      )}

      {/* ── Rekomendasi ── */}
      {stats?.rekomendasi?.length > 0 && (
        <section>
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Wand2 size={16} className="text-blue-700" /> Rekomendasi untuk Guru</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.rekomendasi.map((r: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  {r.icon === "trophy" ? <Trophy size={16} /> : r.icon === "users" ? <Users size={16} /> : r.icon === "star" ? <Star size={16} /> : <IconPen size={16} />}
                </div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{r.judul}</p>
                <p className="text-xs text-gray-500 mt-1 flex-1">{r.deskripsi}</p>
                {r.href && <a href={r.href} className="mt-2.5 text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1">Buka <ArrowRight size={11} /></a>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ MODAL ═══ */}
      {modalKarya && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 overflow-y-auto" onClick={closeModal}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button onClick={closeModal} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center z-10">
              <X size={16} className="text-gray-500" />
            </button>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {/* Author row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  <span className="relative z-0">{modalKarya.user.fullName.charAt(0)}</span>
                  {modalKarya.user.avatar && (
                    <img src={modalKarya.user.avatar} alt="" className="absolute inset-0 z-10 w-full h-full rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{modalKarya.user.fullName}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    {modalKarya.user.profile?.school && <>
                      <IconSchool size={11} />{modalKarya.user.profile.school}
                    </>}
                    {modalKarya.user.profile?.city && <>
                      <span className="mx-0.5">·</span>
                      <IconLocation size={11} />{modalKarya.user.profile.city}
                    </>}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400"><IconClock size={11} className="inline mr-0.5" />{new Date(modalKarya.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
              </div>

              {/* Type badge */}
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-3 ${(TYPE_META[modalKarya.type] || TYPE_META.OPINI).badge}`}>
                {TYPE_META[modalKarya.type]?.label || modalKarya.type}
              </span>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{modalKarya.title}</h2>

              {/* Content */}
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-5">
                {modalKarya.content}
              </div>

              {/* Action row */}
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100">
                <button onClick={handleModalLike}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-all ${
                    likedMap[modalKarya.id] ? "text-red-500" : "text-gray-400 hover:text-red-500"
                  }`}
                >
                  <IconHeart size={18} fill={likedMap[modalKarya.id] ? "currentColor" : "none"} className={likedMap[modalKarya.id] ? "text-red-500" : "text-gray-400"} />
                  {modalKarya.likesCount}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <IconChat size={18} />{comments.length}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <IconEye size={18} />{modalKarya.viewsCount}
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleAIFeedback(modalKarya); }}
                  disabled={aiFeedback.loading}
                  className={`ml-auto flex items-center gap-1.5 text-sm font-medium transition-all ${aiFeedback.loading ? "text-gray-300" : "text-violet-600 hover:text-violet-700"}`}>
                  {aiFeedback.loading ? <div className="animate-spin w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full" /> : <Wand2 size={16} />}
                  Umpan Balik AI
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleFeatured(modalKarya, e); }}
                  disabled={featureLoading === modalKarya.id}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-all ${
                    modalKarya.isFeatured ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"
                  }`}>
                  <Star size={18} fill={modalKarya.isFeatured ? "currentColor" : "none"} />
                  {modalKarya.isFeatured ? "Pilihan" : "Tandai Pilihan"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setReportKarya(modalKarya); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-red-600 transition-colors" title="Laporkan">
                  <Flag size={18} />
                </button>
              </div>

              {/* Umpan Balik AI */}
              {aiFeedback.open && (
                <div className="mb-5 p-4 rounded-xl border border-violet-200 bg-violet-50/60">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 size={15} className="text-violet-600" />
                    <p className="text-sm font-bold text-violet-700">Umpan Balik AI</p>
                    <button onClick={() => setAiFeedback({ open: false, loading: false, result: null, error: "" })}
                      className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  {aiFeedback.loading ? (
                    <div className="flex items-center gap-2 text-sm text-violet-600 py-2">
                      <div className="animate-spin w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full" />
                      Menganalisis karya murid...
                    </div>
                  ) : aiFeedback.error ? (
                    <p className="text-sm text-red-600">{aiFeedback.error}</p>
                  ) : aiFeedback.result ? (
                    <div className="space-y-3 text-sm text-gray-700">
                      {typeof aiFeedback.result === "object" && aiFeedback.result.overallFeedback && (
                        <p className="font-medium text-gray-800">{aiFeedback.result.overallFeedback}</p>
                      )}
                      {typeof aiFeedback.result === "object" && Array.isArray(aiFeedback.result.strengths) && aiFeedback.result.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-blue-700 mb-1">Kekuatan</p>
                          <ul className="space-y-1 list-disc pl-4">
                            {aiFeedback.result.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {typeof aiFeedback.result === "object" && Array.isArray(aiFeedback.result.areasToImprove) && aiFeedback.result.areasToImprove.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-amber-700 mb-1">Area yang Bisa Ditingkatkan</p>
                          <ul className="space-y-1 list-disc pl-4">
                            {aiFeedback.result.areasToImprove.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {typeof aiFeedback.result === "object" && Array.isArray(aiFeedback.result.revisionTips) && aiFeedback.result.revisionTips.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-violet-700 mb-1">Tips Perbaikan</p>
                          <ul className="space-y-1 list-disc pl-4">
                            {aiFeedback.result.revisionTips.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {typeof aiFeedback.result === "string" && <p className="whitespace-pre-wrap">{aiFeedback.result}</p>}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Comment Input */}
              <div className="flex gap-3 mb-4">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Tulis komentar..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleModalComment();
                    }
                  }}
                />
                <button onClick={handleModalComment} disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
                  {submittingComment ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send size={16} />}
                </button>
              </div>

              {/* Comments */}
              {modalLoading ? (
                <div className="flex justify-center py-6"><div className="animate-spin w-5 h-5 border-[3px] border-blue-500 border-t-transparent rounded-full" /></div>
              ) : comments.length === 0 ? (
                <p className="text-center py-6 text-gray-400 text-sm">Belum ada komentar</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      {c.user.id && !c.id.startsWith("temp-") ? (
                        <Link href={`/profile/${c.user.id}`} className="relative w-7 h-7 rounded-full bg-gradient-to-br from-emerald-300 to-green-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0 hover:ring-2 hover:ring-emerald-300 transition-all">
                          <span className="relative z-0">{c.user.fullName.charAt(0)}</span>
                          {c.user.avatar && (
                            <img src={c.user.avatar} alt="" className="absolute inset-0 z-10 w-full h-full rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                          )}
                        </Link>
                      ) : (
                        <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-emerald-300 to-green-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          <span className="relative z-0">{c.user.fullName.charAt(0)}</span>
                          {c.user.avatar && (
                            <img src={c.user.avatar} alt="" className="absolute inset-0 z-10 w-full h-full rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                          )}
                        </div>
                      )}
                      <div className="flex-1 bg-emerald-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          {c.user.id && !c.id.startsWith("temp-") ? (
                            <Link href={`/profile/${c.user.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition-colors">{c.user.fullName}</Link>
                          ) : (
                            <span className="text-sm font-semibold text-gray-900">{c.user.fullName}</span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            disabled={deletingCommentId === c.id}
                            title="Hapus komentar (screening)"
                            aria-label="Hapus komentar"
                            className="ml-auto text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors shrink-0"
                          >
                            {deletingCommentId === c.id
                              ? <div className="animate-spin w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ NILAI MODAL ═══ */}
      {nilaiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setNilaiModal(null)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => setNilaiModal(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Nilai Karya</h3>
            <p className="text-sm text-gray-500 mb-5 line-clamp-1">{nilaiModal.karya.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Siswa</label>
                <p className="text-sm font-medium text-gray-800">{nilaiModal.karya.user.fullName}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Kategori</label>
                <select value={nilaiKategoriId} onChange={e => setNilaiKategoriId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  {kategoris.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Skor (0-100)</label>
                <input type="number" value={nilaiSkor} onChange={e => setNilaiSkor(e.target.value)}
                  min={0} max={100} placeholder="85"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
              </div>
              <button onClick={handleSaveNilai} disabled={savingNilai || !nilaiSkor}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {savingNilai ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Check size={16} />}
                Simpan Nilai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LAPOR MODAL ═══ */}
      {reportKarya && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReportKarya(null)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => setReportKarya(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
            <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2"><Flag size={18} className="text-red-500" /> Laporkan Karya</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-1">{reportKarya.title}</p>
            <textarea
              value={reportAlasan}
              onChange={e => setReportAlasan(e.target.value)}
              rows={4}
              placeholder="Jelaskan alasan pelaporan (opsional)..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
            />
            <button onClick={submitReport} disabled={reportSending}
              className="mt-3 w-full py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {reportSending ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Flag size={14} />}
              Kirim Laporan
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[70] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
