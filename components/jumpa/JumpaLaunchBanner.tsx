"use client";

/**
 * Banner peluncuran JUMPA di beranda guru & murid. Komponen HTML/CSS
 * responsif (bukan gambar statis), gaya mengikuti banner 1200×630.
 * Bisa ditutup; pilihan disimpan di localStorage (per pengguna bila `userKey`
 * diberikan). Tidak tampil bila flag JUMPA mati.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Hand, Mic, MonitorUp, PhoneOff, Video, X } from "lucide-react";
import { JUMPA_ENABLED } from "@/lib/features";
import "./jumpa-entry.css";

export const JUMPA_BANNER_KEY = "bc-jumpa-banner-v1";

const TILES = [
  { img: "rina", name: "Bu Rina", host: true },
  { img: "dimas", name: "Dimas" },
  { img: "ani", name: "Ani", speaking: true },
  { img: "budi", name: "Pak Budi" },
  { img: "citra", name: "Citra" },
  { img: "dewi", name: "Dewi" },
];

function storageKey(userKey?: string | null) {
  return userKey ? `${JUMPA_BANNER_KEY}:${userKey}` : JUMPA_BANNER_KEY;
}

export function isBannerDismissed(userKey?: string | null): boolean {
  try {
    return window.localStorage.getItem(storageKey(userKey)) === "1" || window.localStorage.getItem(JUMPA_BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

export default function JumpaLaunchBanner({ userKey, className = "" }: { userKey?: string | null; className?: string }) {
  // Tunggu klien membaca localStorage: tidak ada kedip banner yang sudah ditutup.
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (JUMPA_ENABLED) setShow(!isBannerDismissed(userKey));
  }, [userKey]);

  if (!JUMPA_ENABLED || !show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(storageKey(userKey), "1");
    } catch {
      // Mode privat: banner tetap tertutup untuk sesi ini.
    }
  };

  return (
    <section className={`jpe jpb ${className}`} aria-labelledby="jumpa-banner-title">
      <button type="button" className="jpb-close" onClick={dismiss} aria-label="Tutup banner JUMPA">
        <X size={20} aria-hidden />
      </button>
      <div className="min-w-0">
        <p className="jpb-tag"><i aria-hidden />BARU di BahasaCerdas</p>
        <h2 id="jumpa-banner-title" className="jpb-word">JUMPA</h2>
        <p className="jpb-sub">Ruang video kelas, langsung di BahasaCerdas.</p>
        <Link href="/jumpa" className="jpb-cta">
          Coba JUMPA <span aria-hidden><ArrowRight size={18} /></span>
        </Link>
      </div>
      <div className="jpb-screen" aria-hidden>
        <div className="jpb-head">
          <span className="jpb-mark">J</span>
          <span className="jpe-trunc">Bahasa Indonesia XI-2</span>
          <span className="jpe-live ml-auto"><span className="jpe-dot" />Berlangsung</span>
        </div>
        <div className="jpb-grid">
          {TILES.map((t) => (
            <div key={t.img} className="jpb-tile" data-speaking={t.speaking ? "true" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ilustrasi kecil (≤12 KB), lazy */}
              <img src={`/jumpa/wajah/${t.img}.webp`} alt="" width={384} height={216} loading="lazy" decoding="async" />
              <span className="jpb-name"><span className="jpe-trunc">{t.name}</span>{t.host && <b>PEMANDU</b>}</span>
            </div>
          ))}
        </div>
        <div className="jpb-dock">
          <i data-on="true"><Mic size={14} /></i>
          <i data-on="true"><Video size={14} /></i>
          <i><Hand size={14} /></i>
          <i><MonitorUp size={14} /></i>
          <i data-leave="true"><PhoneOff size={14} /></i>
        </div>
      </div>
    </section>
  );
}
