"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, LayoutDashboard, Sparkles, Search, Menu, X, ShoppingBag, Clock } from "lucide-react";

function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const cart = JSON.parse(localStorage.getItem("bc-cart") || "[]");
      setCount(cart.reduce((s: number, i: any) => s + (i.qty || 1), 0));
    };
    update();
    window.addEventListener("storage", update);
    window.addEventListener("cart-update", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("cart-update", update);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold px-1 leading-none shadow-sm">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function PageNavbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/kamus?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const triggerCartUpdate = () => {
    window.dispatchEvent(new Event("cart-update"));
  };

  const navLinks = [
    { href: "/marketplace", label: "Toko Karya" },
    { href: "/video-belajar", label: "Video" },
    { href: "/artikel", label: "Artikel" },
    { href: "/komunitas", label: "Komunitas" },
    { href: "/kamus", label: "Kamus" },
    { href: "/loker", label: "Lowongan" },
  ];

  const cartLink = (
    <Link
      href="/cart"
      onClick={triggerCartUpdate}
      className="relative p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
      title="Keranjang"
    >
      <ShoppingBag size={18} />
      <CartBadge />
    </Link>
  );

  const historyLink = (
    <Link
      href="/orders"
      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
      title="Riwayat Pembelian"
    >
      <Clock size={18} />
    </Link>
  );

  if (loading) return <div className="h-16" />;

  if (user) {
    const dashboardUrl = user.isFounder ? "/admin" : `/${user.role.toLowerCase()}/beranda`;
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href={dashboardUrl} className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 font-medium transition-colors">
            <ChevronLeft size={18} /> Kembali ke Dashboard
          </Link>
          <div className="flex items-center gap-1">
            {historyLink}
            {cartLink}
            <Link href="/" className="flex items-center gap-2 ml-2">
              <Image src="/logo.png" alt="BC" width={24} height={24} />
              <span className="font-bold text-slate-900 text-sm hidden sm:block">BahasaCerdas</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt="BC" width={28} height={28} />
          <span className="font-bold text-slate-900 text-sm hidden sm:block">BahasaCerdas</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-2">
          {historyLink}
          {cartLink}

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Search size={18} />
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <Link
            href="/ai-bc"
            className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <Sparkles size={14} /> AI BC
          </Link>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-red-600"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg transition-all"
          >
            Daftar
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          {historyLink}
          {cartLink}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-600 hover:text-red-600 rounded-xl transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari RPP, soal, artikel, materi ajar..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all bg-slate-50"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shrink-0"
            >
              Cari
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <Link
              href="/ai-bc"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded-xl"
            >
              <Sparkles size={14} /> AI BC
            </Link>
            <div className="flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg"
              >
                Daftar
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
