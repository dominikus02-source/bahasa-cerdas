"use client";

import { useState, useEffect, useRef } from "react";
import { useUserStore } from "@/store";
import { UpgradeModal } from "@/components/shared/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Eye, Trash2, Crown, Check, FileText, Download, Loader2, X } from "lucide-react";

const KARYA_TYPES = [
  { value: "RPP", label: "RPP" },
  { value: "MODUL", label: "Modul Ajar" },
  { value: "PPT", label: "PPT Presentasi" },
  { value: "SOAL", label: "Bank Soal" },
  { value: "VIDEO", label: "Video Belajar" },
  { value: "EBOOK", label: "Ebook / Modul Digital" },
  { value: "ADMINISTRASI", label: "Administrasi Guru" },
  { value: "LAINNYA", label: "Lainnya" },
];

export default function TokoKaryaPage() {
  const user = useUserStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTambah, setShowTambah] = useState(false);
  const [karyaList, setKaryaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "RPP",
    price: 0,
    grade: "",
  });

  useEffect(() => { fetchKarya(); }, []);

  async function fetchKarya() {
    try {
      const res = await fetch("/api/marketplace?limit=100");
      const d = await res.json();
      setKaryaList(d.data || []);
    } catch {}
    setLoading(false);
  }

  const handleUpload = async () => {
    if (formData.price > 0 && !user.isPremium && !user.isFounder) {
      setShowUpgrade(true);
      return;
    }

    if (!formData.title) return;
    setUploading(true);

    try {
      const body: any = { ...formData, isPublished: true };

      if (selectedFile) {
        const formFile = new FormData();
        formFile.set("file", selectedFile);
        const uploadRes = await fetch("/api/upload/file", {
          method: "POST",
          body: formFile,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) {
          body.fileUrl = uploadData.url;
          body.fileKey = uploadData.key;
        }
      }

      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowTambah(false);
        setFormData({ title: "", description: "", type: "RPP", price: 0, grade: "" });
        setSelectedFile(null);
        fetchKarya();
      }
    } catch {}

    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus karya ini?")) return;
    await fetch(`/api/marketplace?id=${id}`, { method: "DELETE" });
    fetchKarya();
  };

  const typeLabel = (v: string) => KARYA_TYPES.find(t => t.value === v)?.label || v;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Toko Karya</h1>
          <p className="mt-1 text-sm text-gray-600">Upload & jual RPP, modul, soal, dan karya lainnya</p>
        </div>
        <Button onClick={() => setShowTambah(true)}><Plus size={16} /> Upload Karya</Button>
      </div>

      {user.isPremium || user.isFounder ? (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-white" />
            <div>
              <p className="font-bold text-white">Akun Premium — Fitur Jual Terbuka</p>
              <p className="text-sm text-white/80">Kamu bisa menjual karya berbayar. Komisi 85% untukmu!</p>
            </div>
          </div>
          <Check className="h-6 w-6 text-white" />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 text-center">
          <Crown className="mx-auto h-8 w-8 text-amber-400 mb-2" />
          <p className="font-medium text-amber-800">Upgrade ke Premium untuk menjual karya berbayar</p>
          <p className="text-sm text-amber-600 mb-3">Dapatkan 85% komisi dari setiap penjualan</p>
          <Button onClick={() => setShowUpgrade(true)} className="bg-amber-600 hover:bg-amber-700">Upgrade Sekarang</Button>
        </div>
      )}

      {/* Upload Form */}
      {showTambah && (
        <Card className="p-6 mb-6 border-2 border-emerald-100">
          <h2 className="font-bold text-lg mb-4">Upload Karya Baru</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Judul Karya</label>
              <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" placeholder="RPP Bahasa Indonesia Kelas X Kurikulum Merdeka" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Deskripsi</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Tipe Karya</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm">
                  {KARYA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Harga (Rp)</label>
                <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm" placeholder="0 = Gratis" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Kelas (opsional)</label>
              <input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm" placeholder="X / 1 / 7" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">File Karya</label>
              <input type="file" ref={fileRef} accept=".pdf,.docx,.pptx,.xlsx,.zip,.mp4"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden" />
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={24} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">{selectedFile.name}</span>
                    <span className="text-xs text-gray-400">({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="p-1 rounded hover:bg-red-100"><X size={16} className="text-red-500" /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Klik untuk pilih file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPT, XLSX, ZIP — Max 100MB</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowTambah(false); setSelectedFile(null); }} className="flex-1">Batal</Button>
              <Button onClick={handleUpload} disabled={uploading || !formData.title} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600">
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Publikasikan</>}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Karya List */}
      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : karyaList.length === 0 ? (
        <Card className="py-16 text-center">
          <Upload className="mx-auto h-16 w-16 text-gray-200" />
          <h3 className="mt-4 font-semibold text-gray-900">Belum ada karya</h3>
          <p className="mt-2 text-sm text-gray-500">Upload karya pertamamu untuk mulai dijual</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {karyaList.map((karya) => (
            <Card key={karya.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="text-[10px]">{typeLabel(karya.type)}</Badge>
                  <Badge variant={karya.price > 0 ? "warning" : "success"} className="text-[10px]">
                    {karya.price > 0 ? `Rp ${karya.price.toLocaleString("id")}` : "Gratis"}
                  </Badge>
                </div>
                <h3 className="font-bold text-gray-900">{karya.title}</h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{karya.description}</p>
                {karya.grade && <span className="text-[10px] text-gray-400 mt-1 block">Kelas {karya.grade}</span>}
              </div>
              <div className="p-4 flex items-center justify-between border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Download size={12} /> {karya.downloads || 0}</span>
                </div>
                <div className="flex gap-1">
                  <a href={karya.fileUrl} target="_blank" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={16} /></a>
                  <button onClick={() => handleDelete(karya.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="jual karya" />
    </div>
  );
}
