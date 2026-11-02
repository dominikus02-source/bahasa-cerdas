"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StatusSimpan = "tersimpan" | "menunggu" | "menyimpan" | "gagal";

type Opsi<T> = {
  /** Kunci dokumen (mis. id karya). Ganti kunci = dokumen baru. */
  kunci: string | null;
  nilai: T;
  aktif: boolean;
  /** Kirim ke server. `keepalive` dipakai saat halaman ditutup. Lempar galat bila gagal. */
  simpan: (nilai: T, opsi: { keepalive: boolean; kunci: string }) => Promise<void>;
  jeda?: number;
};

const kunciCadangan = (kunci: string) => `aks:cadangan:${kunci}`;

export function bacaCadangan<T>(kunci: string): { nilai: T; waktu: number } | null {
  try {
    const raw = window.localStorage.getItem(kunciCadangan(kunci));
    return raw ? (JSON.parse(raw) as { nilai: T; waktu: number }) : null;
  } catch { return null; }
}
export function hapusCadangan(kunci: string) {
  try { window.localStorage.removeItem(kunciCadangan(kunci)); } catch { /* abaikan */ }
}

/**
 * Simpan otomatis yang aman:
 * - debounce, tidak pernah dua penyimpanan bersamaan, perubahan saat menyimpan ikut disimpan sesudahnya;
 * - cadangan lokal (localStorage) setiap perubahan, dihapus setelah server mengonfirmasi;
 * - simpan saat tab disembunyikan / ditutup (keepalive) + peringatan beforeunload bila belum tersimpan;
 * - gagal → coba ulang bertahap; `simpanSekarang()` menunggu hingga tersimpan (dipakai sebelum pindah).
 */
export function useAutosave<T>({ kunci, nilai, aktif, simpan, jeda = 1200 }: Opsi<T>) {
  const [status, setStatus] = useState<StatusSimpan>("tersimpan");
  const [terakhir, setTerakhir] = useState<Date | null>(null);
  const tersimpanRef = useRef<string>("");
  const nilaiRef = useRef(nilai);
  const simpanRef = useRef(simpan);
  const sibukRef = useRef<Promise<boolean> | null>(null);
  const timerRef = useRef<number | null>(null);
  const percobaanRef = useRef(0);
  const kunciRef = useRef(kunci);
  nilaiRef.current = nilai;
  simpanRef.current = simpan;
  kunciRef.current = kunci;
  const serial = JSON.stringify(nilai);

  /** Tetapkan titik awal (nilai yang sudah ada di server) tanpa menyimpan. */
  const tetapkanAwal = useCallback((awal: T) => {
    tersimpanRef.current = JSON.stringify(awal);
    percobaanRef.current = 0;
    setStatus("tersimpan");
  }, []);

  const jalankan = useCallback(async (keepalive = false): Promise<boolean> => {
    if (sibukRef.current) {
      await sibukRef.current;
    }
    const k = kunciRef.current;
    const sekarang = nilaiRef.current;
    const s = JSON.stringify(sekarang);
    if (!k || s === tersimpanRef.current) { setStatus("tersimpan"); return true; }
    setStatus("menyimpan");
    const janji = (async () => {
      try {
        await simpanRef.current(sekarang, { keepalive, kunci: k });
        if (kunciRef.current !== k) return true;
        tersimpanRef.current = s;
        percobaanRef.current = 0;
        setTerakhir(new Date());
        const masihSama = JSON.stringify(nilaiRef.current) === s;
        if (masihSama) hapusCadangan(k);
        setStatus(masihSama ? "tersimpan" : "menunggu");
        return true;
      } catch {
        if (kunciRef.current === k) setStatus("gagal");
        percobaanRef.current += 1;
        return false;
      }
    })();
    sibukRef.current = janji;
    const ok = await janji;
    sibukRef.current = null;
    return ok;
  }, []);

  // Ganti dokumen: batalkan timer lama.
  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, [kunci]);

  // Setiap perubahan: cadangkan lokal, jadwalkan simpan.
  useEffect(() => {
    if (!aktif || !kunci) return;
    if (serial === tersimpanRef.current) return;
    try { window.localStorage.setItem(kunciCadangan(kunci), JSON.stringify({ nilai: nilaiRef.current, waktu: Date.now() })); } catch { /* penyimpanan lokal penuh: tetap lanjut */ }
    setStatus((s) => (s === "menyimpan" ? s : "menunggu"));
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const tunda = percobaanRef.current ? Math.min(30_000, 3000 * percobaanRef.current) : jeda;
    timerRef.current = window.setTimeout(() => { void jalankan(); }, tunda);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [serial, aktif, kunci, jeda, jalankan]);

  // Coba ulang otomatis setelah gagal.
  useEffect(() => {
    if (status !== "gagal" || !aktif) return;
    const t = window.setTimeout(() => { void jalankan(); }, Math.min(30_000, 3000 * Math.max(1, percobaanRef.current)));
    return () => window.clearTimeout(t);
  }, [status, aktif, jalankan]);

  const belumTersimpan = aktif && !!kunci && serial !== tersimpanRef.current;

  // Tab disembunyikan / ditutup: simpan segera (keepalive) + peringatan bila masih tertunda.
  useEffect(() => {
    if (!aktif) return;
    const saatSembunyi = () => { if (document.visibilityState === "hidden") void jalankan(true); };
    const saatTutup = () => { void jalankan(true); };
    const peringatan = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(nilaiRef.current) === tersimpanRef.current) return;
      void jalankan(true);
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", saatSembunyi);
    window.addEventListener("pagehide", saatTutup);
    window.addEventListener("beforeunload", peringatan);
    return () => {
      document.removeEventListener("visibilitychange", saatSembunyi);
      window.removeEventListener("pagehide", saatTutup);
      window.removeEventListener("beforeunload", peringatan);
    };
  }, [aktif, jalankan]);

  const simpanSekarang = useCallback(async () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!aktif) return true;
    return jalankan();
  }, [aktif, jalankan]);

  return { status: belumTersimpan && status === "tersimpan" ? "menunggu" : status, terakhir, belumTersimpan, simpanSekarang, tetapkanAwal } as const;
}
