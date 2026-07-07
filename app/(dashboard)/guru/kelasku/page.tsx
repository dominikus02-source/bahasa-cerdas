"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Plus, Copy, ChevronLeft, Trash2, Edit3,
  CheckCircle, Clock, BookOpen, Gamepad2, GraduationCap,
  MoreVertical, X, Eye, EyeOff, RefreshCw, Search, Crown, AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MemberProgress {
  id: string;
  userId: string;
  user: { id: string; fullName: string; avatar: string | null; email: string };
  joinedAt: string;
  progress: any[];
  quizResults: any[];
  ukbiCount: number;
  tkaCount: number;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade: string;
  tahunAjaran: string | null;
  accessCode: string;
  memberCount: number;
  isActive: boolean;
  members: MemberProgress[];
  createdAt: string;
}

export default function KelasKuPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showGroup, setShowGroup] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "", grade: "X", tahunAjaran: "" });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/group");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat kelas");
        return;
      }
      if (data.group) {
        setShowCreate(false);
        setCreateForm({ name: "", description: "", grade: "X", tahunAjaran: "" });
        setError("");
        fetchGroups();
      }
    } catch (e) {
      setError("Gagal membuat kelas. Periksa koneksi Anda.");
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm("Yakin ingin menghapus grup ini? Murid tidak akan bisa akses lagi.")) return;
    try {
      await fetch(`/api/group/${groupId}`, { method: "DELETE" });
      fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleRefreshCode = async (groupId: string) => {
    try {
      await fetch(`/api/group/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.grade.toLowerCase().includes(search.toLowerCase())
  );

  const selectedGroup = groups.find((g) => g.id === showGroup);

  const GRADE_OPTIONS = ["VII", "VIII", "IX", "X", "XI", "XII", "SMA", "SMK", "Lainnya"];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            KelasKu
          </h1>
          <p className="text-sm text-slate-500">Kelola kelas dan pantau progress murid</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Buat Kelas
        </Button>
      </div>

      {groups.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kelas..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat kelas...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">Belum ada kelas</h3>
          <p className="text-sm text-slate-400 mb-4">Buat kelas pertama dan bagikan kode ke murid</p>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Buat Kelas
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              onClick={() => setShowGroup(group.id)}
              className="p-5 border border-slate-100 hover:shadow-lg hover:border-emerald-200 cursor-pointer transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {group.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{group.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                      Kelas {group.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {group.memberCount || group.members?.length || 0} murid ·{" "}
                    {group.tahunAjaran || "Th. Ajaran aktif"}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {group.members?.filter((m) => m.ukbiCount > 0).length || 0} UKBI
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {group.members?.filter((m) => m.tkaCount > 0).length || 0} TKA
                    </span>
                    <span className="flex items-center gap-1">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {group.members?.reduce((acc, m) => acc + (m.quizResults?.length || 0), 0)} Kuis
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
                    <span className="font-mono font-bold text-sm text-slate-700">{group.accessCode}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(group.accessCode); }}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                    className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Buat Kelas Baru
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Bahasa Indonesia X IPA 1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat/Kelas</label>
                  <select
                    value={createForm.grade}
                    onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                  <input
                    value={createForm.tahunAjaran}
                    onChange={(e) => setCreateForm({ ...createForm, tahunAjaran: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="2025/2026"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Deskripsi singkat..."
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {creating ? "Membuat..." : "Buat Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowGroup(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedGroup.name}</h2>
                <p className="text-sm text-slate-500">
                  Kelas {selectedGroup.grade} · {selectedGroup.members?.length || 0} murid
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 rounded-xl">
                  <span className="font-mono font-bold text-sm text-emerald-700">{selectedGroup.accessCode}</span>
                  <button onClick={() => handleCopy(selectedGroup.accessCode)} className="p-1 hover:bg-emerald-200 rounded">
                    {copied === selectedGroup.accessCode ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </button>
                </div>
                <button onClick={() => setShowGroup(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              Bagikan kode di atas ke murid untuk bergabung. Kode tidak berubah kecuali di-reset.
            </p>

            {(() => {
              const ketuaMember = selectedGroup.members?.find((m: any) => m.role === "ketua");
              return ketuaMember ? (
                <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <Crown className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-900">
                    <strong>{ketuaMember.user.fullName}</strong> — Ketua Kelas
                  </span>
                </div>
              ) : null;
            })()}

            {(!selectedGroup.members || selectedGroup.members.length === 0) ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Belum ada murid yang bergabung</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-700 mb-3">Daftar Murid</h3>
                {selectedGroup.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt={member.user.fullName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.user.fullName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{member.user.fullName}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {member.progress?.length || 0} tes
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {member.ukbiCount} UKBI
                        </span>
                        <span className="flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3" />
                          {member.quizResults?.length || 0} kuis
                        </span>
                      </div>
                    </div>
                    {member.progress?.length > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-emerald-600">Skor terbaik</p>
                        <p className="text-sm font-bold text-slate-900">
                          {Math.round(
                            (member.progress.reduce((max: number, p: any) =>
                              Math.max(max, p.percentage || 0), 0) / Math.max(member.progress.length, 1))
                          )}%
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}