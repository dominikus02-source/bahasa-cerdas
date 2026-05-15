"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Zap, Download, Eye, Edit2 } from "lucide-react";

export default function RPPModulPage() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const KELAS = [
    "1", "2", "3", "4", "5", "6",
    "7", "8", "9",
    "10", "11", "12",
  ];

  const [formData, setFormData] = useState({
    kd: "",
    kelas: "1",
    topik: "",
    alokasi: "2x40",
    metode: "Diskusi",
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/rpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.rpp) {
        setGenerated(data.rpp);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">RPP & Modul</h1>
        <p className="mt-1 text-sm text-gray-600">Generate RPP dan modul ajar dengan AI</p>
      </div>

      <Card className="p-6 max-w-2xl">
        <h2 className="font-semibold mb-4">Buat RPP Baru</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kelas</label>
              <select
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className="w-full rounded-lg border px-4 py-2"
              >
                {KELAS.map((k) => <option key={k}>Kelas {k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
              <input
                value="Bahasa Indonesia"
                disabled
                className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Alokasi Waktu</label>
              <input
                value={formData.alokasi}
                onChange={(e) => setFormData({ ...formData, alokasi: e.target.value })}
                className="w-full rounded-lg border px-4 py-2"
                placeholder="2x40 menit"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Metode</label>
              <select
                value={formData.metode}
                onChange={(e) => setFormData({ ...formData, metode: e.target.value })}
                className="w-full rounded-lg border px-4 py-2"
              >
                <option>Diskusi</option>
                <option>Ceramah</option>
                <option>Project Based</option>
                <option>Problem Based</option>
                <option>Inquiry</option>
                <option>Game Based</option>
                <option>Blended Learning</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">KD / Kompetensi Dasar</label>
            <input
              value={formData.kd}
              onChange={(e) => setFormData({ ...formData, kd: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
              placeholder="3.1 Menganalisis struktur teks..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Topik / Materi</label>
            <textarea
              value={formData.topik}
              onChange={(e) => setFormData({ ...formData, topik: e.target.value })}
              className="w-full rounded-lg border px-4 py-2"
              rows={2}
              placeholder="Teks Negosiasi"
            />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            <Zap className="h-4 w-4" /> {loading ? "Generating..." : "Generate RPP dengan AI"}
          </Button>
        </div>

        {generated && (
          <div className="mt-6 rounded-lg border bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="success">RPP Generated</Badge>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"><Download className="h-4 w-4" /> Download</Button>
                <Button size="sm" variant="ghost"><Edit2 className="h-4 w-4" /> Edit</Button>
              </div>
            </div>
            <h3 className="font-bold">{generated.title || "RPP Bahasa Indonesia"}</h3>
            <p className="text-sm text-gray-600 mt-1">{generated.description || "RPP lengkap dengan semua komponen"}</p>
          </div>
        )}
      </Card>

    </div>
  );
}