"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Download, Filter, Grid3x3, List, Star, DownloadCloud } from "lucide-react";

interface Karya {
  id: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  price: number;
  downloads: number;
  grade: string | null;
  subject: string | null;
  isPremium: boolean;
  seller: { id: string; fullName: string; avatar: string | null };
  _count: { purchases: number };
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  RPP: "RPP",
  MODUL: "Modul",
  PPT: "PowerPoint",
  SOAL: "Bank Soal",
  VIDEO: "Video",
  EBOOK: "eBook",
  ADMINISTRASI: "Administrasi",
  LAINNYA: "Lainnya",
};

const TYPE_COLORS: Record<string, string> = {
  RPP: "bg-blue-500",
  MODUL: "bg-green-500",
  PPT: "bg-orange-500",
  SOAL: "bg-purple-500",
  VIDEO: "bg-red-500",
  EBOOK: "bg-yellow-500",
  ADMINISTRASI: "bg-cyan-500",
  LAINNYA: "bg-slate-500",
};

export default function MarketplaceBrowse() {
  const [karyaList, setKaryaList] = useState<Karya[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchKarya = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      params.set("sort", sort);
      if (reset) params.set("page", "1");
      else params.set("page", page.toString());

      const res = await fetch(`/api/marketplace/browse?${params.toString()}`);
      const data = await res.json();

      if (data.data) {
        setKaryaList(reset ? data.data : [...karyaList, ...data.data]);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch karya:", error);
    } finally {
      setLoading(false);
    }
  }, [type, sort, page]);

  useEffect(() => {
    fetchKarya(true);
  }, [type, sort]);

  const handlePurchase = async (karyaId: string) => {
    setPurchasingId(karyaId);
    try {
      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karyaId }),
      });
      const data = await res.json();

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.fileUrl) {
        await navigator.clipboard.writeText(data.fileUrl);
        alert("Link download gratis sudah disalin! Paste di browser untuk mengunduh.");
        window.open(data.fileUrl, "_blank");
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Gagal memproses pembelian");
    } finally {
      setPurchasingId(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "GRATIS";
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Toko Karya</h1>
          </div>
          <p className="text-emerald-100">Temukan RPP, Modul, Soal, dan sumber belajar berkualitas dari guru-guru Indonesia</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {["", "RPP", "MODUL", "PPT", "SOAL", "EBOOK", "ADMINISTRASI"].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${type === t ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                {t === "" ? "Semua" : TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="ml-auto px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="newest">Terbaru</option>
            <option value="popular">Terpopuler</option>
            <option value="price_asc">Harga: Rendah ke Tinggi</option>
            <option value="price_desc">Harga: Tinggi ke Rendah</option>
          </select>

          <div className="flex gap-1">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-400"}`}>
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === "list" ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-400"}`}>
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {karyaList.map((karya) => (
              <div key={karya.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 ${TYPE_COLORS[karya.type] || "bg-slate-500"} text-white text-xs font-bold rounded`}>
                      {TYPE_LABELS[karya.type] || karya.type}
                    </span>
                    {karya.isPremium && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">PREMIUM</span>}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{karya.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{karya.description}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                      {karya.seller.fullName.charAt(0)}
                    </div>
                    <span className="text-xs text-slate-600">{karya.seller.fullName}</span>
                    <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                      <DownloadCloud className="w-3 h-3" /> {karya.downloads}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold ${karya.price === 0 ? "text-green-600" : "text-emerald-600"}`}>
                      {formatPrice(karya.price)}
                    </span>
                    <button
                      onClick={() => handlePurchase(karya.id)}
                      disabled={purchasingId === karya.id}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {purchasingId === karya.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          {karya.price === 0 ? "Unduh" : "Beli"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {karyaList.map((karya) => (
              <div key={karya.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 hover:shadow-md transition-all">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-2xl font-bold text-slate-400 shrink-0">
                  {TYPE_LABELS[karya.type]?.charAt(0) || "F"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 ${TYPE_COLORS[karya.type] || "bg-slate-500"} text-white text-xs font-bold rounded`}>
                      {TYPE_LABELS[karya.type] || karya.type}
                    </span>
                    {karya.isPremium && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">PREMIUM</span>}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1 truncate">{karya.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{karya.seller.fullName}</span>
                    <span className="flex items-center gap-1"><DownloadCloud className="w-3 h-3" /> {karya.downloads}x</span>
                    {karya.grade && <span>{karya.grade}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold mb-2 ${karya.price === 0 ? "text-green-600" : "text-emerald-600"}`}>
                    {formatPrice(karya.price)}
                  </div>
                  <button
                    onClick={() => handlePurchase(karya.id)}
                    disabled={purchasingId === karya.id}
                    className="px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {purchasingId === karya.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {karya.price === 0 ? "Unduh" : "Beli"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Memuat karya...</p>
          </div>
        )}

        {!loading && page < totalPages && (
          <div className="text-center mt-8">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Muat Lebih Banyak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}