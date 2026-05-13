"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GuruArtikelPage() {
  const [artikel, setArtikel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", tags: "", isPublished: false });

  useEffect(() => { fetchArtikel(); }, []);

  async function fetchArtikel() {
    const res = await fetch("/api/guru/artikel");
    const data = await res.json();
    setArtikel(data.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const body = editId
      ? { id: editId, ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }
      : { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };

    const res = await fetch("/api/guru/artikel", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setEditId(null);
      setForm({ title: "", content: "", tags: "", isPublished: false });
      fetchArtikel();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus artikel ini?")) return;
    await fetch(`/api/guru/artikel?id=${id}`, { method: "DELETE" });
    fetchArtikel();
  }

  function handleEdit(a: any) {
    setForm({ title: a.title, content: a.content, tags: (a.tags || []).join(", "), isPublished: a.isPublished });
    setEditId(a.id);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Artikel Saya</h1>
          <p className="text-sm text-gray-500 mt-1">Tulis dan kelola artikel untuk dibaca publik</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", content: "", tags: "", isPublished: false }); }}>
          <Plus size={16} /> {showForm ? "Batal" : "Tulis Artikel"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Judul</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Konten (Markdown)</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm" rows={12} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (pisahkan dengan koma)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm" placeholder="RPP, Kurikulum Merdeka" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                <span className="text-sm">Publikasikan</span>
              </label>
            </div>
            <Button type="submit">{editId ? "Update" : "Simpan"}</Button>
          </form>
        </Card>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : (
        artikel.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500">Belum ada artikel</p>
          </div>
        ) : (
          <div className="space-y-3">
            {artikel.map((a) => (
              <Card key={a.id} className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{a.title}</p>
                    {a.isPublished ? (
                      <Badge variant="success" className="text-[10px]"><Eye size={10} /> Terbit</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]"><EyeOff size={10} /> Draft</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{a.readCount} dibaca • {new Date(a.createdAt).toLocaleDateString("id")}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => handleEdit(a)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
