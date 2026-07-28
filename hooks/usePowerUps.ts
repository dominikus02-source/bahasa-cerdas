"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PowerUpType = "HINT_TOKEN" | "TIME_EXTENSION";

/**
 * Item bantuan dari Toko Koin yang dipakai saat mengerjakan soal.
 *
 * Hook ini hanya membaca stok untuk keperluan tampilan; sumber kebenarannya
 * tetap server. `consume()` baru mengembalikan `true` kalau server benar-benar
 * berhasil mengurangi stok — pemanggil WAJIB menunggu hasilnya sebelum memberi
 * efek apa pun (menghapus opsi, menambah waktu, dst).
 *
 * Murid yang tidak punya item apa pun: semua jumlah 0 dan `confettiAktif` false,
 * jadi tombol bantuan tidak pernah muncul dan permainan berjalan seperti biasa.
 */
export function usePowerUps() {
  const [counts, setCounts] = useState<Record<PowerUpType, number>>({
    HINT_TOKEN: 0,
    TIME_EXTENSION: 0,
  });
  const [equippedEffect, setEquippedEffect] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    fetch("/api/siswa/store/consume")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!aliveRef.current || !d) return;
        setCounts({
          HINT_TOKEN: Number(d.items?.HINT_TOKEN) || 0,
          TIME_EXTENSION: Number(d.items?.TIME_EXTENSION) || 0,
        });
        setEquippedEffect(typeof d.equippedEffect === "string" ? d.equippedEffect : null);
      })
      .catch(() => { /* diamkan: murid tanpa item tetap bisa main */ })
      .finally(() => { if (aliveRef.current) setReady(true); });

    return () => { aliveRef.current = false; };
  }, []);

  /** Pakai satu item. `true` = server sudah mengurangi stok. */
  const consume = useCallback(async (type: PowerUpType): Promise<boolean> => {
    // Cegah dobel-klik mengirim dua permintaan sekaligus (server tetap
    // menjaga stok, ini sekadar agar UI tidak memboroskan item).
    if (busyRef.current) return false;
    busyRef.current = true;
    setError(null);
    try {
      const res = await fetch("/api/siswa/store/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Gagal memakai item.");
        // Stok di server ternyata kosong — samakan tampilan dengan kenyataan.
        if (res.status === 400) setCounts((c) => ({ ...c, [type]: 0 }));
        return false;
      }
      const remaining = Number(data.remaining);
      setCounts((c) => ({ ...c, [type]: Number.isFinite(remaining) ? remaining : Math.max(0, c[type] - 1) }));
      return true;
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
      return false;
    } finally {
      busyRef.current = false;
    }
  }, []);

  return {
    hintCount: counts.HINT_TOKEN,
    timeCount: counts.TIME_EXTENSION,
    equippedEffect,
    confettiAktif: equippedEffect === "confetti",
    ready,
    error,
    clearError: useCallback(() => setError(null), []),
    consume,
  };
}
