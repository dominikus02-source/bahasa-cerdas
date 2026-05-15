"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Clock, BookOpen, GraduationCap, Plus, X, Users, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BuatTKAPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [soal, setSoal] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", duration: 60, passingScore: 55, assignTo: "" });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/soal").then(r => r.json()).then(d => setSoal(d.data || d.soal || [])).catch(() => {});
    fetch("/api/group").then(r => r.json()).then(d => setGroups(d.groups || [])).catch(() => {});
  }, []);

  const toggleSoal = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!form.title || selected.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/guru/buat-tka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, soalIds: selected }),
      });
      const data = await res.json();
      if (data.paketId) {
        if (form.assignTo) {
          await fetch("/api/guru/assign-tka", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paketId: data.paketId, groupId: form.assignTo }),
          });
        }
        router.push("/guru/kelasku");
      }
    } catch {}
    setCreating(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buat TKA Baru</h1>
        <p className="text-sm text-gray-500 mt-1">Pilih soal dari Bank Soal untuk dibuat paket TKA</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex items-center gap-2 ${s > 1 ? "ml-2" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>{s}</div>
            <span className={`text-sm font-medium ${step >= s ? "text-emerald-700" : "text-slate-400"}`}>
              {s === 1 ? "Pilih Soal" : s === 2 ? "Atur Paket" : "Assign Kelas"}
            </span>
            {s < 3 && <ChevronRight size={16} className="text-slate-300" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">{soal.length} soal tersedia • {selected.length} dipilih</p>
            <Button onClick={() => setStep(2)} disabled={selected.length === 0}>
              Lanjut <ChevronRight size={16} />
            </Button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {soal.map((s: any, i: number) => (
              <button key={s.id || i} onClick={() => toggleSoal(s.id || String(i))}
                className={`w-full text-left rounded-xl p-4 border-2 transition-all ${selected.includes(s.id || String(i)) ? "border-emerald-500 bg-emerald-50" : "border-slate-100 hover:border-slate-200 bg-white"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected.includes(s.id || String(i)) ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                    {selected.includes(s.id || String(i)) && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{s.text || s.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{s.type || "PG"}</Badge>
                      <Badge variant={s.difficulty === "HARD" ? "destructive" : "warning"} className="text-[10px]">{s.difficulty}</Badge>
                      {s.kelas && <span className="text-[10px] text-slate-400">Kelas {s.kelas}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nama Paket TKA</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Latihan TKA - Teks Deskripsi" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Durasi (menit)</label>
                <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Nilai Lulus (%)</label>
                <input type="number" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">{selected.length} soal dipilih • {form.duration} menit</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
              <Button onClick={() => setStep(3)}>Lanjut ke Assign <ChevronRight size={16} /></Button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold">Assign ke Kelas (opsional)</p>
            {groups.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada kelas. Buat kelas dulu di menu KelasKu.</p>
            ) : (
              <div className="space-y-2">
                {groups.map((g: any) => (
                  <button key={g.id} onClick={() => setForm({ ...form, assignTo: form.assignTo === g.id ? "" : g.id })}
                    className={`w-full text-left rounded-xl p-4 border-2 transition-all ${form.assignTo === g.id ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-slate-400" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{g.name}</p>
                        <p className="text-xs text-slate-400">{g._count?.members || g.members?.length || 0} siswa</p>
                      </div>
                      {form.assignTo === g.id && <Check size={20} className="text-emerald-600" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Kembali</Button>
              <Button onClick={handleCreate} disabled={creating || !form.title}>
                {creating ? <><Loader2 size={16} className="animate-spin" /> Membuat...</> : <><Sparkles size={16} /> Buat TKA & Assign</>}
              </Button>
              <Button variant="outline" onClick={async () => {
                setCreating(true);
                const res = await fetch("/api/guru/buat-tka", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, soalIds: selected }) });
                const data = await res.json();
                if (data.paketId) router.push("/guru/kelasku");
                setCreating(false);
              }} disabled={creating || !form.title}>
                Simpan Saja (tanpa assign)
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
