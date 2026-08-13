"use client";

import { useState, useEffect, useRef } from "react";
import { Video, Save, Loader2, CheckCircle2, AlertCircle, Trash2, Users, Image as ImageIcon, X, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MgmpMedia =
  | { type: "none" }
  | { type: "photo"; photos: { url: string; key: string }[] }
  | { type: "video"; videoId: string };

export default function AdminPengaturanPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Pengaturan Landing Page</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Konten yang bisa diubah tanpa perlu deploy kode.</p>
      </div>
      <PromoVideoCard />
      <MgmpMediaCard />
    </div>
  );
}

function PromoVideoCard() {
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

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Video size={18} className="text-primary" />
        <h2 className="font-bold text-slate-900 dark:text-slate-100">Video Promosi</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
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
              <button onClick={() => setInput("")} type="button" title="Kosongkan" className="px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 dark:text-red-400 hover:border-red-200 dark:border-red-800 transition-colors">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {message && (
            <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 mb-3 ${message.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"}`}>
              {message.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary-dark text-white">
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Simpan
          </Button>

          {videoId && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Pratinjau saat ini</p>
              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-md">
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
  );
}

function MgmpMediaCard() {
  const [media, setMedia] = useState<MgmpMedia>({ type: "none" });
  const [tab, setTab] = useState<"none" | "photo" | "video">("none");
  const [photos, setPhotos] = useState<{ url: string; key: string }[]>([]);
  const [videoInput, setVideoInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyMedia = (m: MgmpMedia) => {
    setMedia(m);
    setTab(m.type);
    setPhotos(m.type === "photo" ? m.photos : []);
    setVideoInput(m.type === "video" ? m.videoId : "");
  };

  useEffect(() => {
    fetch("/api/admin/settings/mgmp-media")
      .then(r => r.json())
      .then(d => applyMedia(d.media || { type: "none" }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const fd = new FormData();
        fd.set("file", file);
        fd.set("folder", "mgmp-kegiatan");
        const res = await fetch("/api/upload/file", { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Unggah gagal");
        setPhotos(prev => [...prev, { url: d.url, key: d.key }]);
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (key: string) => setPhotos(prev => prev.filter(p => p.key !== key));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body =
        tab === "none" ? { type: "none" } :
        tab === "video" ? { type: "video", input: videoInput } :
        { type: "photo", photos };

      const res = await fetch("/api/admin/settings/mgmp-media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal menyimpan");
      applyMedia(d.media);
      setMessage({ type: "success", text: "Kartu kegiatan MGMP diperbarui." });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users size={18} className="text-primary" />
        <h2 className="font-bold text-slate-900 dark:text-slate-100">Kegiatan MGMP</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Kartu "Aktif" pada bagian komunitas di bahasacerdas.com. Isi dengan foto atau video kegiatan MGMP, atau kosongkan untuk tampilan default.
      </p>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl mb-4 w-fit">
            {[
              { key: "none" as const, label: "Default" },
              { key: "photo" as const, label: "Foto" },
              { key: "video" as const, label: "Video" },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t.key ? "bg-white dark:bg-slate-800/90 text-primary shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "none" && (
            <p className="text-sm text-slate-400 mb-4">Kartu akan menampilkan teks "Aktif — Forum diskusi sudah live" seperti biasa.</p>
          )}

          {tab === "photo" && (
            <div className="mb-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={e => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 mb-3"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? "Mengunggah..." : "Unggah Foto (bisa beberapa sekaligus)"}
              </button>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(p => (
                    <div key={p.key} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.key)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "video" && (
            <div className="mb-4">
              <Input
                value={videoInput}
                onChange={e => setVideoInput(e.target.value)}
                placeholder="https://youtu.be/... atau ID video"
              />
            </div>
          )}

          {message && (
            <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 mb-3 ${message.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"}`}>
              {message.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving || uploading} className="bg-primary hover:bg-primary-dark text-white">
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Simpan
          </Button>
        </>
      )}
    </Card>
  );
}
