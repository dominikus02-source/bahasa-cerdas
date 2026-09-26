"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Users,
  Zap,
  AlertTriangle,
  Clock,
  ListChecks,
  RefreshCw,
  Loader2,
  MapPin,
  WifiOff,
  GraduationCap,
  UserRound,
  ShieldCheck,
} from "lucide-react";

interface PresenceLocation {
  key: string;
  label: string;
  total: number;
  guru: number;
  murid: number;
  admin: number;
}

interface LiveSnapshot {
  success: boolean;
  generatedAt: string;
  presence: {
    onlineUsers: number;
    onlineGuru: number;
    onlineMurid: number;
    onlineAdmin: number;
    locations: PresenceLocation[];
    available: boolean;
    ttlSeconds: number;
  };
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
      setError("Gagal memuat Live Pulse.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const tick = () => {
      timer.current = setTimeout(async () => {
        if (document.visibilityState === "visible") await load();
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
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat Live Pulse…
      </div>
    );
  }

  if (error && !data) {
    return <div className="m-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>;
  }
  if (!data) return null;

  const maxThroughput = Math.max(1, ...data.throughput.map((t) => t.count));
  const errPct = (data.ai.errorRate * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            <Activity className="h-5 w-5 text-emerald-500" /> Live Pulse
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pengguna online dan menu yang sedang dibuka · diperbarui {new Date(data.generatedAt).toLocaleTimeString("id-ID")} · refresh {POLL_MS / 1000}s
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          {error} Menampilkan data terakhir yang berhasil dimuat.
        </div>
      )}

      {!data.presence.available && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Presence Redis belum tersedia</p>
            <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-300/80">
              Live Pulse membutuhkan konfigurasi Upstash/KV. Angka online tidak ditampilkan sebagai nol palsu.
            </p>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Online sekarang</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">TTL presence {data.presence.ttlSeconds} detik · heartbeat tiap ±20 detik</p>
          </div>
          {data.presence.available && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PresenceStat
            icon={<Users className="h-5 w-5" />}
            label="Total Online"
            value={data.presence.available ? data.presence.onlineUsers : "—"}
            tone="emerald"
          />
          <PresenceStat
            icon={<GraduationCap className="h-5 w-5" />}
            label="Guru"
            value={data.presence.available ? data.presence.onlineGuru : "—"}
            tone="blue"
          />
          <PresenceStat
            icon={<UserRound className="h-5 w-5" />}
            label="Murid"
            value={data.presence.available ? data.presence.onlineMurid : "—"}
            tone="violet"
          />
          <PresenceStat
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Admin"
            value={data.presence.available ? data.presence.onlineAdmin : "—"}
            tone="slate"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Menu yang sedang dibuka</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Agregat real-time tanpa nama, email, atau ID halaman dinamis.</p>
          </div>
        </div>

        {!data.presence.available ? (
          <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400 dark:bg-slate-900/50">
            Distribusi menu akan muncul setelah Presence Redis aktif.
          </p>
        ) : data.presence.locations.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400 dark:bg-slate-900/50">
            Belum ada pengguna aktif dalam {data.presence.ttlSeconds} detik terakhir.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {data.presence.locations.map((location) => (
              <div key={location.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{location.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {[
                      location.guru > 0 ? `${location.guru} guru` : null,
                      location.murid > 0 ? `${location.murid} murid` : null,
                      location.admin > 0 ? `${location.admin} admin` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {location.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Platform & AI</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Kesehatan request dan antrean pemrosesan.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2 dark:border-slate-700 dark:bg-slate-800/90">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Request AI / menit (15 menit terakhir)</h2>
          <div className="flex h-40 items-end gap-1">
            {data.throughput.length === 0 && <p className="text-sm text-slate-400">Belum ada aktivitas AI.</p>}
            {data.throughput.map((t) => (
              <div key={t.minute} className="flex flex-1 flex-col items-center justify-end" title={`${t.count} req @ ${new Date(t.minute).toLocaleTimeString("id-ID")}`}>
                <div className="w-full rounded-t bg-indigo-400" style={{ height: `${(t.count / maxThroughput) * 100}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/90">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <ListChecks className="h-4 w-4" /> Antrean Job AI
          </h2>
          <div className="space-y-3">
            <QueueRow label="Menunggu (PENDING)" value={data.aiQueue.pending} warn={data.aiQueue.pending > 20} />
            <QueueRow label="Diproses (PROCESSING)" value={data.aiQueue.processing} warn={data.aiQueue.processing > 10} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PresenceStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "emerald" | "blue" | "violet" | "slate";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/90">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${tones[tone]}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
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
  tone: "indigo" | "sky" | "red" | "slate";
}) {
  const tones: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300",
    sky: "text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300",
    red: "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300",
    slate: "text-slate-600 bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/90">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${tones[tone]}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function QueueRow({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${warn ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}
