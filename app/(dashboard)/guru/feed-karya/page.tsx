"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Star, Check } from "lucide-react";
import { IconBolt, IconFlame, IconTarget, IconPen, IconChat, IconHeart, IconEye, IconClock, IconSchool, IconLocation } from "@/lib/icons";
import GuruChatPanel from "@/components/chat/GuruChatPanel";

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType] = useState<string>("");
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const loaderRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [modalKarya, setModalKarya] = useState<Karya | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/me").then(r => r.ok ? r.json() : null).then(d => setUser(d?.user || null));
    fetch("/api/group").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.groups) setGroups(d.groups);
    });
  }, []);

  const fetchKarya = useCallback(async (pageNum: number, type: string, append: boolean) => {
    const params = new URLSearchParams({ page: String(pageNum), limit: "10" });
    if (type) params.set("type", type);
    if (selectedGroupId) params.set("groupId", selectedGroupId);
    const res = await fetch(`/api/siswa/karya?${params}`);
    const data = await res.json();
    const items = data.karya || [];
    setKaryaList(prev => append ? [...prev, ...items] : items);
    // Seed like state from the server so already-liked hearts render red.
    setLikedMap(prev => {
      const n = append ? { ...prev } : ({} as Record<string, boolean>);
      for (const k of items) if (k?.likedByCurrentUser) n[k.id] = true;
      return n;
    });
    setTotalPages(data.totalPages);
    setLoading(false);
    setLoadingMore(false);
  }, [selectedGroupId]);

  useEffect(() => {
    setLoading(true); setKaryaList([]); setPage(1);
    fetchKarya(1, activeType, false);
  }, [activeType, fetchKarya]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && page < totalPages) {
        setLoadingMore(true); setPage(p => p + 1);
        fetchKarya(page + 1, activeType, true);
      }
    }, { threshold: 0.3 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore, activeType, fetchKarya]);

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
  const handleModalComment = async () => {
    if (!modalKarya || !commentText.trim()) return;
    setSubmittingComment(true);
    const res = await fetch(`/api/siswa/karya/${modalKarya.id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments(prev => [data.comment, ...prev]);
      setKaryaList(prev => prev.map(k =>
        k.id === modalKarya.id ? { ...k, _count: { likes: k._count?.likes ?? 0, comments: (k._count?.comments ?? 0) + 1 } } : k
      ) as Karya[]);
      setCommentText("");
    }
    setSubmittingComment(false);
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
      <div className="min-w-0 max-w-2xl w-full">
      {/* ── Header ── */}
      {user && (
        <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl p-5 text-white mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">Karya Siswa</p>
              <p className="text-sm text-emerald-200 mt-0.5">Pantau dan apresiasi karya murid-muridmu</p>
            </div>
            <div className="flex items-center gap-2">
              <IconPen size={18} />
            </div>
          </div>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full"><IconBolt size={14} />{user.xp?.toLocaleString() || 0} XP</span>
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full"><IconFlame size={14} />{user.streak || 0} hr</span>
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full"><IconTarget size={14} />Lv.{user.level || 1}</span>
          </div>
        </div>
      )}

      {/* ── Filter Kelas ── */}
      {groups.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedGroupId}
            onChange={e => setSelectedGroupId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 appearance-none cursor-pointer"
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
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
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
          <div className="animate-spin w-7 h-7 border-[3px] border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : karyaList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <IconPen size={24} className="text-emerald-500" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada karya</p>
          <p className="text-gray-400 text-sm mt-1">Belum ada siswa yang menulis karya</p>
        </div>
      ) : (
        <div className="space-y-4">
          {karyaList.map(karya => {
            const m = TYPE_META[karya.type] || TYPE_META.OPINI;
            const isLiked = likedMap[karya.id];
            return (
            <div key={karya.id} onClick={() => openModal(karya)} className="block bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-emerald-200 transition-all overflow-hidden group cursor-pointer">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                  {karya.isFeatured && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pilihan</span>}
                </div>
                <h2 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-emerald-700 transition-colors mb-2">{karya.title}</h2>
                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed mb-4">
                  {karya.excerpt || karya.content.replace(/<[^>]*>/g, "").slice(0, 200)}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {karya.user.avatar ? <img src={karya.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : karya.user.fullName.charAt(0)}
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
                  <button onClick={(e) => toggleFeatured(karya, e)} disabled={featureLoading === karya.id}
                    className={`flex items-center gap-1 transition-colors ${
                      karya.isFeatured ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"
                    }`}>
                    <Star size={14} fill={karya.isFeatured ? "currentColor" : "none"} />
                    {karya.isFeatured ? "Pilihan" : "Pilih"}
                  </button>
                  <span className="flex items-center gap-1 ml-auto"><IconClock size={14} />{new Date(karya.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            </div>
          );})}
          <div ref={loaderRef} className="flex justify-center py-4">
            {loadingMore && <div className="animate-spin w-6 h-6 border-[3px] border-emerald-500 border-t-transparent rounded-full" />}
          </div>
        </div>
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {modalKarya.user.avatar ? <img src={modalKarya.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : modalKarya.user.fullName.charAt(0)}
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
                <button onClick={(e) => { e.stopPropagation(); toggleFeatured(modalKarya, e); }}
                  disabled={featureLoading === modalKarya.id}
                  className={`ml-auto flex items-center gap-1.5 text-sm font-medium transition-all ${
                    modalKarya.isFeatured ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"
                  }`}>
                  <Star size={18} fill={modalKarya.isFeatured ? "currentColor" : "none"} />
                  {modalKarya.isFeatured ? "Pilihan" : "Tandai Pilihan"}
                </button>
              </div>

              {/* Comment Input */}
              <div className="flex gap-3 mb-4">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Tulis komentar..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none"
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
                <div className="flex justify-center py-6"><div className="animate-spin w-5 h-5 border-[3px] border-emerald-500 border-t-transparent rounded-full" /></div>
              ) : comments.length === 0 ? (
                <p className="text-center py-6 text-gray-400 text-sm">Belum ada komentar</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-300 to-green-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {c.user.avatar ? <img src={c.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : c.user.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 bg-emerald-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900">{c.user.fullName}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
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
    </div>

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

      {/* Right Panel — Chat Kelas */}
      <div className="xl:sticky xl:top-5 min-w-0">
        {user && <GuruChatPanel userId={user.id || user.userId} />}
      </div>
    </div>
  );
}
