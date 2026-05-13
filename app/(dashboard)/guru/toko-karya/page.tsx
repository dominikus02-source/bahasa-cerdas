"use client";

import { useState } from "react";
import { useUserStore } from "@/store";
import { UpgradeModal } from "@/components/shared/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Eye, Trash2, Download, Crown, Check } from "lucide-react";

export default function TokoKaryaPage() {
  const user = useUserStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTambah, setShowTambah] = useState(false);
  const [karyaList, setKaryaList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "RPP",
    price: 0,
    grade: "X",
  });

  const handleSubmit = async () => {
    if (formData.price > 0 && !user.isPremium && !user.isFounder) {
      setShowUpgrade(true);
      return;
    }
    setKaryaList((prev) => [...prev, { ...formData, id: Date.now(), downloads: 0, createdAt: new Date() }]);
    setShowTambah(false);
    setFormData({ title: "", description: "", type: "RPP", price: 0, grade: "X" });
  };

  const karyaTypes = [
    { value: "RPP", label: "RPP" },
    { value: "MODUL", label: "Modul Ajar" },
    { value: "PPT", label: "PPT Presentasi" },
    { value: "SOAL", label: "Bank Soal" },
    { value: "VIDEO", label: "Video Belajar" },
    { value: "LAINNYA", label: "Lainnya" },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Toko Karya</h1>
          <p className="mt-1 text-sm text-gray-600">Jual RPP, modul, dan karya pendidik lainnya</p>
        </div>
        <Button onClick={() => setShowTambah(true)}>
          <Plus className="h-4 w-4" /> Upload Karya
        </Button>
      </div>

      {user.isPremium || user.isFounder ? (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-black" />
            <div>
              <p className="font-bold text-black">Akun PRO — Fitur Jual Terbuka</p>
              <p className="text-sm text-black/70">Kamu bisa mengatur harga untuk karya berbayar</p>
            </div>
          </div>
          <Check className="h-6 w-6 text-black" />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-4 text-center">
          <Crown className="mx-auto h-8 w-8 text-blue-400 mb-2" />
          <p className="font-medium text-blue-800">Upgrade ke PRO untuk menjual karya</p>
          <p className="text-sm text-blue-600 mb-3">Dapat income dari profesi pendidik</p>
          <Button onClick={() => setShowUpgrade(true)} className="bg-blue-600">
            Upgrade Sekarang
          </Button>
        </div>
      )}

      {karyaList.length === 0 ? (
        <Card className="py-16 text-center">
          <Upload className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold">Belum ada karya</h3>
          <p className="mt-2 text-sm text-gray-500">Upload karya pertamamu untuk mulai dijual</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {karyaList.map((karya) => (
            <Card key={karya.id} className="overflow-hidden">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <div className="flex items-start justify-between">
                  <Badge>{karya.type}</Badge>
                  <Badge variant={karya.price > 0 ? "warning" : "success"}>
                    {karya.price > 0 ? `Rp ${karya.price.toLocaleString()}` : "Gratis"}
                  </Badge>
                </div>
                <h3 className="mt-3 font-bold">{karya.title}</h3>
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{karya.description}</p>
              </div>
              <div className="p-4 flex items-center justify-between border-t">
                <span className="text-xs text-gray-500">{karya.downloads} downloads</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showTambah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Upload Karya</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Judul</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="RPP Bahasa Indonesia Kelas X" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-lg border px-4 py-2" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipe</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                    {karyaTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Harga (Rp)</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full rounded-lg border px-4 py-2" placeholder="0 = gratis" />
                </div>
              </div>
              <div className="border-2 border-dashed rounded-xl p-8 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Drag & drop file atau klik untuk upload</p>
                <p className="text-xs text-gray-400">PDF, DOCX, PPT — Max 100MB</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowTambah(false)} className="flex-1">Batal</Button>
              <Button onClick={handleSubmit} className="flex-1">Upload</Button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="jual karya" />
    </div>
  );
}