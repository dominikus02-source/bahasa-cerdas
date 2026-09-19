/**
 * P2.8 — Halaman terkunci Pendekar Suryakerta (server-rendered).
 *
 * Ditampilkan route /arena/game/rpg kepada user terautentikasi yang lolos
 * login tetapi TIDAK lolos entitlement Premium (fail closed — RPGGame tidak
 * pernah di-mount, tidak ada fetch state/pool dari sini).
 *
 * Bukan error generik: pesan jelas + CTA ke rute Premium kanonik
 * (/murid/premium, dipakai juga oleh halaman premium murid) + kembali.
 */

import Link from "next/link";
import { ArrowLeft, Crown, Shield } from "lucide-react";
import { RpgBlockedTracker } from "./RpgBlockedTracker";

export default function RpgLocked() {
  return (
    <div className="game-env game-env-rpg relative flex min-h-full items-center justify-center bg-slate-950 px-4 py-10">
      <RpgBlockedTracker />
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 shadow-lg">
          <Shield size={40} className="text-white" />
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-950">
          <Crown size={12} /> Premium
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-white">
          Pendekar Suryakerta
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Pendekar Suryakerta tersedia khusus untuk Murid Premium.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Jelajahi Desa Suryakerta, kalahkan Korog, dan asah Bahasa Indonesia
          dalam petualangan RPG — setelah akunmu Premium.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/murid/premium"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-3 text-sm font-extrabold text-amber-950 shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Crown size={16} /> Lihat Paket Premium
          </Link>
          <Link
            href="/arena/game"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-white/10 active:scale-[0.98]"
          >
            <ArrowLeft size={16} /> Kembali ke Game Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
