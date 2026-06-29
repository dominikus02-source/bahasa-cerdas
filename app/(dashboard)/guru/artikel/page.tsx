"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, FileText, Image as ImageIcon, X, Bold, Italic, List, Link as LinkIcon, Heading } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function GuruArtikelPage() {
  const [artikel, setArtikel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    tags: "",
    isPublished: true,
    coverImage: "",
  });

  useEffect(() => { fetchArtikel(); }, []);

  async function fetchArtikel() {
    const res = await fetch("/api/guru/artikel");
    const data = await res.json();
    setArtikel(data.data || []);
    setLoading(false);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setForm({ ...form, coverImage: data.url });
      else alert(data.error || "Gagal upload");
    } catch { alert("Gagal upload gambar"); }
    setUploading(false);
  }

  function insertMarkdown(before: string, after = "") {
    const ta = document.querySelector("#artikel-content") as HTMLTextAreaElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = form.content;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setForm({ ...form, content: newText });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
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
      setForm({ title: "", content: "", tags: "", isPublished: false, coverImage: "" });
      fetchArtikel();
    } else {
      const data = await res.json();
      alert(data.error || "Gagal menyimpan artikel");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus artikel ini?")) return;
    await fetch(`/api/guru/artikel?id=${id}`, { method: "DELETE" });
    fetchArtikel();
  }

  function handleEdit(a: any) {
    setForm({
      title: a.title,
      content: a.content,
      tags: (a.tags || []).join(", "),
      isPublished: a.isPublished,
      coverImage: a.coverImage || "",
    });
    setEditId(a.id);
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditId(null);
    setForm({ title: "", content: "", tags: "", isPublished: false, coverImage: "" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Artikel Saya</h1>
          <p className="text-sm text-gray-500 mt-1">Tulis dan kelola artikel untuk dibaca publik</p>
        </div>
        <Button onClick={() => showForm ? resetForm() : setShowForm(true)}>
          <Plus size={16} /> {showForm ? "Batal" : "Tulis Artikel"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-8 border-2 border-emerald-100 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Judul Artikel</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="Masukkan judul artikel..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags</label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="RPP, Kurikulum Merdeka, Tips Mengajar"
                  />
                  <p className="text-xs text-gray-400 mt-1">Pisahkan dengan koma</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gambar Cover</label>
                  <input
                    type="file"
                    ref={fileRef}
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors">
                      <ImageIcon size={18} /> {uploading ? "Mengunggah..." : "Unggah Cover"}
                    </button>
                    <input
                      value={form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                      className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="Atau masukkan URL gambar"
                    />
                  </div>
                  {form.coverImage && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-gray-200">
                      <img src={form.coverImage} alt="cover" className="w-full h-48 object-cover" />
                      <button type="button" onClick={() => setForm({ ...form, coverImage: "" })}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 pt-6">
                <label className="flex items-center gap-2.5 cursor-pointer bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-emerald-50 transition-colors">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700">Publikasikan sekarang</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Konten (Markdown)</label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setShowPreview(!showPreview)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${showPreview ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {showPreview ? "Ubah" : "Pratinjau"}
                  </button>
                </div>
              </div>

              {!showPreview ? (
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-500 transition-colors">
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
                    {[
                      { icon: <Heading size={14} />, before: "## ", after: "", title: "Heading" },
                      { icon: <Bold size={14} />, before: "**", after: "**", title: "Bold" },
                      { icon: <Italic size={14} />, before: "_", after: "_", title: "Italic" },
                      { icon: <List size={14} />, before: "- ", after: "", title: "List" },
                      { icon: <LinkIcon size={14} />, before: "[", after: "](url)", title: "Link" },
                    ].map((btn) => (
                      <button key={btn.title} type="button" onClick={() => insertMarkdown(btn.before, btn.after)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors" title={btn.title}>
                        {btn.icon}
                      </button>
                    ))}
                    <span className="text-xs text-gray-400 ml-auto">Markdown supported</span>
                  </div>
                  <textarea
                    id="artikel-content"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full px-4 py-3 text-sm min-h-[400px] focus:outline-none resize-y"
                    placeholder="Tulis konten artikel di sini...&#10;&#10;## Sub Judul&#10;&#10;Paragraf pertama..."
                    required
                  />
                </div>
              ) : (
                <div className="border-2 border-gray-200 rounded-xl p-6 min-h-[400px] prose prose-sm max-w-none bg-white">
                  {form.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">Belum ada konten</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 py-2.5 rounded-xl font-semibold">
                {editId ? "Update Artikel" : "Simpan Artikel"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : (
        artikel.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Belum ada artikel</p>
            <p className="text-sm text-gray-400 mt-1">Tulis artikel pertamamu untuk dibaca publik</p>
          </div>
        ) : (
          <div className="space-y-3">
            {artikel.map((a) => (
              <Card key={a.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{a.title}</p>
                    {a.isPublished ? (
                      <Badge variant="success" className="text-[10px] flex items-center gap-1"><Eye size={10} /> Terbit</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] flex items-center gap-1"><EyeOff size={10} /> Draft</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{a.readCount} dibaca</span>
                    <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString("id")}</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
                  <button onClick={() => handleEdit(a)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"><Trash2 size={16} /></button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
