"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound, ChevronRight, Bell, Settings,
  Wallet, LogOut, Medal, Sparkles, CreditCard, Mail,
} from "lucide-react";
import { useUserStore } from "@/store";
import { Badge as UIBadge } from "@/components/ui/badge";
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks";
import { levelFromXp } from "@/lib/gamification/levels";

interface Quota {
  plan?: string;
  unlimited?: boolean;
  isTrial?: boolean;
  trialEndsAt?: string | null;
  daysRemaining?: number;
  remainingCredits?: number;
  creditsTotal?: number;
}

interface DashPayload {
  totalSiswa?: number;
  saldo?: number;
  terjualBulanIni?: number;
}

export default function GuruAkunPage() {
  const router = useRouter();
  const user = useUserStore();
  const [plan, setPlan] = useState<Quota | null>(null);
  const [dash, setDash] = useState<DashPayload | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/ai/quota/status").then((r) => (r.ok ? r.json() : null)).then(setPlan).catch(() => {});
    fetch("/api/guru/dashboard").then((r) => (r.ok ? r.json() : null)).then((d) => setDash(d || null)).catch(() => {});
    fetch("/api/player/badges").then((r) => (r.ok ? r.json() : null)).then((d) => {
      const items = d?.badges || d?.items || [];
      setBadgeCount(items.filter((b: any) => b.unlocked && String(b.code || "").startsWith("guru-")).length);
    }).catch(() => {});
    fetch("/api/notifikasi?unread=true").then((r) => (r.ok ? r.json() : null)).then((d) => {
      setUnreadNotif(d?.notifications?.length || 0);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/masuk");
    router.refresh();
  };

  const fullName = user?.fullName || "Guru";
  const initial = fullName.charAt(0).toUpperCase();
  const rank = user ? rankFromLevel(levelFromXp(user.xp || 0)) : null;

  const menuItems: {
    icon: any; label: string; desc: string; href: string; color: string; badge?: string;
  }[] = [
    { icon: UserRound, label: "Profil & Statistik", desc: "Bio, sekolah, No. Absensi, portofolio", href: "/guru/profile", color: "from-emerald-500 to-emerald-600", badge: "Edit" },
    { icon: CreditCard, label: "Berlangganan", desc: plan ? `Paket ${plan.plan || "Gratis"}` : "Paket & pembayaran Pro", href: "/guru/berlangganan", color: "from-amber-500 to-yellow-500", badge: plan?.isTrial ? `Trial ${plan.daysRemaining} hari` : undefined },
    { icon: Wallet, label: "Saldo & Pendapatan", desc: `Saldo Rp${(dash?.saldo || 0).toLocaleString("id-ID")} • terjual bulan ini ${dash?.terjualBulanIni || 0}`, href: "/guru/pengaturan/saldo", color: "from-emerald-500 to-teal-600" },
    { icon: Medal, label: "Lencana Guru", desc: `${badgeCount} lencana terkunci terbuka`, href: "/guru/game/achievement", color: "from-violet-500 to-purple-600", badge: badgeCount ? `${badgeCount} dibuka` : undefined },
    { icon: Bell, label: "Notifikasi", desc: unreadNotif ? `${unreadNotif} belum dibaca` : "Semua sudah dibaca", href: "/guru/notifikasi", color: "from-sky-500 to-blue-600", badge: unreadNotif ? String(unreadNotif) : undefined },
    { icon: Settings, label: "Pengaturan", desc: "Kata sandi, keamanan, preferensi", href: "/guru/pengaturan", color: "from-slate-500 to-slate-700" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header identitas */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-3xl p-6 text-white relative overflow-hidden mb-6">
        <div className="absolute -right-8 -top-8 opacity-15"><Sparkles size={140} /></div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold">{initial}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{fullName}</h1>
            <p className="text-emerald-100 text-xs flex items-center gap-1.5 mt-1">
              <Mail size={12} /> {user?.email || ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <UIBadge className="bg-white/20 text-white border-white/30">{user?.role === "GURU" ? "Guru" : "Murid"}</UIBadge>
              {rank && (
                <UIBadge className="bg-amber-400/20 text-amber-100 border-amber-300/40">{RANK_META[rank]?.label}</UIBadge>
              )}
              {user?.isFounder && (
                <UIBadge className="bg-white/20 text-white border-white/30">Founder</UIBadge>
              )}
              {plan?.isTrial && (
                <UIBadge className="bg-violet-400/20 text-violet-100 border-violet-300/40">Trial Pro</UIBadge>
              )}
              {plan?.plan === "GURU_PRO_MONTHLY" || plan?.plan === "GURU_PRO_YEARLY" ? (
                <UIBadge className="bg-amber-400/20 text-amber-100 border-amber-300/40">Pro</UIBadge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6 text-center">
          <div className="bg-white/10 rounded-2xl py-3">
            <p className="text-lg font-bold">{(user?.xp || 0).toLocaleString()}</p>
            <p className="text-[10px] text-emerald-100 uppercase tracking-wide mt-0.5">XP Guru</p>
          </div>
          <div className="bg-white/10 rounded-2xl py-3">
            <p className="text-lg font-bold">{user?.level || 1}</p>
            <p className="text-[10px] text-emerald-100 uppercase tracking-wide mt-0.5">Level</p>
          </div>
          <div className="bg-white/10 rounded-2xl py-3">
            <p className="text-lg font-bold">{(dash?.totalSiswa || 0).toLocaleString()}</p>
            <p className="text-[10px] text-emerald-100 uppercase tracking-wide mt-0.5">Siswa</p>
          </div>
        </div>
      </div>

      {/* Menu Akun */}
      <div className="space-y-3">
        {menuItems.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-emerald-200 transition-all group"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
              <m.icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                {m.label}
                {m.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{m.badge}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{m.desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>

      {/* Keluar */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-100 text-red-600 hover:bg-red-50 font-semibold text-sm transition-all disabled:opacity-50"
      >
        <LogOut size={16} /> {loggingOut ? "Keluar..." : "Keluar Akun"}
      </button>
    </div>
  );
}