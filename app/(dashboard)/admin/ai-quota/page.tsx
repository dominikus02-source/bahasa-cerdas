"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, PlusCircle,
  RotateCcw, History, Users,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────
interface QuotaUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isFounder: boolean;
  plan: string;
  isTrial: boolean;
  isPremium: boolean;
  premiumUntil: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialPlan: string | null;
  trialCreditsTotal: number | null;
  creditsUsed: number;
  creditsTotal: number;
  remainingCredits: number;
  period: string;
  coins: number;
  createdAt: string;
  lastActiveAt: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  amount: number | null;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
  admin: { id: string; fullName: string; email: string };
  target: { id: string; fullName: string; email: string; role: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Constants ──────────────────────────────────────────────
const PLAN_BADGE: Record<string, { label: string; class: string }> = {
  FOUNDER: { label: "Founder", class: "bg-amber-100 text-amber-800 border-amber-200" },
  MURID_FREE: { label: "Murid", class: "bg-violet-100 text-violet-800 border-violet-200" },
  GURU_PRO: { label: "Pro", class: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  GURU_PRO_TRIAL: { label: "Trial", class: "bg-sky-100 text-sky-800 border-sky-200" },
  GURU_FREE: { label: "Free", class: "bg-slate-100 text-slate-700 border-slate-200" },
  SCHOOL: { label: "Sekolah", class: "bg-blue-100 text-blue-800 border-blue-200" },
};

const ACTION_LABELS: Record<string, string> = {
  EXTEND_TRIAL: "Perpanjang Trial",
  RESET_CREDITS: "Reset Kredit",
  ALLOCATE_CREDITS: "Tambah Kredit",
};

const ACTION_COLORS: Record<string, string> = {
  EXTEND_TRIAL: "text-sky-600 bg-sky-50 border-sky-200",
  RESET_CREDITS: "text-amber-600 bg-amber-50 border-amber-200",
  ALLOCATE_CREDITS: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function creditBar(used: number, total: number) {
  if (total >= 999999) return null;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : pct >= 40 ? "bg-emerald-400" : "bg-emerald-500";
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

type Tab = "users" | "audit";

// ── Page Component ─────────────────────────────────────────
export default function AdminAiQuotaPage() {
  const [tab, setTab] = useState<Tab>("users");

  // Users tab state
  const [users, setUsers] = useState<QuotaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditSearchInput, setAuditSearchInput] = useState("");

  // Action modals
  const [actionUser, setActionUser] = useState<QuotaUser | null>(null);
  const [actionType, setActionType] = useState<"extend" | "reset" | "allocate" | null>(null);
  const [actionValue, setActionValue] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionReasonError, setActionReasonError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  // ── Fetch users ────────────────────────────────────────
  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (planFilter) params.set("plan", planFilter);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      const res = await fetch(`/api/admin/ai-quota?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
        setPage(json.data.pagination.page);
        setTotalPages(json.data.pagination.totalPages);
        setTotal(json.data.pagination.total);
      } else {
        setError(json.error || "Gagal memuat data");
      }
    } catch {
      setError("Gagal memuat data. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, planFilter, sortBy, sortDir]);

  useEffect(() => { if (tab === "users") fetchUsers(page); }, [fetchUsers, page, tab]);

  // ── Fetch audit logs ───────────────────────────────────
  const fetchAuditLogs = useCallback(async (p: number) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "50");
      if (auditActionFilter) params.set("action", auditActionFilter);
      if (auditSearch) params.set("search", auditSearch);

      const res = await fetch(`/api/admin/ai-quota/audit-log?${params}`);
      const json = await res.json();
      if (json.success) {
        setAuditLogs(json.data.logs);
        setAuditPage(json.data.pagination.page);
        setAuditTotalPages(json.data.pagination.totalPages);
        setAuditTotal(json.data.pagination.total);
      }
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }, [auditActionFilter, auditSearch]);

  useEffect(() => { if (tab === "audit") fetchAuditLogs(auditPage); }, [fetchAuditLogs, auditPage, tab]);

  // ── Handlers ───────────────────────────────────────────
  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleAuditSearch = () => { setAuditSearch(auditSearchInput); setAuditPage(1); };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortIcon = (field: string) => {
    if (sortBy !== field) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  // ── Actions ────────────────────────────────────────────
  const openAction = (user: QuotaUser, type: "extend" | "reset" | "allocate") => {
    setActionUser(user);
    setActionType(type);
    setActionValue("");
    setActionReason("");
    setActionReasonError(null);
    setActionResult(null);
  };

  const closeAction = () => {
    setActionUser(null);
    setActionType(null);
    setActionValue("");
    setActionReason("");
    setActionReasonError(null);
    setActionResult(null);
  };

  const validateReason = (): boolean => {
    if (!actionType) return false;
    if (actionType === "reset") {
      if (!actionReason.trim()) {
        setActionReasonError("Alasan wajib diisi untuk reset kredit.");
        return false;
      }
    }
    if (actionType === "extend") {
      const days = parseInt(actionValue, 10);
      if (days > 30 && !actionReason.trim()) {
        setActionReasonError("Alasan wajib diisi untuk perpanjangan lebih dari 30 hari.");
        return false;
      }
    }
    if (actionType === "allocate") {
      const credits = parseInt(actionValue, 10);
      if (credits > 500 && !actionReason.trim()) {
        setActionReasonError("Alasan wajib diisi untuk alokasi lebih dari 500 kredit.");
        return false;
      }
    }
    if (actionReason.length > 300) {
      setActionReasonError("Alasan maksimal 300 karakter.");
      return false;
    }
    setActionReasonError(null);
    return true;
  };

  const executeAction = async () => {
    if (!actionUser || !actionType) return;
    if (!validateReason()) return;

    setActionLoading(true);
    setActionResult(null);
    try {
      let res: Response;
      if (actionType === "extend") {
        const days = parseInt(actionValue, 10);
        if (isNaN(days) || days < 1 || days > 365) {
          setActionResult({ success: false, message: "Masukkan jumlah hari (1-365)" });
          setActionLoading(false);
          return;
        }
        res = await fetch("/api/admin/ai-quota/extend-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: actionUser.id, days, reason: actionReason.trim() || undefined }),
        });
      } else if (actionType === "reset") {
        res = await fetch("/api/admin/ai-quota/reset-credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: actionUser.id, reason: actionReason.trim() }),
        });
      } else {
        const credits = parseInt(actionValue, 10);
        if (isNaN(credits) || credits < 1 || credits > 10000) {
          setActionResult({ success: false, message: "Masukkan jumlah kredit (1-10000)" });
          setActionLoading(false);
          return;
        }
        res = await fetch("/api/admin/ai-quota/allocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: actionUser.id,
            credits,
            reason: actionReason.trim() || undefined,
          }),
        });
      }

      const json = await res.json();
      if (json.success) {
        setActionResult({ success: true, message: "Berhasil!" });
        fetchUsers(page);
      } else {
        setActionResult({ success: false, message: json.error || "Gagal" });
      }
    } catch {
      setActionResult({ success: false, message: "Gagal menghubungi server" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Quota Management</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola kuota kredit AI, trial, dan akses pengguna</p>
        </div>
        <button
          onClick={() => tab === "users" ? fetchUsers(page) : fetchAuditLogs(auditPage)}
          disabled={loading || auditLoading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={(loading || auditLoading) ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "users" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={14} />
          Pengguna
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "audit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <History size={14} />
          Riwayat Aksi
          {auditTotal > 0 && (
            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{auditTotal}</span>
          )}
        </button>
      </div>

      {/* ─── USERS TAB ──────────────────────────────────── */}
      {tab === "users" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Cari nama atau email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <option value="">Semua Role</option>
              <option value="GURU">Guru</option>
              <option value="MURID">Murid</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <option value="">Semua Status</option>
              <option value="trial">Trial Aktif</option>
              <option value="premium">Premium</option>
              <option value="free">Guru Free</option>
              <option value="exhausted">Kredit Habis</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium"
            >
              Cari
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">Total Pengguna</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-sky-200">
              <p className="text-xs text-sky-600">Trial Aktif</p>
              <p className="text-2xl font-bold text-sky-900 mt-1">{users.filter(u => u.trialEndsAt && new Date(u.trialEndsAt) > new Date()).length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200">
              <p className="text-xs text-emerald-600">Pro Aktif</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{users.filter(u => u.isPremium && !u.isFounder && u.premiumUntil && new Date(u.premiumUntil) > new Date()).length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-red-200">
              <p className="text-xs text-red-600">Kredit Habis</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{users.filter(u => u.remainingCredits <= 0 && u.role === "GURU" && !u.isFounder).length}</p>
            </div>
          </div>

          {/* User table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("name")}>
                      Nama {sortIcon("name")}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("role")}>
                      Role {sortIcon("role")}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Plan</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("trialEndsAt")}>
                      Trial Berakhir {sortIcon("trialEndsAt")}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("creditsUsed")}>
                      Kredit {sortIcon("creditsUsed")}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12"><Loader2 size={20} className="animate-spin mx-auto text-slate-400" /></td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="text-center py-12 text-red-500">{error}</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Tidak ada data</td></tr>
                  ) : (
                    users.map((u) => {
                      const badge = PLAN_BADGE[u.plan] || PLAN_BADGE.GURU_FREE;
                      const isTrialActive = u.trialEndsAt && new Date(u.trialEndsAt) > new Date();
                      const trialExpiring = isTrialActive && u.trialEndsAt && (new Date(u.trialEndsAt).getTime() - Date.now()) < 7 * 86400000;

                      return (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{u.fullName}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                              u.role === "GURU" ? "bg-emerald-50 text-emerald-700" :
                              u.role === "MURID" ? "bg-violet-50 text-violet-700" :
                              "bg-amber-50 text-amber-700"
                            }`}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-lg border ${badge.class}`}>{badge.label}</span>
                              {u.isFounder && <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">Founder</span>}
                              {isTrialActive && trialExpiring && <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200">Segera Habis</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {isTrialActive ? (
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className={trialExpiring ? "text-red-500" : "text-sky-500"} />
                                <span className={trialExpiring ? "text-red-600 font-medium" : ""}>{formatDate(u.trialEndsAt!)}</span>
                              </div>
                            ) : u.trialEndsAt ? (
                              <span className="text-slate-400">{formatDate(u.trialEndsAt)} (expired)</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {u.creditsTotal >= 999999 ? (
                              <span className="text-sm text-slate-500">∞ tak terbatas</span>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${u.remainingCredits <= 0 ? "text-red-600" : u.remainingCredits < 10 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {u.remainingCredits}
                                  </span>
                                  <span className="text-xs text-slate-400">/ {u.creditsTotal}</span>
                                  {u.remainingCredits <= 0 && <AlertTriangle size={12} className="text-red-500" />}
                                </div>
                                {creditBar(u.creditsUsed, u.creditsTotal)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {(u.role === "GURU" || u.role === "MURID") && !u.isFounder && (
                                <>
                                  <button onClick={() => openAction(u, "extend")} title="Perpanjang Trial" className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-600 hover:text-sky-800"><Clock size={14} /></button>
                                  <button onClick={() => openAction(u, "reset")} title="Reset Kredit" className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 hover:text-amber-800"><RotateCcw size={14} /></button>
                                  <button onClick={() => openAction(u, "allocate")} title="Tambah Kredit" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800"><PlusCircle size={14} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">Halaman {page} dari {totalPages} ({total} total)</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const n = start + i;
                    if (n > totalPages) return null;
                    return <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 rounded-lg text-xs font-medium ${n === page ? "bg-red-500 text-white" : "hover:bg-slate-100 text-slate-600"}`}>{n}</button>;
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── AUDIT LOG TAB ───────────────────────────────── */}
      {tab === "audit" && (
        <>
          {/* Audit filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={auditSearchInput}
                onChange={(e) => setAuditSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuditSearch()}
                placeholder="Cari admin atau target..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <select
              value={auditActionFilter}
              onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <option value="">Semua Aksi</option>
              <option value="EXTEND_TRIAL">Perpanjang Trial</option>
              <option value="RESET_CREDITS">Reset Kredit</option>
              <option value="ALLOCATE_CREDITS">Tambah Kredit</option>
            </select>
            <button onClick={handleAuditSearch} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">Cari</button>
          </div>

          {/* Audit log table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Waktu</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Admin</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Target</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Aksi</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Jumlah</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Sebelum → Sesudah</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <tr><td colSpan={7} className="text-center py-12"><Loader2 size={20} className="animate-spin mx-auto text-slate-400" /></td></tr>
                  ) : auditLogs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">Belum ada riwayat aksi admin</td></tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 text-sm">{log.admin.fullName}</p>
                          <p className="text-xs text-slate-400">{log.admin.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 text-sm">{log.target.fullName}</p>
                          <p className="text-xs text-slate-400">{log.target.email}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            log.target.role === "GURU" ? "bg-emerald-50 text-emerald-700" :
                            log.target.role === "MURID" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"
                          }`}>{log.target.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg border ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600"}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {log.amount !== null ? (
                            log.action === "EXTEND_TRIAL" ? `${log.amount} hari` : `${log.amount} kredit`
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.previousValue || log.newValue ? (
                            <span className="text-xs">
                              <span className="text-slate-500">{log.previousValue ?? "—"}</span>
                              <span className="text-slate-300 mx-1">→</span>
                              <span className="text-slate-900 font-medium">{log.newValue ?? "—"}</span>
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate" title={log.reason ?? ""}>
                          {log.reason || <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">Halaman {auditPage} dari {auditTotalPages} ({auditTotal} total)</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage <= 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
                  {Array.from({ length: Math.min(5, auditTotalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(auditPage - 2, auditTotalPages - 4));
                    const n = start + i;
                    if (n > auditTotalPages) return null;
                    return <button key={n} onClick={() => setAuditPage(n)} className={`w-8 h-8 rounded-lg text-xs font-medium ${n === auditPage ? "bg-red-500 text-white" : "hover:bg-slate-100 text-slate-600"}`}>{n}</button>;
                  })}
                  <button onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditPage >= auditTotalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── ACTION MODAL ────────────────────────────────── */}
      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {actionType === "extend" ? "Perpanjang Trial" :
               actionType === "reset" ? "Reset Kredit" : "Tambah Kredit"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {actionUser.fullName} ({actionUser.email})
            </p>

            <div className="space-y-3">
              {actionType === "extend" && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Jumlah Hari (1-365)</label>
                  <input
                    type="number" min={1} max={365}
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  {actionUser.trialEndsAt && (
                    <p className="text-xs text-slate-400 mt-1">Saat ini: {formatDate(actionUser.trialEndsAt)}</p>
                  )}
                </div>
              )}

              {actionType === "reset" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  Ini akan mengatur ulang kredit terpakai menjadi 0 untuk bulan ini.
                </div>
              )}

              {actionType === "allocate" && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Jumlah Kredit (1-10000)</label>
                  <input
                    type="number" min={1} max={10000}
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              )}

              {/* Reason field */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Alasan
                  {actionType === "reset" && <span className="text-red-500 ml-0.5">*</span>}
                  {actionType === "extend" && parseInt(actionValue || "0") > 30 && <span className="text-red-500 ml-0.5">* (wajib {">"} 30 hari)</span>}
                  {actionType === "allocate" && parseInt(actionValue || "0") > 500 && <span className="text-red-500 ml-0.5">* (wajib {">"} 500 kredit)</span>}
                  <span className="text-slate-400 font-normal ml-1">(maks. 300 karakter)</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => {
                    setActionReason(e.target.value);
                    setActionReasonError(null);
                  }}
                  maxLength={300}
                  rows={2}
                  placeholder={
                    actionType === "reset" ? "Alasan reset kredit..." :
                    actionType === "extend" ? "Alasan perpanjangan trial..." :
                    "Alasan tambahan kredit..."
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{actionReason.length}/300</p>
                {actionReasonError && (
                  <p className="text-xs text-red-500 mt-1">{actionReasonError}</p>
                )}
              </div>

              {actionResult && (
                <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${
                  actionResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}>
                  {actionResult.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {actionResult.message}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeAction} className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">Batal</button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                {actionType === "extend" ? "Perpanjang" : actionType === "reset" ? "Reset" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
