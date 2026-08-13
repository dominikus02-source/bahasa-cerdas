"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, Trash2, Edit2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminLokerPage() {
  const [loker, setLoker] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", sekolah: "", lokasi: "", description: "", requirements: "", salary: "", type: "FULL_TIME", contact: "", applicationUrl: "" });

  useEffect(() => { fetchLoker(); }, []);

  async function fetchLoker() {
    const res = await fetch("/api/admin/loker");
    const d = await res.json();
    setLoker(d.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/loker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ title: "", sekolah: "", lokasi: "", description: "", requirements: "", salary: "", type: "FULL_TIME", contact: "", applicationUrl: "" }); fetchLoker(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus lowongan ini?")) return;
    await fetch(`/api/admin/loker?id=${id}`, { method: "DELETE" });
    fetchLoker();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Kelola Lowongan</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Posting lowongan guru Bahasa Indonesia</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus size={16} /> {showForm ? "Batal" : "Tambah Lowongan"}</Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6 border-2 border-blue-100 dark:border-blue-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Judul Lowongan</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama Sekolah</label>
                <input value={form.sekolah} onChange={(e) => setForm({ ...form, sekolah: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lokasi</label>
                <input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipe</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm">
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Kontrak</option>
                  <option value="HONORER">Honorer</option>
                  <option value="PNS">PNS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gaji</label>
                <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" placeholder="Rp 3.000.000 - Rp 5.000.000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL Lamar</label>
                <input value={form.applicationUrl} onChange={(e) => setForm({ ...form, applicationUrl: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kontak</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deskripsi</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={3} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Syarat</label>
              <textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="w-full rounded-lg border px-4 py-2 text-sm" rows={3} />
            </div>
            <Button type="submit">Publikasikan Lowongan</Button>
          </form>
        </Card>
      )}

      {loading ? <div className="text-center py-12">Memuat...</div> : loker.length === 0 ? (
        <div className="text-center py-16"><Briefcase size={48} className="mx-auto text-gray-200 mb-3" /><p className="text-gray-500 dark:text-slate-400">Belum ada lowongan</p></div>
      ) : (
        <div className="space-y-3">
          {loker.map((l: any) => (
            <Card key={l.id} className="p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{l.title}</p>
                  <Badge variant={l.status === "OPEN" ? "success" : "secondary"} className="text-[10px]">{l.status === "OPEN" ? "Aktif" : "Ditutup"}</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{l.sekolah} • {l.lokasi}</p>
              </div>
              <button onClick={() => handleDelete(l.id)} className="p-2 rounded-lg hover:bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
