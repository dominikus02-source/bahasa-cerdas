/** Pesan yang membedakan izin browser, perangkat, dan koneksi media. */
export function mediaErrorMessage(error: unknown, device: "Kamera" | "Mikrofon"): string {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return `${device} belum diizinkan. Buka izin situs di browser, lalu coba lagi.`;
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return `${device} tidak ditemukan. Hubungkan perangkat, lalu coba lagi.`;
  if (name === "NotReadableError" || name === "TrackStartError") return `${device} sedang dipakai aplikasi lain. Tutup aplikasi tersebut, lalu coba lagi.`;
  return `${device} belum dapat diubah. Periksa perangkat dan koneksi, lalu coba lagi.`;
}

/** Pilihan perangkat tersimpan dapat tidak ada lagi setelah ganti HP/headset. */
export async function withDefaultDeviceFallback<T>(selected: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try { return await selected(); }
  catch (error) {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    if (name !== "NotFoundError" && name !== "OverconstrainedError" && name !== "DevicesNotFoundError") throw error;
    return fallback();
  }
}
