"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, Plus, ChevronLeft, MapPin, Shield, Globe, BookOpen, UserPlus, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COMMUNITY_TYPES = [
  { value: "", label: "Semua Tipe" },
  { value: "MGMP", label: "MGMP" },
  { value: "KKG", label: "KKG" },
  { value: "PUBLIKASI", label: "Publikasi" },
  { value: "STUDY_GROUP", label: "Study Group" },
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
  memberCount: number;
  postCount: number;
  creator: { fullName: string; avatar: string | null } | null;
}

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

  useEffect(() => {
    fetchCommunities();
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
      case "MGMP": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "KKG": return "bg-blue-100 text-blue-700 border-blue-200";
      case "PUBLIKASI": return "bg-amber-100 text-amber-700 border-amber-200";
      case "STUDY_GROUP": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru" className="p-2 hover:bg-slate-100 rounded-lg">
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
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {COMMUNITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Button onClick={() => setShowCreate(true)} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Buat Komunitas
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat komunitas...</p>
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">Belum ada komunitas</h3>
          <p className="text-sm text-slate-400 mb-4">Jadilah yang pertama membuat komunitas!</p>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
            Buat Komunitas
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((c) => (
            <Link key={c.id} href={`/guru/komunitas/${c.id}`}>
              <Card className="p-5 h-full hover:shadow-lg transition-all border border-slate-100 hover:border-emerald-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      c.name.charAt(0)
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
                <div className={`p-3 rounded-lg text-sm ${createMsg.includes("berhasil") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {createMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Komunitas</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Deskripsi komunitas..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MGMP">MGMP</option>
                    <option value="KKG">KKG</option>
                    <option value="PUBLIKASI">Publikasi</option>
                    <option value="STUDY_GROUP">Study Group</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provinsi</label>
                  <input
                    value={createForm.province}
                    onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: Jakarta Selatan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Wilayah</label>
                  <input
                    value={createForm.region}
                    onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
    </div>
  );
}