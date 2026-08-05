"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";

// Baris "Notifikasi" di tab Pemain.
//
// Sengaja DIMINTA OLEH MURID, bukan muncul sendiri saat aplikasi dibuka. Izin
// notifikasi yang ditolak bersifat permanen — tidak bisa diminta ulang lewat
// aplikasi, hanya lewat setelan Android. Meminta di layar pertama, sebelum anak
// tahu aplikasinya untuk apa, adalah cara tercepat kehilangan izin itu selamanya.

// Kunci VAPID datang sebagai base64url; pushManager.subscribe() menuntut byte.
// Buffer-nya dialokasikan eksplisit agar bertipe Uint8Array<ArrayBuffer>:
// Uint8Array.from() menghasilkan Uint8Array<ArrayBufferLike>, yang bisa berupa
// SharedArrayBuffer dan karena itu ditolak sebagai BufferSource.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Keadaan = "memuat" | "tak-didukung" | "mati" | "nyala" | "ditolak";

export function AktifkanNotifikasi() {
  const [keadaan, setKeadaan] = useState<Keadaan>("memuat");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    (async () => {
      if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
        if (!batal) setKeadaan("tak-didukung");
        return;
      }
      if (Notification.permission === "denied") {
        if (!batal) setKeadaan("ditolak");
        return;
      }
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
      if (!batal) setKeadaan(sub ? "nyala" : "mati");
    })();
    return () => {
      batal = true;
    };
  }, []);

  const nyalakan = async () => {
    setSibuk(true);
    setPesan(null);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setKeadaan(izin === "denied" ? "ditolak" : "mati");
        return;
      }

      const kunci = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!kunci) {
        setPesan("Kunci notifikasi tidak ada di aplikasi ini. Hubungi pengelola — mencoba lagi tidak akan membantu.");
        setKeadaan("mati");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(kunci),
      });

      // Sekali ulang untuk kegagalan jaringan. "Failed to fetch" di ponsel paling
      // sering berarti koneksi putus sesaat — persis saat pengguna baru menekan
      // izin, jaringan seluler kerap sedang berpindah. Membuat mereka menekan
      // tombolnya lagi justru berbahaya: penekanan berulang yang gagal adalah
      // yang membuat browser memblokir izin secara permanen.
      const kirim = () =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });

      let res: Response;
      try {
        res = await kirim();
      } catch {
        await new Promise((r) => setTimeout(r, 1200));
        try {
          res = await kirim();
        } catch (e2: any) {
          await sub.unsubscribe().catch(() => {});
          // Origin ikut ditampilkan: kalau halaman termuat di apex
          // (bahasacerdas.com) alih-alih www, permintaan kena redirect
          // lintas-origin dan diblokir CSP — gejalanya sama persis dengan
          // koneksi putus, tapi penyebab dan perbaikannya berbeda jauh.
          setPesan(
            `Tidak bisa menghubungi server dari perangkat ini (${e2?.name || "gagal jaringan"}). ` +
              `Halaman ini terbuka di ${window.location.origin}. ` +
              `Periksa koneksi lalu coba sekali lagi.`
          );
          setKeadaan("mati");
          return;
        }
      }

      // Kalau server menolak, langganan browser dicabut lagi. Membiarkannya hidup
      // berarti perangkat merasa berlangganan padahal server tak akan pernah
      // mengirim apa pun ke sana.
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        const info = await res.json().catch(() => ({}));
        // Alasannya HARUS terlihat. Versi pertama fitur ini gagal diam-diam, dan
        // murid menekan tombolnya berulang kali sampai browser memblokir izin
        // notifikasi secara permanen — kegagalan yang tak terlihat berubah jadi
        // kerusakan yang tak bisa dibatalkan dari dalam aplikasi.
        setPesan(
          info?.kode === "TABEL_HILANG"
            ? "Server belum siap menerima langganan (tabel notifikasi belum dibuat). Ini bukan masalah di ponselmu — jangan coba berulang kali."
            : `Server menolak (${res.status}). Coba lagi nanti, bukan sekarang.`
        );
        setKeadaan("mati");
        return;
      }

      setKeadaan("nyala");
    } catch (e: any) {
      setPesan(
        e?.name === "NotAllowedError"
          ? "Izin notifikasi ditolak browser."
          : `Gagal berlangganan: ${e?.name || "kesalahan"}${e?.message ? ` — ${e.message}` : ""}`
      );
      setKeadaan("mati");
    } finally {
      setSibuk(false);
    }
  };

  const kirimUji = async () => {
    setSibuk(true);
    setPesan(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const info = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPesan(info?.error || `Server menolak (${res.status}).`);
        return;
      }
      // Sengaja TIDAK mengatakan "berhasil". Server hanya tahu push service
      // menerima kirimannya; apakah notifikasinya benar-benar muncul di layar
      // hanya bisa dilihat oleh pemilik perangkat.
      setPesan(
        info.terkirim > 0
          ? `Terkirim ke ${info.terkirim} perangkat. Kalau notifikasinya tidak muncul dalam beberapa detik, izin notifikasi Arena BC di setelan Android kemungkinan belum aktif.`
          : "Tidak ada perangkat yang bisa dijangkau. Coba matikan lalu nyalakan lagi pengingatnya."
      );
    } catch {
      setPesan("Tidak bisa menghubungi server. Periksa koneksi.");
    } finally {
      setSibuk(false);
    }
  };

  const matikan = async () => {
    setSibuk(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setKeadaan("mati");
    } finally {
      setSibuk(false);
    }
  };

  if (keadaan === "memuat" || keadaan === "tak-didukung") return null;

  if (keadaan === "ditolak") {
    return (
      <div className="rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3">
        <span className="flex items-center gap-2 text-sm font-bold text-[var(--px-text)]">
          <BellOff size={15} className="text-[var(--px-text-faint)]" /> Notifikasi diblokir
        </span>
        <p className="mt-1 text-xs text-[var(--px-text-faint)]">
          Izinnya dimatikan di setelan ponsel. Buka Setelan → Aplikasi → Arena BC → Notifikasi untuk
          menyalakannya lagi.
        </p>
      </div>
    );
  }

  const nyala = keadaan === "nyala";
  return (
    <div className="space-y-2">
      <button
        onClick={nyala ? matikan : nyalakan}
        disabled={sibuk}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3 hover:bg-white/[0.08] disabled:opacity-60"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[var(--px-text)]">
          <Bell size={15} className={nyala ? "text-amber-300" : "text-[var(--px-text-faint)]"} />
          {nyala ? "Pengingat tugas aktif" : "Nyalakan pengingat tugas"}
        </span>
        {sibuk ? (
          <Loader2 size={15} className="animate-spin text-[var(--px-text-faint)]" />
        ) : (
          <span className="text-xs font-bold text-[var(--px-text-faint)]">{nyala ? "Matikan" : "Nyalakan"}</span>
        )}
      </button>

      {/* Uji kirim ke perangkat ini. "Server berhasil mengirim" dan "notifikasi
          muncul di layar" adalah dua hal berbeda, dan jaraknya tidak terlihat
          dari sisi server. Tanpa tombol ini, memeriksanya berarti menunggu
          jadwal pengingat berikutnya. */}
      {nyala && (
        <button
          onClick={kirimUji}
          disabled={sibuk}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--px-border)] bg-white/[0.02] p-3 hover:bg-white/[0.06] disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-[var(--px-text-faint)]">
            <Send size={13} /> Kirim notifikasi uji ke HP ini
          </span>
        </button>
      )}

      {/* Alasan kegagalan ditampilkan apa adanya. Tanpa ini murid tidak punya cara
          membedakan "server bermasalah" dari "aku salah menekan", lalu menekan
          berulang kali sampai browser memblokir izin — dan blokir itu tidak bisa
          dicabut dari dalam aplikasi. */}
      {pesan && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200">
          {pesan}
        </p>
      )}
    </div>
  );
}
