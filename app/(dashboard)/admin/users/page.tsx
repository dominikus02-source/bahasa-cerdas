"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Shield, Crown, Search, Users, Filter, ChevronDown, Check, X, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return;
    setActing(true);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selected), action }),
      });
      setSelected(new Set());
      await fetchUsers();
    } catch {}
    finally { setActing(false); }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const statusBadge = (u: any) => {
    if (u.isFounder) return { label: "Founder", color: "text-amber-600 bg-amber-50" };
    if (u.isPremium && u.premiumUntil && new Date(u.premiumUntil) > new Date()) return { label: "Pro", color: "text-blue-600 bg-blue-50" };
    if (u.isPremium) return { label: "Pro (kadaluarsa)", color: "text-slate-400 bg-slate-50" };
    if (u.role === "GURU" && u.trialEndsAt && new Date(u.trialEndsAt) > new Date()) return { label: "Trial", color: "text-sky-600 bg-sky-50" };
    return { label: "Free", color: "text-slate-400 bg-slate-50" };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total pengguna</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari nama atau email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
            </div>

            <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20">
              <option value="">Semua Role</option>
              <option value="MURID">Murid</option>
              <option value="GURU">Guru</option>
            </select>

            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20">
              <option value="">Semua Status</option>
              <option value="free">Free</option>
              <option value="premium">Pro</option>
              <option value="trial">Trial</option>
              <option value="founder">Founder</option>
            </select>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-500">{selected.size} dipilih</span>
                <button onClick={() => handleBulkAction("togglePremium")} disabled={acting}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 flex items-center gap-1">
                  {acting ? <Loader2 size={12} className="animate-spin" /> : <ToggleRight size={12} />}
                  Toggle Premium
                </button>
                <button onClick={() => handleBulkAction("deactivate")} disabled={acting}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 flex items-center gap-1">
                  {acting ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  Nonaktifkan
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Memuat...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500">Tidak ada pengguna</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="pb-3 pl-4 pt-3 w-10">
                      <input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    </th>
                    <th className="pb-3 pt-3 font-medium">Nama</th>
                    <th className="pb-3 pt-3 font-medium">Email</th>
                    <th className="pb-3 pt-3 font-medium">Role</th>
                    <th className="pb-3 pt-3 font-medium">Status</th>
                    <th className="pb-3 pt-3 font-medium">XP</th>
                    <th className="pb-3 pt-3 font-medium">Level</th>
                    <th className="pb-3 pt-3 font-medium">Bergabung</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => {
                    const st = statusBadge(u);
                    return (
                      <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${selected.has(u.id) ? "bg-violet-50/50" : ""}`}>
                        <td className="py-3 pl-4">
                          <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[10px] font-bold">
                              {(u.fullName || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">{u.fullName}</span>
                            {u.isFounder && <Crown size={12} className="text-amber-500" />}
                          </div>
                        </td>
                        <td className="py-3 text-slate-500 text-xs">{u.email}</td>
                        <td className="py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.role === "GURU" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="py-3 text-slate-500 text-xs">{u.xp}</td>
                        <td className="py-3 text-slate-500 text-xs">{u.level || 0}</td>
                        <td className="py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString("id-ID")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">Halaman {page} dari {pages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Sebelumnya</button>
                  <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Selanjutnya</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
