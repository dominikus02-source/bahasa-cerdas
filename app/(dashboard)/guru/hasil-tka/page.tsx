"use client";

import { useState, useEffect } from "react";
import { Users, CheckCircle, XCircle, Clock, TrendingUp, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HasilTKAPage() {
  const [pakets, setPakets] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kompetensi?limit=20")
      .then(r => r.json())
      .then(d => setPakets((d.data || []).filter((p: any) => p.type?.includes("TKA"))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/guru/hasil-tka?paketId=${selected}`)
      .then(r => r.json())
      .then(d => setResults(d.results || []))
      .catch(() => {});
  }, [selected]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hasil TKA</h1>
        <p className="text-sm text-gray-500 mt-1">Lihat hasil dan analisis jawaban murid</p>
      </div>

      <div className="mb-6">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="w-full max-w-md rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
          <option value="">Pilih Paket TKA</option>
          {pakets.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {selected && results.length === 0 && (
        <div className="text-center py-16 text-slate-400">Belum ada hasil untuk paket ini</div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{results.filter((r: any) => r.score >= 55).length}</p>
              <p className="text-xs text-slate-500">Lulus</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{results.filter((r: any) => r.score < 55).length}</p>
              <p className="text-xs text-slate-500">Tidak Lulus</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{results.length}</p>
              <p className="text-xs text-slate-500">Total Peserta</p>
            </Card>
          </div>

          {results.map((r: any) => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-sm font-bold text-blue-700">
                  {(r.user?.fullName || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{r.user?.fullName || "Unknown"}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-0.5"><Clock size={10} /> {r.startedAt ? new Date(r.startedAt).toLocaleDateString("id") : "-"}</span>
                    {r.finishedAt && <span>• {Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 60000)} menit</span>}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className={`text-lg font-bold ${r.score >= 55 ? "text-emerald-600" : "text-red-600"}`}>{r.score}%</p>
                <Badge variant={r.score >= 55 ? "success" : "destructive"} className="text-[10px]">{r.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
