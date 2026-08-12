"use client";

import { useState, useEffect } from "react";
import { useBerandaHref } from "@/lib/arena-scope";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Copy, CheckCircle, BookOpen, GraduationCap, ChevronRight, Clock, RefreshCw, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade: string;
  accessCode: string;
  memberCount: number;
  teacher: { fullName: string; avatar: string | null } | null;
}

export default function GabungKelasPage() {
  const berandaHref = useBerandaHref();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Group | null>(null);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/group/memberships");
        const data = await res.json();
        setMyGroups(data.memberships || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    setError("");
    setSuccess(null);
    try {
      const res = await fetch("/api/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: code.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(data.group);
        setCode("");
        setTimeout(() => router.push(berandaHref), 3000);
      }
    } catch (e) {
      setError("Terjadi kesalahan");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href={berandaHref} className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
          </Link>
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Gabung Kelas</h1>
              <p className="text-violet-100 text-sm">Masukkan kode dari guru untuk bergabung</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6 border-0 shadow-lg rounded-2xl">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Kode Akses Kelas</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-14 px-5 rounded-xl border-2 border-border bg-white dark:bg-slate-900 focus:border-violet-500 dark:focus:border-violet-400 focus:outline-none text-center font-mono text-xl font-bold tracking-widest uppercase"
                placeholder="XXXXXXXX"
                maxLength={8}
                required
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Kode 8 karakter dari guru
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-950/50 border-2 border-green-200 dark:border-green-900 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-bold text-green-700 dark:text-green-400">Berhasil bergabung!</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-400">
                  {success.name} - Kelas {success.grade}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Mengalihkan ke beranda...</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={joining || !code.trim() || !!success}
              className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold text-base rounded-xl"
            >
              {joining ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Bergabung...
                </span>
              ) : (
                "Gabung Kelas"
              )}
            </Button>
          </form>
        </Card>

        {myGroups.length > 0 && (
          <div>
            <h3 className="font-bold text-foreground mb-3 text-sm">Kelas Saya</h3>
            <div className="space-y-2">
              {myGroups.map((m) => (
                <Link key={m.id} href={`/murid/kelasku/${m.group.id}`}>
                  <Card className="p-4 border border-border hover:border-violet-200 dark:hover:border-violet-500/60 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-300 font-bold shrink-0">
                        {m.group.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{m.group.name}</p>
                        <p className="text-xs text-muted-foreground">Kelas {m.group.grade} · Bergabung {new Date(m.joinedAt).toLocaleDateString("id-ID")}</p>
                        {m.role === "ketua" && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                            <Crown className="w-3 h-3" /> Ketua Kelas
                          </span>
                        )}
                      </div>
                      {m.role === "ketua" ? (
                        <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Card className="p-5 bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-100 dark:border-violet-500/20">
          <h3 className="font-bold text-violet-900 dark:text-violet-300 text-sm mb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Cara Bergabung
          </h3>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Guru memberikan kode akses 8 karakter</li>
            <li>Masukkan kode pada kolom di atas</li>
            <li>Klik "Gabung Kelas" untuk bergabung</li>
            <li>Setelah bergabung, kamu bisa mengerjakan tugas dari guru</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}