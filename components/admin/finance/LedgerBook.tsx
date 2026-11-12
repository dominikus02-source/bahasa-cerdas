"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTypedConfirm, adminConfirmHeaders } from "@/components/admin/TypedConfirm";
import { jakartaDateISO, startOfJakartaMonth } from "@/lib/finance/dates";
import { LEDGER_CATEGORIES, formatRupiah, type LedgerType } from "@/lib/finance/ledger";
import type { LedgerDto } from "@/lib/finance/types";

type Totals = { pemasukan: number; pengeluaran: number; saldo: number };

const EMPTY_FORM = {
  entryDate: "",
  type: "PENGELUARAN" as LedgerType,
  amount: "",
  description: "",
  category: "",
};

export default function LedgerBook() {
  const { confirm, dialog } = useTypedConfirm();
  const month = useMemo(() => startOfJakartaMonth(jakartaDateISO()), []);
  const [from, setFrom] = useState(month.from);
  const [to, setTo] = useState(month.to);
  const [entries, setEntries] = useState<LedgerDto[]>([]);
  const [totals, setTotals] = useState<Totals>({ pemasukan: 0, pengeluaran: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, entryDate: jakartaDateISO() });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/finance/ledger?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat buku kas.");
      setEntries(data.entries || []);
      setTotals(data.totals || { pemasukan: 0, pengeluaran: 0, saldo: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat buku kas.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, entryDate: jakartaDateISO() });
  }

  function startEdit(entry: LedgerDto) {
    setEditingId(entry.id);
    setForm({
      entryDate: entry.entryDate,
      type: entry.type,
      amount: String(entry.amount),
      description: entry.description,
      category: entry.category || "",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = editingId ? "Ubah entri buku kas?" : "Simpan entri buku kas?";
    const detail = `${form.type === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"} ${form.amount} — ${form.description}`;
    if (!(await confirm({ title, detail, actionLabel: editingId ? "Simpan perubahan" : "Simpan" }))) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        entryDate: form.entryDate,
        type: form.type,
        amount: form.amount,
        description: form.description,
        category: form.category,
      };
      const res = await fetch(editingId ? `/api/admin/finance/ledger/${editingId}` : "/api/admin/finance/ledger", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...adminConfirmHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan entri.");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan entri.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: LedgerDto) {
    if (!(await confirm({
      title: "Hapus entri buku kas?",
      detail: `${entry.entryDate} · ${entry.type === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(entry.amount)} — ${entry.description}`,
      actionLabel: "Hapus",
    }))) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/finance/ledger/${entry.id}`, {
        method: "DELETE",
        headers: adminConfirmHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menghapus entri.");
      if (editingId === entry.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus entri.");
    }
  }

  async function downloadExcel() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/finance/ledger/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengunduh Excel.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buku-kas-${from}_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh Excel.");
    }
  }

  const fieldClass = "mt-1 w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100";
  const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-400";

  return (
    <div className="min-w-0 space-y-4">
      {dialog}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buku Kas</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Catat pemasukan dan pengeluaran secara manual. Data disimpan di server, bukan di perangkat ini.
        </p>
      </div>

      <form onSubmit={submit} className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {editingId ? "Ubah entri" : "Entri baru"}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="min-w-0">
            <span className={labelClass}>Tanggal</span>
            <input
              type="date"
              required
              value={form.entryDate}
              onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="min-w-0">
            <span className={labelClass}>Tipe</span>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LedgerType }))}
              className={fieldClass}
            >
              <option value="PEMASUKAN">Pemasukan</option>
              <option value="PENGELUARAN">Pengeluaran</option>
            </select>
          </label>
          <label className="min-w-0">
            <span className={labelClass}>Nominal (rupiah)</span>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="Contoh: 150000"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="min-w-0">
            <span className={labelClass}>Kategori (opsional)</span>
            <input
              list="ledger-categories"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={fieldClass}
              placeholder="Pilih atau ketik"
            />
            <datalist id="ledger-categories">
              {LEDGER_CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
        </div>
        <label className="block min-w-0">
          <span className={labelClass}>Keterangan</span>
          <textarea
            required
            rows={2}
            maxLength={500}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={`${fieldClass} resize-y`}
            placeholder="Contoh: Biaya server November"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Simpan entri"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 dark:border-slate-600 text-sm px-4 py-2 text-slate-700 dark:text-slate-200">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-1 gap-3 min-w-0 w-full sm:w-auto sm:grid-cols-2">
            <label className="min-w-0">
              <span className={labelClass}>Dari</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
            </label>
            <label className="min-w-0">
              <span className={labelClass}>Sampai</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
            </label>
          </div>
          <button
            type="button"
            onClick={downloadExcel}
            className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 w-full sm:w-auto shrink-0"
          >
            Unduh Excel
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-teal-50 dark:bg-teal-950/40 p-3 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-teal-800 dark:text-teal-300">Total pemasukan</p>
            <p className="text-sm font-semibold text-teal-900 dark:text-teal-100 break-words">{formatRupiah(totals.pemasukan)}</p>
          </div>
          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">Total pengeluaran</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">{formatRupiah(totals.pengeluaran)}</p>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/40 p-3 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-violet-800 dark:text-violet-300">Saldo</p>
            <p className="text-sm font-semibold text-violet-900 dark:text-violet-100 break-words">{formatRupiah(totals.saldo)}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Memuat entri…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada entri pada rentang ini.</p>
        ) : (
          <>
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-3">Tanggal</th>
                    <th className="py-2 pr-3">Tipe</th>
                    <th className="py-2 pr-3">Nominal</th>
                    <th className="py-2 pr-3">Keterangan</th>
                    <th className="py-2 pr-3">Kategori</th>
                    <th className="py-2 pr-3">Oleh</th>
                    <th className="py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{entry.entryDate}</td>
                      <td className="py-2 pr-3">{entry.type === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatRupiah(entry.amount)}</td>
                      <td className="py-2 pr-3 min-w-0 break-words max-w-xs">{entry.description}</td>
                      <td className="py-2 pr-3">{entry.category || "—"}</td>
                      <td className="py-2 pr-3 break-all text-xs text-slate-500 dark:text-slate-400">{entry.updatedByEmail || entry.createdByEmail}</td>
                      <td className="py-2 whitespace-nowrap">
                        <button type="button" onClick={() => startEdit(entry)} className="text-xs font-medium text-violet-700 dark:text-violet-300 mr-3">Ubah</button>
                        <button type="button" onClick={() => remove(entry)} className="text-xs font-medium text-slate-600 dark:text-slate-300">Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 dark:text-red-300 break-words" role="alert">{error}</p>
      )}
    </div>
  );
}
