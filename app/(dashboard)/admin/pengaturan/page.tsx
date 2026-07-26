"use client";

import { useState, useEffect } from "react";
import { Video, Save, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPengaturanPage() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/promo-video")
      .then(r => r.json())
      .then(d => { setVideoId(d.videoId || null); setInput(d.videoId || ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/promo-video", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal menyimpan");
      setVideoId(d.videoId);
      setInput(d.videoId || "");
      setMessage({ type: "success", text: d.videoId ? "Video promosi diperbarui." : "Video promosi dihapus — halaman utama akan menampilkan placeholder." });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setInput("");
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Pengaturan Landing Page</h1>
      <p className="text-sm text-slate-500 mb-6">Konten yang bisa diubah tanpa perlu deploy kode.</p>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Video size={18} className="text-primary" />
          <h2 className="font-bold text-slate-900">Video Promosi</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Video yang tampil di bahasacerdas.com, tepat di bawah statistik hero. Ganti kapan saja sesuai event — tempel link YouTube apapun bentuknya (watch, youtu.be, atau embed), atau ID videonya saja.
        </p>

        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="https://youtu.be/... atau ID video"
                className="flex-1"
              />
              {input && (
                <button onClick={handleClear} type="button" title="Kosongkan" className="px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {message && (
              <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 mb-3 ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {message.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {message.text}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary-dark text-white">
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Simpan
            </Button>

            {videoId && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pratinjau saat ini</p>
                <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 max-w-md">
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="Pratinjau video promosi"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
