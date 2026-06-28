"use client";

import { useState, useEffect } from "react";
import {
  Database, ShieldCheck, HardDrive, RefreshCw, Loader2,
  AlertTriangle, CheckCircle2, Info, Clock,
  Users, FileText, Film, ShoppingBag, BookOpen,
  BrainCircuit, DollarSign, BarChart3,
} from "lucide-react";

interface Counts {
  User: number;
  Profile: number;
  Artikel: number;
  Video: number;
  Karya: number;
  UKBIQuestion: number;
  TKAQuestion: number;
  PaketKompetensi: number;
  LearningLevel: number;
  LearningUnit: number;
  TestSession: number;
  TestAnswer: number;
  AIUsage: number;
  AiSavedResult: number;
  Transaksi: number;
}

interface BackupInfo {
  found: boolean;
  exportedAt?: string;
  environment?: string;
  tables?: number;
  totalRows?: number;
  path?: string;
  note?: string;
}

interface DataCenterData {
  counts: Counts;
  backup: BackupInfo;
}

function CountCard({ label, value, icon: Icon, color, warning }: { label: string; value: number; icon: any; color: string; warning?: "critical" | "info" | "ok" }) {
  const borderColor = warning === "critical" ? "border-red-300 bg-red-50" : warning === "info" ? "border-amber-300 bg-amber-50" : "border-slate-200";
  return (
    <div className={`bg-white rounded-xl p-4 border ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        {warning === "critical" && <AlertTriangle size={16} className="text-red-500" />}
        {warning === "info" && <Info size={16} className="text-amber-500" />}
        {warning === "ok" && <CheckCircle2 size={16} className="text-emerald-500" />}
      </div>
      <p className="text-lg font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

const TABLE_META: { key: keyof Counts; label: string; icon: any; color: string; critical: boolean }[] = [
  { key: "User", label: "Users", icon: Users, color: "from-blue-500 to-blue-600", critical: true },
  { key: "Profile", label: "Profiles", icon: Users, color: "from-indigo-500 to-indigo-600", critical: true },
  { key: "UKBIQuestion", label: "UKBI Questions", icon: BookOpen, color: "from-violet-500 to-purple-600", critical: true },
  { key: "TKAQuestion", label: "TKA Questions", icon: BookOpen, color: "from-violet-500 to-purple-600", critical: true },
  { key: "PaketKompetensi", label: "Paket Kompetensi", icon: BookOpen, color: "from-violet-500 to-purple-600", critical: true },
  { key: "LearningLevel", label: "Learning Levels", icon: BarChart3, color: "from-teal-500 to-teal-600", critical: true },
  { key: "LearningUnit", label: "Learning Units", icon: BarChart3, color: "from-teal-500 to-teal-600", critical: true },
  { key: "Artikel", label: "Artikel", icon: FileText, color: "from-red-500 to-red-600", critical: false },
  { key: "Video", label: "Video", icon: Film, color: "from-emerald-500 to-emerald-600", critical: false },
  { key: "Karya", label: "Karya (Marketplace)", icon: ShoppingBag, color: "from-amber-500 to-amber-600", critical: false },
  { key: "TestSession", label: "Test Sessions", icon: Clock, color: "from-orange-500 to-orange-600", critical: false },
  { key: "TestAnswer", label: "Test Answers", icon: Clock, color: "from-orange-500 to-orange-600", critical: false },
  { key: "AIUsage", label: "AI Usage Logs", icon: BrainCircuit, color: "from-red-500 to-red-600", critical: false },
  { key: "AiSavedResult", label: "AI Saved Results", icon: BrainCircuit, color: "from-red-500 to-red-600", critical: false },
  { key: "Transaksi", label: "Transaksi", icon: DollarSign, color: "from-green-500 to-green-600", critical: false },
];

function getWarning(counts: Counts, key: keyof Counts, critical: boolean): "critical" | "info" | "ok" {
  const val = counts[key];
  if (critical) return val === 0 ? "critical" : "ok";
  return val === 0 ? "info" : "ok";
}

export default function DataCenterPage() {
  const [data, setData] = useState<DataCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data-center");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle size={40} className="text-red-400" />
        <p className="text-red-600 font-medium">Gagal memuat data: {error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { counts, backup } = data;

  const criticalWarnings = TABLE_META.filter((m) => m.critical && counts[m.key] === 0);
  const infoWarnings = TABLE_META.filter((m) => !m.critical && counts[m.key] === 0);
  const hasAnyWarning = criticalWarnings.length > 0 || infoWarnings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database size={24} className="text-red-500" /> Data Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">Pantau kesehatan database, backup, dan integritas data</p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {hasAnyWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Perhatian Data</p>
            <ul className="text-xs text-amber-800 mt-1 space-y-0.5">
              {criticalWarnings.map((w) => (
                <li key={w.key}>• <strong>{w.label}</strong>: 0 — kritis, data tidak boleh kosong!</li>
              ))}
              {infoWarnings.map((w) => (
                <li key={w.key}>• <strong>{w.label}</strong>: 0 — data sengaja dihapus (dummy content)</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
          <HardDrive size={16} className="text-blue-500" /> Database Health
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TABLE_META.map((m) => (
            <CountCard
              key={m.key}
              label={m.label}
              value={counts[m.key]}
              icon={m.icon}
              color={m.color}
              warning={getWarning(counts, m.key, m.critical)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
          <ShieldCheck size={16} className="text-emerald-500" /> Backup Status
        </h2>
        {backup.found ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={16} />
              <span className="font-medium">Backup tersedia</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500">Terakhir</p>
                <p className="text-sm font-semibold text-slate-900">{new Date(backup.exportedAt!).toLocaleString("id-ID")}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500">Lingkungan</p>
                <p className="text-sm font-semibold text-slate-900">{backup.environment}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500">Tabel</p>
                <p className="text-sm font-semibold text-slate-900">{backup.tables}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500">Total Baris</p>
                <p className="text-sm font-semibold text-slate-900">{backup.totalRows!.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Path: backups/{backup.environment === "production" ? "current" : "daily"}/{backup.path}</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-amber-700">
              <Info size={16} />
              <span className="font-medium">Backup tidak tersedia</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{backup.note}</p>
            <p className="text-xs text-slate-400 mt-2">
              Pastikan untuk menjalankan backup secara berkala. Local backup dapat dibuat via terminal dengan <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">npm run backup:daily</code>.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
          <AlertTriangle size={16} className="text-amber-500" /> Recovery Notes
        </h2>
        <div className="space-y-2 text-sm text-slate-600">
          <p>• <strong>Artikel/Video/Karya</strong> = 0 — expected. Dummy content telah dihapus. Data akan terisi kembali saat konten baru dibuat oleh guru/pengguna.</p>
          <p>• <strong>UKBI/TKA/Paket Kompetensi</strong> harus tersedia — data ini critical untuk sistem ujian. Jika 0, segera lakukan seeding ulang.</p>
          <p>• <strong>User/Profile</strong> harus tersedia — data pengguna adalah inti platform. Jika 0, periksa koneksi database dan integrasi Supabase Auth.</p>
          <p>• <strong>LearningLevel/LearningUnit</strong> harus tersedia — data ini diperlukan untuk Buku Panduan Guru dan Jalur Cerdas.</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
          <Database size={16} className="text-slate-500" /> Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 text-sm">Data Audit</h3>
            <p className="text-[10px] text-slate-500 mt-1">Periksa integritas dan konsistensi konten</p>
            <code className="block bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-mono mt-2">npm run audit:content</code>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 text-sm">Question Audit</h3>
            <p className="text-[10px] text-slate-500 mt-1">Validasi data soal UKBI/TKA</p>
            <code className="block bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-mono mt-2">npm run audit:question-data</code>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 text-sm">Manual Backup</h3>
            <p className="text-[10px] text-slate-500 mt-1">Buat backup on-demand sekarang</p>
            <code className="block bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-mono mt-2">npm run backup:current</code>
          </div>
        </div>
      </div>
    </div>
  );
}
