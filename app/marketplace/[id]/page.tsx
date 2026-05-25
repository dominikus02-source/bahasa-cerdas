"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShoppingBag, Download, Star, User, ChevronLeft, ShoppingCart, Plus, Minus, BookOpen, FileText, Video, File, Presentation, ClipboardList } from "lucide-react";
import Link from "next/link";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import ShareButton from "@/components/shared/ShareButton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarketplaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [karya, setKarya] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cartQty, setCartQty] = useState(0);
  const [currentImg, setCurrentImg] = useState(0);
  const karyaImages = karya ? (() => { try { return JSON.parse(karya.images || "[]"); } catch { return []; } })() : [];

  useEffect(() => {
    fetch(`/api/marketplace/${id}`)
      .then(r => r.json())
      .then(d => { setKarya(d.karya); setLoading(false); })
      .catch(() => setLoading(false));
    
    // Load cart from localStorage
    const cart = JSON.parse(localStorage.getItem("bc-cart") || "[]");
    const item = cart.find((i: any) => i.id === id);
    if (item) setCartQty(item.qty || 1);
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("bc-cart") || "[]");
    const idx = cart.findIndex((i: any) => i.id === id);
    if (idx >= 0) {
      cart[idx].qty = (cart[idx].qty || 1) + 1;
    } else {
      cart.push({ id, title: karya.title, price: karya.price, seller: karya.seller?.fullName, type: karya.type, qty: 1 });
    }
    localStorage.setItem("bc-cart", JSON.stringify(cart));
    setCartQty((cart.find((i: any) => i.id === id)?.qty) || 1);
    window.dispatchEvent(new Event("cart-update"));
  };

  const buyNow = () => {
    addToCart();
    router.push("/checkout");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" /></div>;

  if (!karya) return <div className="min-h-screen flex items-center justify-center text-slate-500">Karya tidak ditemukan</div>;

  const TYPES: Record<string, string> = { RPP: "RPP", MODUL: "Modul Ajar", PPT: "PPT", SOAL: "Bank Soal", VIDEO: "Video", EBOOK: "Ebook", ADMINISTRASI: "Administrasi", LAINNYA: "Lainnya" };
  const TYPE_ICONS: Record<string, any> = { RPP: BookOpen, MODUL: FileText, PPT: Presentation, SOAL: ClipboardList, VIDEO: Video, EBOOK: BookOpen, ADMINISTRASI: File, LAINNYA: File };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <PageNavbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-6">
          <ChevronLeft size={16} /> Kembali
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left - Images */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="bg-slate-50 rounded-xl flex items-center justify-center mb-3 overflow-hidden min-h-[300px] max-h-[500px]">
                {karyaImages[currentImg] ? (
                  <img src={karyaImages[currentImg]} alt="" className="w-full h-full object-contain" />
                ) : (
                  (() => { const Icon = TYPE_ICONS[karya.type] || ShoppingBag; return <Icon size={48} className="text-slate-300" />; })()
                )}
              </div>
              {karyaImages.length > 1 && (
                <div className="flex gap-2">
                  {karyaImages.map((img: string, i: number) => (
                    <button key={i} onClick={() => setCurrentImg(i)}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${i === currentImg ? 'border-red-500' : 'border-transparent'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right - Details */}
          <div>
            <span className="inline-block text-xs px-3 py-1 bg-red-50 text-red-600 rounded-full font-medium mb-3">
              {TYPES[karya.type] || karya.type}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{karya.title}</h1>
            {karya.seller && (
              <Link href={`/profile/${karya.seller.id}`} className="text-sm text-slate-500 flex items-center gap-1.5 mb-4 hover:text-emerald-600 transition-colors">
                <User size={14} /> oleh {karya.seller.fullName}
              </Link>
            )}

            <div className="border-t border-slate-100 pt-6 mb-6 artikel-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{karya.description}</ReactMarkdown>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
              <span className="flex items-center gap-1"><Download size={14} /> {karya.downloads} unduhan</span>
              <span className="flex items-center gap-1"><Star size={14} /> {karya._count?.purchases || 0} terjual</span>
              {karya.grade && <span>Kelas {karya.grade}</span>}
              <ShareButton url={`/marketplace/${karya.id}`} title={karya.title} />
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-red-600">
                  {karya.price > 0 ? `Rp ${karya.price.toLocaleString("id")}` : "Gratis"}
                </span>
                {karya.price > 0 && <span className="text-xs text-slate-400">Sudah termasuk PPN</span>}
              </div>

              <div className="flex gap-3">
                <button onClick={addToCart} className="flex-1 border-2 border-red-500 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                  <ShoppingCart size={18} /> {cartQty > 0 ? "Tambah Lagi" : "+ Keranjang"}
                </button>
                <button onClick={buyNow} className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                  Beli Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PageFooter />
    </div>
  );
}
