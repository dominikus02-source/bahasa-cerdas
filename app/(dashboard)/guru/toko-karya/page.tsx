"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUserStore } from "@/store";
import { UpgradeModal } from "@/components/shared/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Eye, Trash2, Crown, Check, FileText, Download, Loader2,
  X, Edit2, Store, TrendingUp, Package, DollarSign, Clock,
  CheckCircle2, AlertCircle, ArrowUpRight, ExternalLink,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const KARYA_TYPES = [
  { value: "RPP", label: "Rencana Pembelajaran" },
  { value: "MODUL", label: "Modul" },
  { value: "PPT", label: "PPT Presentasi" },
  { value: "SOAL", label: "Bank Soal" },
  { value: "VIDEO", label: "Video Belajar" },
  { value: "EBOOK", label: "Ebook" },
  { value: "ADMINISTRASI", label: "Administrasi" },
  { value: "LAINNYA", label: "Lainnya" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  PUBLISHED: { label: "Terbit", cls: "bg-blue-50 text-blue-700" },
  ARCHIVED: { label: "Diarsipkan", cls: "bg-gray-100 text-gray-500" },
};

const PENARIKAN_STATUS: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  PENDING: { label: "Menunggu", cls: "bg-amber-50 text-amber-700 border-amber-100", Icon: Clock },
  APPROVED: { label: "Disetujui", cls: "bg-blue-50 text-blue-700 border-blue-100", Icon: CheckCircle2 },
  TRANSFERRED: { label: "Ditransfer", cls: "bg-blue-50 text-blue-700 border-blue-100", Icon: CheckCircle2 },
  REJECTED: { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-100", Icon: X },
};

const MINIMAL_PENARIKAN = 50_000;

const rupiah = (v: number) => `Rp ${v.toLocaleString("id")}`;
const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const typeLabel = (v: string) => KARYA_TYPES.find((t) => t.value === v)?.label ?? v;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Karya {
  id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  downloads: number;
  grade: string | null;
  images: string;
  fileUrl: string;
  isPublished: boolean;
  createdAt: string;
  _count?: { purchases: number };
}

interface Penarikan {
  id: string;
  amount: number;
  status: string;
  bankName: string;
  accountNumber: string;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface Rincian {
  id: string;
  itemTitle: string;
  itemType: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  soldAt: string;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function TokoKaryaPage() {
  const user = useUserStore();
  const isPro = user.isPremium || user.isFounder;

  /* --- Karya state --- */
  const [karyaList, setKaryaList] = useState<Karya[]>([]);
  const [karyaLoading, setKaryaLoading] = useState(true);
  const [tab, setTab] = useState("karya");
  const [showUpgrade, setShowUpgrade] = useState(false);

  /* --- Wizard state --- */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0); // 0=detail, 1=harga, 2=file, 3=pratinjau
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imgLoading, setImgLoading] = useState(-1);
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "RPP",
    price: 0,
    grade: "",
    images: ["", "", ""] as string[],
  });

  /* --- Earnings state --- */
  const [saldo, setSaldo] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [rekeningLengkap, setRekeningLengkap] = useState(true);
  const [penarikan, setPenarikan] = useState<Penarikan[]>([]);
  const [rincian, setRincian] = useState<Rincian[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  /* ---------------------------------------------------------------- */
  /* Data fetching                                                     */
  /* ---------------------------------------------------------------- */

  const fetchKarya = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace?limit=100");
      const d = await res.json();
      setKaryaList(d.data || []);
    } catch {
      /* empty */
    }
    setKaryaLoading(false);
  }, []);

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch("/api/guru/earnings");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setSaldo(d.saldo || 0);
      setTotalEarned(d.totalEarned || 0);
      setRekeningLengkap(Boolean(d.rekeningLengkap));
      setPenarikan(d.penarikan || []);
      setRincian(d.rincian || []);
    } catch {
      /* empty */
    }
    setEarningsLoading(false);
  }, []);

  useEffect(() => {
    fetchKarya();
    fetchEarnings();
  }, [fetchKarya, fetchEarnings]);

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  const openTambah = () => {
    setFormData({ title: "", description: "", type: "RPP", price: 0, grade: "", images: ["", "", ""] });
    setEditId(null);
    setSelectedFile(null);
    setWizardStep(0);
    setShowForm(true);
  };

  const openEdit = (karya: Karya) => {
    let imgs = ["", "", ""];
    try {
      const parsed = JSON.parse(karya.images || "[]");
      if (Array.isArray(parsed)) {
        imgs = [parsed[0] || "", parsed[1] || "", parsed[2] || ""];
      }
    } catch { /* empty */ }
    setFormData({
      title: karya.title,
      description: karya.description,
      type: karya.type,
      price: karya.price,
      grade: karya.grade || "",
      images: imgs,
    });
    setEditId(karya.id);
    setWizardStep(0);
    setShowForm(true);
  };

  const handleSubmit = async (publish: boolean = true) => {
    if (publish && formData.price > 0 && !isPro) {
      setShowUpgrade(true);
      return;
    }
    if (!formData.title) return;
    setUploading(true);

    try {
      if (editId) {
        const res = await fetch("/api/marketplace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            title: formData.title,
            description: formData.description,
            type: formData.type,
            grade: formData.grade,
            price: formData.price,
            images: JSON.stringify(formData.images.filter(Boolean)),
            isPublished: publish,
          }),
        });
        if (res.ok) {
          setShowForm(false);
          setEditId(null);
          fetchKarya();
        } else {
          const err = await res.json();
          alert(err.error || "Gagal mengedit");
        }
      } else {
        const fd = new FormData();
        fd.set("title", formData.title);
        fd.set("description", formData.description);
        fd.set("type", formData.type);
        fd.set("grade", formData.grade);
        fd.set("price", String(formData.price));
        fd.set("isPublished", String(publish));
        fd.set("images", JSON.stringify(formData.images.filter(Boolean)));
        if (selectedFile) fd.set("file", selectedFile);

        const res = await fetch("/api/marketplace", { method: "POST", body: fd });
        if (res.ok) {
          setShowForm(false);
          setEditId(null);
          setFormData({ title: "", description: "", type: "RPP", price: 0, grade: "", images: ["", "", ""] });
          setSelectedFile(null);
          fetchKarya();
        } else {
          const err = await res.json().catch(() => ({ error: `Gagal upload (${res.status})` }));
          alert(err.error || "Gagal mempublikasikan");
        }
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus karya ini?")) return;
    await fetch(`/api/marketplace?id=${id}`, { method: "DELETE" });
    fetchKarya();
  };

  const confirmWithdraw = async () => {
    const nominal = parseInt(withdrawAmount || "0", 10);
    if (nominal < MINIMAL_PENARIKAN || nominal > saldo || withdrawLoading) return;
    setWithdrawLoading(true);
    setWithdrawError("");
    try {
      const res = await fetch("/api/guru/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: nominal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWithdrawError(data.error || "Gagal menarik saldo.");
        return;
      }
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      fetchEarnings();
    } catch {
      setWithdrawError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Derived                                                           */
  /* ---------------------------------------------------------------- */

  const totalTerjual = karyaList.reduce((s, k) => s + (k._count?.purchases || k.downloads || 0), 0);
  const filteredKarya = karyaList.filter((k) => {
    if (filterType !== "ALL" && k.type !== filterType) return false;
    if (filterStatus === "PUBLISHED" && !k.isPublished) return false;
    if (filterStatus === "DRAFT" && k.isPublished) return false;
    return true;
  });
  const adaPenarikanBerjalan = penarikan.some((p) => p.status === "PENDING" || p.status === "APPROVED");
  const nominal = parseInt(withdrawAmount || "0", 10);
  const nominalValid = nominal >= MINIMAL_PENARIKAN && nominal <= saldo;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-700 to-sky-600 flex items-center justify-center">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Toko Karya</h1>
            <p className="text-sm text-gray-500">Upload, jual, dan kelola karya ajar Anda</p>
          </div>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Karya", value: karyaLoading ? "…" : karyaList.length, icon: Package, color: "text-violet-600 bg-violet-50" },
          { label: "Total Terjual", value: karyaLoading ? "…" : totalTerjual, icon: Download, color: "text-sky-600 bg-sky-50" },
          { label: "Saldo Tersedia", value: earningsLoading ? "…" : rupiah(saldo), icon: DollarSign, color: "text-blue-700 bg-blue-50" },
          { label: "Total Pendapatan", value: earningsLoading ? "…" : rupiah(totalEarned), icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 truncate">{s.label}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Pro upsell (non-Pro) ──────────────────────────────────── */}
      {!isPro && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-4 flex items-center gap-4">
          <Crown className="h-8 w-8 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800">Upgrade ke Pro untuk menjual karya berbayar</p>
            <p className="text-sm text-amber-600">Dapatkan 85% komisi dari setiap penjualan</p>
          </div>
          <Button onClick={() => setShowUpgrade(true)} className="bg-amber-600 hover:bg-amber-700 shrink-0">
            Upgrade
          </Button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="karya">
            <Package className="h-4 w-4 mr-1.5" /> Karya Saya
          </TabsTrigger>
          <TabsTrigger value="pendapatan">
            <DollarSign className="h-4 w-4 mr-1.5" /> Pendapatan
          </TabsTrigger>
          <TabsTrigger value="jelajahi">
            <ExternalLink className="h-4 w-4 mr-1.5" /> Marketplace
          </TabsTrigger>
        </TabsList>

        {/* ────────────────────────────────────────────────────────── */}
        {/* TAB: KARYA SAYA                                          */}
        {/* ────────────────────────────────────────────────────────── */}
        <TabsContent value="karya">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button onClick={openTambah} className="bg-gradient-to-r from-blue-600 to-blue-700">
              <Plus size={16} /> Upload Karya
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-400">Tipe:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Tipe</option>
                {KARYA_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 ml-1">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua</option>
                <option value="PUBLISHED">Terbit</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          {/* ── Upload/Edit Wizard ──────────────────────────────────── */}
          {showForm && (
            <Card className="mb-6 border-2 border-blue-100 overflow-hidden">
              {/* Wizard header */}
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg text-gray-900">{editId ? "Ubah Karya" : "Unggah Karya Baru"}</h2>
                  <button onClick={() => { setShowForm(false); setEditId(null); setSelectedFile(null); setWizardStep(0); }} className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400">
                    <X size={18} />
                  </button>
                </div>
                {/* Step indicator */}
                <div className="flex items-center gap-1">
                  {["Detail", "Harga", "File & Gambar", "Pratinjau"].map((label, i) => (
                    <div key={label} className="flex items-center gap-1 flex-1">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        i < wizardStep ? "bg-blue-500 text-white" :
                        i === wizardStep ? "bg-emerald-600 text-white" :
                        "bg-gray-200 text-gray-400"
                      }`}>
                        {i < wizardStep ? <Check size={14} /> : i + 1}
                      </div>
                      <span className={`text-[11px] font-medium hidden sm:inline ${i === wizardStep ? "text-blue-700" : "text-gray-400"}`}>{label}</span>
                      {i < 3 && <div className={`flex-1 h-0.5 mx-1 rounded ${i < wizardStep ? "bg-emerald-400" : "bg-gray-200"}`} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* ── Step 0: Detail ──────────────────────────────── */}
                {wizardStep === 0 && (
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Judul Karya <span className="text-red-400">*</span></label>
                      <input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="Rencana Pembelajaran Bahasa Indonesia Kelas X"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Deskripsi</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                        rows={3}
                        placeholder="Jelaskan isi karya Anda secara singkat..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Tipe Karya</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm"
                        >
                          {KARYA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Kelas (opsional)</label>
                        <input
                          value={formData.grade}
                          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm"
                          placeholder="X / 1 / 7"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => setWizardStep(1)}
                        disabled={!formData.title}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Selanjutnya <ArrowUpRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 1: Harga ──────────────────────────────── */}
                {wizardStep === 1 && (
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Harga (Rp)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm"
                        placeholder="0 = Gratis"
                        min={0}
                      />
                      <p className="text-xs text-gray-400 mt-1">Atur 0 untuk karya gratis. Karya berbayar membutuhkan akun Pro.</p>
                    </div>
                    {formData.price > 0 && !isPro && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-700">Harga berbayar hanya tersedia untuk akun <strong>Pro</strong>. Upgrade untuk mulai menjual.</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Komisi platform: 15%</p>
                        <p className="text-xs text-gray-500">Anda mendapatkan 85% dari setiap penjualan</p>
                      </div>
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setWizardStep(0)}>Kembali</Button>
                      <Button onClick={() => setWizardStep(2)} className="bg-emerald-600 hover:bg-emerald-700">
                        Selanjutnya <ArrowUpRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: File & Gambar ──────────────────────── */}
                {wizardStep === 2 && (
                  <div className="space-y-5 max-w-xl">
                    {!editId && (
                      <div>
                        <label className="block text-sm font-semibold mb-1">File Karya</label>
                        <input
                          type="file"
                          accept=".pdf,.epub,.docx,.pptx,.xlsx,.zip,.mp4"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="karya-file-input"
                        />
                        <label
                          htmlFor="karya-file-input"
                          className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-emerald-500 hover:bg-blue-50 transition-colors"
                        >
                          {selectedFile ? (
                            <div className="flex items-center gap-2">
                              <FileText size={20} className="text-blue-700" />
                              <span className="text-sm font-medium text-blue-700">{selectedFile.name}</span>
                              <span className="text-xs text-gray-400">({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <FileText size={28} className="mx-auto text-gray-300 mb-1" />
                              <p className="text-sm text-gray-600">Klik untuk pilih file</p>
                              <p className="text-xs text-gray-400">PDF, DOCX, PPT, XLSX, ZIP — Max 100MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold mb-2">Gambar Produk (hingga 3)</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((i) => (
                          <div key={i}>
                            <div className={`border-2 border-dashed rounded-xl p-3 text-center ${formData.images[i] ? "border-emerald-300 bg-blue-50" : "border-gray-300"}`}>
                              {formData.images[i] ? (
                                <div className="relative">
                                  <img
                                    src={formData.images[i]}
                                    alt=""
                                    className="w-full h-24 object-contain rounded-lg bg-white"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="10">Gambar</text></svg>';
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => { const imgs = [...formData.images]; imgs[i] = ""; setFormData({ ...formData, images: imgs }); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="h-10 flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" strokeWidth="1.5">
                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                      <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-1">Gambar {i + 1}</p>
                                </>
                              )}
                              <input
                                value={formData.images[i]}
                                onChange={(e) => { const imgs = [...formData.images]; imgs[i] = e.target.value; setFormData({ ...formData, images: imgs }); }}
                                className="mt-1 w-full text-[10px] px-2 py-1 rounded border border-gray-200 focus:border-emerald-500 focus:outline-none"
                                placeholder="URL gambar..."
                              />
                              {imgLoading === i ? (
                                <div className="mt-1 text-[10px] text-blue-700 text-center">
                                  <Loader2 size={12} className="inline animate-spin" /> Mengunggah...
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = "image/*";
                                    input.onchange = async () => {
                                      const file = input.files?.[0];
                                      if (!file) return;
                                      setImgLoading(i);
                                      const fd = new FormData();
                                      fd.set("file", file);
                                      const res = await fetch("/api/upload/file", { method: "POST", body: fd });
                                      const data = await res.json();
                                      if (res.ok && data.url) {
                                        const imgs = [...formData.images];
                                        imgs[i] = data.url;
                                        setFormData({ ...formData, images: imgs });
                                      }
                                      setImgLoading(-1);
                                    };
                                    input.click();
                                  }}
                                  className="mt-1 w-full text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                >
                                  Unggah Gambar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Minimal 1 gambar agar karya terlihat menarik di marketplace</p>
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setWizardStep(1)}>Kembali</Button>
                      <Button onClick={() => setWizardStep(3)} className="bg-emerald-600 hover:bg-emerald-700">
                        Pratinjau <ArrowUpRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Pratinjau & Publish ────────────────── */}
                {wizardStep === 3 && (
                  <div className="space-y-5">
                    <p className="text-sm text-gray-500">Pratinjau karya Anda sebelum dipublikasikan:</p>
                    {/* Preview card */}
                    <div className="max-w-sm rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-blue-50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="text-[10px] bg-amber-50 text-amber-700">{formData.price > 0 ? "Berbayar" : "Gratis"}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{typeLabel(formData.type)}</Badge>
                        </div>
                        <h3 className="font-bold text-gray-900 line-clamp-1">{formData.title || "Judul Karya"}</h3>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{formData.description || "Tidak ada deskripsi"}</p>
                        {formData.grade && <span className="text-[10px] text-gray-400 mt-1 block">Kelas {formData.grade}</span>}
                      </div>
                      <div className="p-4 flex items-center justify-between border-t border-gray-100">
                        <span className="font-semibold text-blue-700 text-sm">
                          {formData.price > 0 ? rupiah(formData.price) : "Gratis"}
                        </span>
                        {formData.images.filter(Boolean).length > 0 && (
                          <div className="flex -space-x-2">
                            {formData.images.filter(Boolean).slice(0, 3).map((img, i) => (
                              <img key={i} src={img} alt="" className="w-6 h-6 rounded-md border-2 border-white object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {formData.price > 0 && !isPro && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-700">Harga berbayar membutuhkan akun <strong>Pro</strong>. Karya akan disimpan sebagai draft.</p>
                      </div>
                    )}

                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setWizardStep(2)}>Kembali</Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleSubmit(false)}
                          disabled={uploading || !formData.title}
                        >
                          {uploading ? <Loader2 size={14} className="animate-spin" /> : <><FileText size={14} className="mr-1" /> Simpan Draft</>}
                        </Button>
                        <Button
                          onClick={() => handleSubmit(true)}
                          disabled={uploading || !formData.title}
                          className="bg-gradient-to-r from-blue-600 to-blue-700"
                        >
                          {uploading ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} className="mr-1" /> {editId ? "Simpan & Terbitkan" : "Publikasikan"}</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Karya grid */}
          {karyaLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : filteredKarya.length === 0 ? (
            <Card className="py-16 text-center">
              <Package className="mx-auto h-14 w-14 text-gray-200" />
              <h3 className="mt-4 font-semibold text-gray-900">
                {filterType === "ALL" ? "Belum ada karya" : "Tidak ada karya dengan tipe ini"}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {filterType === "ALL" ? "Upload karya pertama Anda untuk mulai dijual" : "Coba filter tipe lain atau unggah karya baru"}
              </p>
              {filterType === "ALL" && (
                <Button onClick={openTambah} className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700">
                  <Plus size={16} /> Upload Karya
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredKarya.map((karya) => {
                const status = karya.isPublished ? STATUS_BADGE.PUBLISHED : STATUS_BADGE.DRAFT;
                return (
                  <Card key={karya.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <div className="bg-blue-50 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`text-[10px] ${status.cls}`}>{status.label}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{typeLabel(karya.type)}</Badge>
                      </div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{karya.title}</h3>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{karya.description}</p>
                      {karya.grade && <span className="text-[10px] text-gray-400 mt-1 block">Kelas {karya.grade}</span>}
                    </div>
                    <div className="p-4 flex items-center justify-between border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="font-semibold text-blue-700">
                          {karya.price > 0 ? rupiah(karya.price) : "Gratis"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download size={12} /> {karya._count?.purchases || karya.downloads || 0}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={karya.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                          <Eye size={14} />
                        </a>
                        <button onClick={() => openEdit(karya)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(karya.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────────────── */}
        {/* TAB: PENDAPATAN                                           */}
        {/* ────────────────────────────────────────────────────────── */}
        <TabsContent value="pendapatan">
          {earningsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Balance card */}
              <Card className="p-6 bg-gradient-to-r from-blue-700 to-sky-600 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm opacity-80">Saldo Tersedia</p>
                    <p className="text-3xl font-bold mt-1">{rupiah(saldo)}</p>
                    <p className="text-sm opacity-80 mt-1">Total pendapatan: {rupiah(totalEarned)}</p>
                  </div>
                  <Button
                    onClick={() => { setWithdrawError(""); setShowWithdrawModal(true); }}
                    disabled={saldo < MINIMAL_PENARIKAN || !rekeningLengkap || adaPenarikanBerjalan}
                    variant="secondary"
                    className="bg-white/20 border-0 text-white hover:bg-white/30 disabled:opacity-50 shrink-0"
                  >
                    <ArrowUpRight className="h-4 w-4" /> Cairkan Saldo
                  </Button>
                </div>
                {!rekeningLengkap && (
                  <p className="text-xs mt-3 opacity-90">
                    Lengkapi data rekening di{" "}
                    <Link href="/guru/profile" className="underline font-semibold">Profil</Link>{" "}
                    untuk bisa mencairkan saldo.
                  </p>
                )}
                {rekeningLengkap && adaPenarikanBerjalan && (
                  <p className="text-xs mt-3 opacity-90">Ada penarikan yang sedang diproses.</p>
                )}
                {rekeningLengkap && !adaPenarikanBerjalan && saldo < MINIMAL_PENARIKAN && (
                  <p className="text-xs mt-3 opacity-90">Penarikan minimal {rupiah(MINIMAL_PENARIKAN)}.</p>
                )}
              </Card>

              {/* Riwayat penarikan */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Riwayat Penarikan</h3>
                {penarikan.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Belum ada riwayat penarikan</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {penarikan.map((p) => {
                      const meta = PENARIKAN_STATUS[p.status] || PENARIKAN_STATUS.PENDING;
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{rupiah(p.amount)}</p>
                            <p className="text-xs text-gray-500">
                              {p.bankName} &middot; {p.accountNumber} &middot; {tanggal(p.createdAt)}
                            </p>
                            {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${meta.cls}`}>
                            <meta.Icon size={12} /> {meta.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Penjualan terakhir */}
              {rincian.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Penjualan Terakhir</h3>
                  <div className="space-y-2">
                    {rincian.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{r.itemTitle}</p>
                          <p className="text-xs text-gray-500">{tanggal(r.soldAt)} &middot; {typeLabel(r.itemType)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-blue-700">+{rupiah(r.netAmount)}</p>
                          <p className="text-[11px] text-gray-400">dari {rupiah(r.grossAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Tips */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Tips Mendapatkan Saldo</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Jual Karya Berkualitas</p>
                      <p className="text-xs text-gray-500">RPP, modul, dan soal yang dibuat dengan baik akan lebih laku</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Crown className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Upgrade ke Pro</p>
                      <p className="text-xs text-gray-500">Akun Pro bisa mengatur harga untuk karya berbayar</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ────────────────────────────────────────────────────────── */}
        {/* TAB: MARKETPLACE (link out)                               */}
        {/* ────────────────────────────────────────────────────────── */}
        <TabsContent value="jelajahi">
          <Card className="py-16 text-center">
            <Store className="mx-auto h-14 w-14 text-gray-200" />
            <h3 className="mt-4 font-semibold text-gray-900">Marketplace BahasaCerdas</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Jelajahi karya dari guru Bahasa Indonesia lainnya. Temukan RPP, modul, soal, dan materi ajar berkualitas.
            </p>
            <Link href="/marketplace" className="inline-flex mt-4">
              <Button variant="outline">
                <ExternalLink size={16} className="mr-2" /> Buka Marketplace
              </Button>
            </Link>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Withdraw modal ────────────────────────────────────────── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-1">Cairkan Saldo</h3>
            <p className="text-sm text-gray-500 mb-4">
              Saldo tersedia: {rupiah(saldo)} &middot; minimal {rupiah(MINIMAL_PENARIKAN)}
            </p>
            <input
              type="number"
              placeholder="Masukkan jumlah penarikan"
              value={withdrawAmount}
              onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(""); }}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {withdrawAmount && !nominalValid && (
              <p className="text-xs text-amber-600 mt-2">
                {nominal > saldo ? "Jumlah melebihi saldo yang tersedia." : `Penarikan minimal ${rupiah(MINIMAL_PENARIKAN)}.`}
              </p>
            )}
            {withdrawError && (
              <p className="text-xs text-red-600 mt-2 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {withdrawError}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Dana masuk ke rekening terdaftar dalam 1–3 hari kerja setelah disetujui admin.
            </p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => { setShowWithdrawModal(false); setWithdrawError(""); }} variant="outline" className="flex-1">
                Batal
              </Button>
              <Button onClick={confirmWithdraw} disabled={withdrawLoading || !nominalValid} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Konfirmasi"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade modal ─────────────────────────────────────────── */}
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="jual karya" />
    </div>
  );
}
