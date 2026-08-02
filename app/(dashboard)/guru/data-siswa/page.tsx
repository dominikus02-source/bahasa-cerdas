"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Users, ChevronRight, Hash } from "lucide-react";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { RankChip } from "@/components/gamification/RankChip";

const leagueColors: Record<string, string> = {
  BRONZE: "from-amber-600 to-amber-800",
  SILVER: "from-gray-300 to-gray-500",
  GOLD: "from-yellow-400 to-amber-500",
  DIAMOND: "from-cyan-400 to-blue-500",
};

export default function DataSiswaPage() {
  const [siswa, setSiswa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [absenDraft, setAbsenDraft] = useState<Record<string, string>>({});
  const [savingAbsen, setSavingAbsen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guru/siswa")
      .then((r) => r.json())
      .then((data) => setSiswa(data.siswa || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveAbsen = async (s: any) => {
    const value = (absenDraft[s.id] ?? s.profile?.noAbsen ?? "").trim();
    setSavingAbsen(s.id);
    try {
      const res = await fetch(`/api/guru/siswa/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noAbsen: value }),
      });
      if (!res.ok) return;
      setSiswa((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, profile: { ...x.profile, noAbsen: value } } : x))
      );
    } finally {
      setSavingAbsen(null);
    }
  };

  const filtered = siswa.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
        <p className="mt-1 text-sm text-gray-600">Pantau progres dan performa siswa dari kelasmu</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat data siswa...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Belum ada siswa terdaftar</p>
          <p className="text-sm text-gray-400 mt-1">Buat kelas di menu KelasKu dan undang siswa</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold`}>
                  {(s.fullName || "??").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{s.fullName}</p>
                    <RankChip rank={rankFromLevel(levelFromXp(s.xp || 0))} size={12} showTitle={false} compact />
                    {s.profile?.noAbsen && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
                        <Hash size={10} /> {s.profile.noAbsen}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>Level {s.level || 1}</span>
                    <span>🔥 {s.streak || 0} streak</span>
                    <span>Terakhir: {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString("id") : "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      value={absenDraft[s.id] ?? s.profile?.noAbsen ?? ""}
                      onChange={(e) => setAbsenDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                      placeholder="No. absen"
                      className="w-24 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      onClick={() => saveAbsen(s)}
                      disabled={savingAbsen === s.id}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
                    >
                      {savingAbsen === s.id ? "Simpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{(s.xp || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">XP Total</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}