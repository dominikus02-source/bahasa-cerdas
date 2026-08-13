"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { ChevronLeft, Users, GraduationCap, Crown, BookOpen, Award, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; fullName: string; avatar: string | null };
}

export default function MuridKelaskuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [group, setGroup] = useState<any>(null);
  const [ketua, setKetua] = useState<any>(null);
  const [currentMemberRole, setCurrentMemberRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/group/${resolvedParams.id}/student`);
      const data = await res.json();
      if (data.group) {
        setGroup(data.group);
        setKetua(data.ketua);
        setCurrentMemberRole(data.currentMemberRole);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [resolvedParams.id]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/group/${resolvedParams.id}/claim`, { method: "POST" });
      const data = await res.json();
      if (data.claimed) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-bold text-xl">Kelas tidak ditemukan</h2>
          <Link href="/murid/gabung-kelas" className="mt-4 text-violet-600 dark:text-violet-400 hover:underline block">Kembali</Link>
        </div>
      </div>
    );
  }

  const isKetua = currentMemberRole === "ketua";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/murid/gabung-kelas" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ChevronLeft className="w-4 h-4" /> Kembali ke Kelas Saya
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white bg-white/20 dark:bg-slate-900/20 flex items-center justify-center text-white font-bold text-2xl">
              {group.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{group.name}</h1>
              <div className="flex items-center gap-1 text-white/70 text-sm mt-1">
                <GraduationCap className="w-4 h-4" />
                Kelas {group.grade}
              </div>
              {group.description && (
                <p className="text-white/70 text-sm mt-1">{group.description}</p>
              )}
              {group.teacher && (
                <p className="text-white/60 text-xs mt-2">
                  Guru: {group.teacher.fullName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {group.members.length} anggota
            </span>
          </div>

          {ketua ? (
            <div className="flex items-center gap-3 mt-4 bg-white bg-white/10 dark:bg-slate-900/10 rounded-xl px-4 py-2.5">
              <Crown className="w-5 h-5 text-amber-300" />
              <span className="text-sm text-white/90">
                <strong className="text-white">{ketua.user.fullName}</strong> — Ketua Kelas
              </span>
              {isKetua && (
                <span className="text-xs bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full ml-auto">Anda</span>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={handleClaim}
                disabled={claiming}
 className="flex items-center gap-2 text-sm bg-white bg-white/15 dark:bg-slate-900/15 hover:bg-white bg-white/25 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                {claiming ? "Mengklaim..." : "Klaim sebagai Ketua Kelas"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card className="p-5 border-0 shadow-sm rounded-2xl">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Anggota Kelas ({group.members.length})
          </h3>
          <div className="space-y-3">
            {group.members.map((m: Member) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center text-slate-600 text-xs font-bold">
                  {m.user.avatar ? (
                    <img src={m.user.avatar} alt={m.user.fullName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    m.user.fullName.charAt(0)
                  )}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-200">{m.user.fullName}</span>
                {m.role === "ketua" && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <Crown className="w-3 h-3" /> Ketua Kelas
                  </span>
                )}
              </div>
            ))}
            {group.members.length === 0 && (
              <p className="text-xs text-slate-400">Belum ada anggota</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
