"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, Plus, ChevronLeft, MapPin, Shield, Globe, BookOpen, UserPlus, CheckCircle, Edit2, X, Upload, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COMMUNITY_TYPES = [
  { value: "", label: "Semua Tipe" },
  { value: "MGMP", label: "MGMP" },
  { value: "KKG", label: "KKG" },
  { value: "PUBLIKASI", label: "Publikasi" },
  { value: "STUDY_GROUP", label: "Kelompok Belajar" },
  { value: "LAINNYA", label: "Lainnya" },
];

interface Community {
  id: string;
  name: string;
  description: string | null;
  type: string;
  region: string | null;
  province: string | null;
  city: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  status?: string;
  reviewNote?: string | null;
  memberCount: number;
  postCount: number;
  creator: { fullName: string; avatar: string | null } | null;
  createdAt: string;
}

type MyTab = "public" | "mine";

export default function KomunitasPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    type: "MGMP",
    region: "",
    province: "",
    city: "",
  });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [myTab, setMyTab] = useState<MyTab>("public");
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [editCommunity, setEditCommunity] = useState<Community | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", province: "", city: "", region: "", school: "" });
  const [editAttachments, setEditAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/komunitas?${params.toString()}`);
      const data = await res.json();
      if (data.communities) setCommunities(data.communities);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCommunities = async () => {
    try {
      const res = await fetch("/api/komunitas/mine");
      const data = await res.json();
      if (data.communities) setMyCommunities(data.communities);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCommunities();
    fetchMyCommunities();
  }, [typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      const res = await fetch("/api/komunitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.community) {
        setCreateMsg(data.message || "Komunitas berhasil dibuat, menunggu review admin");
        setShowCreate(false);
        setCreateForm({ name: "", description: "", type: "MGMP", region: "", province: "", city: "" });
      } else if (data.error) {
        setCreateMsg(data.error);
      }
    } catch (e) {
      setCreateMsg("Gagal membuat komunitas");
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (c: Community) => {
    setEditCommunity(c);
    setEditForm({
      name: c.name,
      description: c.description || "",
      province: c.province || "",
      city: c.city || "",
      region: c.region || "",
      school: "",
    });
    const existingAttachments = (c as any).attachments;
    setEditAttachments(Array.isArray(existingAttachments) ? existingAttachments : []);
    setEditMsg("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editCommunity) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/image", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) {
          setEditAttachments((prev) => [...prev, { url: data.url, name: file.name, type: file.type.startsWith("image/") ? "image" : "pdf" }]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setEditAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCommunity) return;
    setEditing(true);
    setEditMsg("");
    try {
      const res = await fetch(`/api/komunitas/${editCommunity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, attachments: editAttachments }),
      });
      const data = await res.json();
      if (data.community) {
        setEditMsg("Komunitas berhasil diperbarui");
        setMyCommunities((prev) => prev.map((c) => c.id === editCommunity.id ? { ...c, ...data.community } : c));
        setTimeout(() => { setEditCommunity(null); fetchMyCommunities(); }, 1500);
      } else if (data.error) {
        setEditMsg(data.error);
      }
    } catch (e) {
      setEditMsg("Gagal memperbarui komunitas");
      console.error(e);
    } finally {
      setEditing(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "MGMP": return <Shield className="w-4 h-4" />;
      case "KKG": return <Users className="w-4 h-4" />;
      case "PUBLIKASI": return <BookOpen className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MGMP": return "bg-blue-100 text-blue-700 border-blue-200";
      case "KKG": return "bg-blue-100 text-blue-700 border-blue-200";
      case "PUBLIKASI": return "bg-amber-100 text-amber-700 border-amber-200";
      case "STUDY_GROUP": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru/beranda" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            Komunitas Guru
          </h1>
          <p className="text-sm text-slate-500">Bergabung dengan MGMP, KKG, dan komunitas Bahasa Indonesia lainnya</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCommunities()}
            placeholder="Cari komunitas..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {COMMUNITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Button onClick={() => setShowCreate(true)} className="h-11 bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Buat Komunitas
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setMyTab("public")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${myTab === "public" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Semua Komunitas ({communities.length})
        </button>
        <button onClick={() => setMyTab("mine")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${myTab === "mine" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Komunitas Saya ({myCommunities.length})
        </button>
      </div>

      {/* Public Communities */}
      {myTab === "public" && (
        loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Memuat komunitas...</p>
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-600 mb-2">Belum ada komunitas</h3>
            <p className="text-sm text-slate-400 mb-4">Jadilah yang pertama membuat komunitas!</p>
            <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
              Buat Komunitas
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((c) => (
              <Link key={c.id} href={`/guru/komunitas/${c.id}`}>
                <Card className="p-5 h-full hover:shadow-lg transition-all border border-slate-100 hover:border-blue-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                      <span className="relative z-0">{c.name.charAt(0)}</span>
                      {c.avatarUrl && (
                        <img src={c.avatarUrl} alt={c.name} className="absolute inset-0 z-10 w-full h-full rounded-xl object-cover" onError={e => (e.currentTarget.style.display = "none")} loading="lazy" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{c.name}</h3>
                        {c.isVerified && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${getTypeColor(c.type)}`}>
                        {getTypeIcon(c.type)}
                        {c.type}
                      </span>
                      {!c.creator && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-200">
                          Ruang BahasaCerdas
                        </span>
                      )}
                      {!c.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                          Belum Terverifikasi
                        </span>
                      )}
                      {c.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                          Terverifikasi
                        </span>
                      )}
                    </div>
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{c.description}</p>
                  )}
                  {c.province && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                      <MapPin className="w-3 h-3" />
                      {c.city ? `${c.city}, ${c.province}` : c.province}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      {c.memberCount} anggota
                    </span>
                    <span>{c.postCount} postingan</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )
      )}

      {/* My Communities */}
      {myTab === "mine" && (
        myCommunities.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-600 mb-2">Belum membuat komunitas</h3>
            <p className="text-sm text-slate-400">Klik tombol "Buat Komunitas" untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myCommunities.map((c) => (
              <Card key={c.id} className="p-5 border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                      <span className="relative z-0">{c.name.charAt(0)}</span>
                      {c.avatarUrl && (
                        <img src={c.avatarUrl} alt={c.name} className="absolute inset-0 z-10 w-full h-full rounded-xl object-cover" onError={e => (e.currentTarget.style.display = "none")} loading="lazy" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-900">{c.name}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${getTypeColor(c.type)}`}>{c.type}</span>
                        {c.status === "PENDING" && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">⏳ Menunggu Peninjauan</span>}
                        {c.status === "APPROVED" && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-blue-200">✅ Disetujui</span>}
                        {c.status === "REJECTED" && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">❌ Ditolak</span>}
                      </div>
                      {c.description && <p className="text-sm text-slate-500 line-clamp-1">{c.description}</p>}
                      {c.status === "REJECTED" && c.reviewNote && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
                          <p className="text-xs font-medium text-red-700">Alasan Penolakan:</p>
                          <p className="text-xs text-red-600 mt-0.5">{c.reviewNote}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>{c.memberCount} anggota</span>
                        <span>{c.postCount} postingan</span>
                        <span>{new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "APPROVED" && (
                      <Link href={`/guru/komunitas/${c.id}`}>
                        <Button size="sm" variant="outline" className="ml-4">Buka</Button>
                      </Link>
                    )}
                    <button
                      onClick={() => openEdit(c)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit komunitas"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Buat Komunitas Baru
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {createMsg && (
                <div className={`p-3 rounded-lg text-sm ${createMsg.includes("berhasil") ? "bg-emerald-50 text-emerald-700 border border-blue-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {createMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Komunitas</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: MGMP Bahasa Indonesia Jakarta"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Deskripsi komunitas..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MGMP">MGMP</option>
                    <option value="KKG">KKG</option>
                    <option value="PUBLIKASI">Publikasi</option>
                    <option value="STUDY_GROUP">Kelompok Belajar</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provinsi</label>
                  <input
                    value={createForm.province}
                    onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: DKI Jakarta"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kota/Kab</label>
                  <input
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Jakarta Selatan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Wilayah</label>
                  <input
                    value={createForm.region}
                    onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Jabodetabek"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {creating ? "Membuat..." : "Buat Komunitas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editCommunity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditCommunity(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                Edit Komunitas
              </h2>
              <button onClick={() => setEditCommunity(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              {editMsg && (
                <div className={`p-3 rounded-lg text-sm ${editMsg.includes("berhasil") ? "bg-emerald-50 text-emerald-700 border border-blue-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {editMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Komunitas</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provinsi</label>
                  <input
                    value={editForm.province}
                    onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kota/Kab</label>
                  <input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wilayah</label>
                <input
                  value={editForm.region}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lampiran (Gambar & PDF)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="attachment-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="attachment-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-sm text-slate-500">{uploading ? "Mengupload..." : "Klik untuk upload gambar atau PDF"}</span>
                  </label>
                </div>
                {editAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {editAttachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        {att.type === "image" ? <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" /> : <FileText className="w-4 h-4 text-blue-500 shrink-0" />}
                        <span className="text-xs text-slate-600 truncate flex-1">{att.name}</span>
                        <button type="button" onClick={() => removeAttachment(i)} className="p-1 hover:bg-red-100 rounded">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditCommunity(null)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={editing} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {editing ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}