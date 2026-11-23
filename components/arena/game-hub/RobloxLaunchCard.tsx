"use client";

import { ExternalLink, Gamepad2, Download } from "lucide-react";
import {
  ROBLOX_LOBBY_WEB_URL,
  ROBLOX_LOBBY_APP_URL,
  ROBLOX_DOWNLOAD_URL,
} from "@/lib/arena/roblox-destinations";

/** Non-destructive teaser during PRIVATE Roblox soft launch.
 * External navigation only; no account-linking, cookies, or unsafe redirects.
 */
export default function RobloxLaunchCard() {
  return (
    <section aria-label="Main di Roblox" className="mb-5 overflow-hidden rounded-3xl border border-violet-300/50 bg-gradient-to-r from-violet-700 via-violet-600 to-blue-600 p-5 text-white shadow-lg sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="max-w-lg">
          <p className="mb-1 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-200">
            <Gamepad2 size={18} /> Kota Aksara Langit
          </p>
          <h2 className="text-2xl font-black">Main di Roblox</h2>
          <p className="mt-1 text-sm text-violet-50">
            Jelajahi lobby BahasaCerdas, temui AKSI, dan coba permainan Benar atau Salah.
          </p>
          <p className="mt-2 text-xs font-semibold text-amber-100">
            Uji coba privat. Hanya akun Roblox dengan izin akses yang dapat masuk.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <a href={ROBLOX_LOBBY_WEB_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-900 transition-transform hover:scale-[1.02] active:scale-95 sm:flex-none">
            Main di Roblox <ExternalLink size={16} />
          </a>
          <a href={ROBLOX_LOBBY_APP_URL}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-white/50 bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/20 sm:flex-none">
            Buka aplikasi
          </a>
          <a href={ROBLOX_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/30 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 sm:w-auto">
            <Download size={15} /> Belum punya Roblox?
          </a>
        </div>
      </div>
    </section>
  );
}
