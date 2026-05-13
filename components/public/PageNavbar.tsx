"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, LayoutDashboard } from "lucide-react";

export default function PageNavbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-16" />;

  if (user) {
    const dashboardUrl = user.isFounder ? "/admin" : `/${user.role.toLowerCase()}/beranda`;
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href={dashboardUrl} className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 font-medium transition-colors">
            <ChevronLeft size={18} /> Kembali ke Dashboard
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="BC" width={24} height={24} />
            <span className="font-bold text-slate-900 text-sm hidden sm:block">BahasaCerdas</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="BC" width={28} height={28} />
          <span className="font-bold text-slate-900 text-sm hidden sm:block">BahasaCerdas</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/marketplace" className="px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">Toko Karya</Link>
          <Link href="/video-belajar" className="px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">Video</Link>
          <Link href="/artikel" className="px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">Artikel</Link>
          <Link href="/kamus" className="px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">Kamus</Link>
          <Link href="/loker" className="px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">Lowongan</Link>
          <div className="h-5 w-px bg-slate-200 mx-2" />
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-red-600">Masuk</Link>
          <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg transition-all">Daftar</Link>
        </nav>
      </div>
    </header>
  );
}
