"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Users, Zap, AlertTriangle, Clock, ListChecks, RefreshCw, Loader2 } from "lucide-react";

interface LiveSnapshot {
  success: boolean;
  generatedAt: string;
  activeUsers: { last5m: number; last15m: number; last60m: number };
  ai: {
    requestsPerMinute: number;
    errorsLastMinute: number;
    errorRate: number;
    avgLatencyMs: number;
    sampleSize5m: number;
  };
  aiQueue: { pending: number; processing: number };
  throughput: { minute: string; count: number }[];
}

const POLL_MS = 8000;

export default function MonitoringPage() {
  const [data, setData] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitoring/live", { cache: "no-store" });
      if (res.status === 403) {
        setError("Akses ditolak — khusus Founder.");
        return;
      }
      const json = (await res.json()) as LiveSnapshot;
      if (!json.success) throw new Error("bad response");
      setData(json);
      setError(null);
    } catch {
      setError("Gagal memuat data monitoring.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const tick = () => {
      timer.current = setTimeout(async () => {
        await load();
        tick();
      }, POLL_MS);
    };
    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat monitoring…
      </div>
    );
  }

  if (error) {
    return <div className="m-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>;
  }
  if (!data) return null;

  const maxThroughput = Math.max(1, ...data.throughput.map((t) => t.count));
  const errPct = (data.ai.errorRate * 100).toFixed(1);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Activity className="h-5 w-5 text-emerald-500" /> Monitoring Beban Real-time
          </h1>
          <p className="text-sm text-slate-500">
            Diperbarui {new Date(data.generatedAt).toLocaleTimeString("id-ID")} · auto-refresh {POLL_MS / 1000}s
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Users className="h-5 w-5" />}
          label="Pengguna Aktif (5 mnt)"
          value={data.activeUsers.last5m}
          sub={`${data.activeUsers.last15m} / 15m · ${data.activeUsers.last60m} / 60m`}
          tone="emerald"
        />
        <Stat
          icon={<Zap className="h-5 w-5" />}
          label="Request AI / menit"
          value={data.ai.requestsPerMinute}
          sub={`sampel 5m: ${data.ai.sampleSize5m}`}
          tone="indigo"
        />
        <Stat
          icon={<Clock className="h-5 w-5" />}
          label="Rata-rata Respons AI"
          value={`${data.ai.avgLatencyMs} ms`}
          sub="rolling 5 menit"
          tone="sky"
        />
        <Stat
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Error Rate (1 mnt)"
          value={`${errPct}%`}
          sub={`${data.ai.errorsLastMinute} error`}
          tone={data.ai.errorRate > 0.1 ? "red" : "slate"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Request AI / menit (15 menit terakhir)</h2>
          <div className="flex h-40 items-end gap-1">
            {data.throughput.length === 0 && <p className="text-sm text-slate-400">Belum ada aktivitas AI.</p>}
            {data.throughput.map((t) => (
              <div key={t.minute} className="flex flex-1 flex-col items-center justify-end" title={`${t.count} req @ ${new Date(t.minute).toLocaleTimeString("id-ID")}`}>
                <div
                  className="w-full rounded-t bg-indigo-400"
                  style={{ height: `${(t.count / maxThroughput) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ListChecks className="h-4 w-4" /> Antrean Job AI
          </h2>
          <div className="space-y-3">
            <QueueRow label="Menunggu (PENDING)" value={data.aiQueue.pending} warn={data.aiQueue.pending > 20} />
            <QueueRow label="Diproses (PROCESSING)" value={data.aiQueue.processing} warn={data.aiQueue.processing > 10} />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Backlog PENDING yang terus naik menandakan generate AI lebih cepat masuk daripada diproses.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone: "emerald" | "indigo" | "sky" | "red" | "slate";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    indigo: "text-indigo-600 bg-indigo-50",
    sky: "text-sky-600 bg-sky-50",
    red: "text-red-600 bg-red-50",
    slate: "text-slate-600 bg-slate-100",
  };
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${tones[tone]}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function QueueRow({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${warn ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}
