import { db } from "@/lib/db";

export interface KuponData {
  id: string;
  kode: string;
  nama: string | null;
  hargaFixed: number | null;
  diskonPersen: number | null;
  hargaMinimal: number | null;
  planId: string | null;
  untukRole: string;
}

const MIN_MIDTRANS = 1000; // batas transaksi minimum Midtrans

export function normalizeKode(kode: string): string {
  return kode.trim().toUpperCase();
}

/** Hitung harga akhir kupon. Prioritas: hargaFixed > diskonPersen > harga asli. */
export function hitungHargaDiskon(kupon: {
  hargaFixed: number | null;
  diskonPersen: number | null;
  hargaMinimal: number | null;
}, hargaAsli: number): number {
  if (kupon.hargaFixed != null) {
    return Math.max(kupon.hargaFixed, MIN_MIDTRANS);
  }
  if (kupon.diskonPersen != null) {
    const potongan = Math.round((hargaAsli * kupon.diskonPersen) / 100);
    const setelah = Math.max(0, hargaAsli - potongan);
    return Math.max(setelah, kupon.hargaMinimal ?? MIN_MIDTRANS);
  }
  return Math.max(hargaAsli, MIN_MIDTRANS);
}

/**
 * Validasi kupon untuk seorang user + paket.
 * - Tidak ditemukan / nonaktif / kedaluwarsa / belum berlaku / habis → error
 * - Role tidak cocok → error (program khusus GURU, ADMIN/founder boleh untuk uji)
 * - planId ditetapkan tapi berbeda → error (kupon khusus paket tertentu)
 * Mengembalikan kupon + harga akhir.
 */
export async function validasiKupon(
  kodeInput: string,
  user: { role: string; isFounder?: boolean },
  plan: { planId: string; price: number }
): Promise<{ kupon: KuponData; hargaDiskon: number; hargaAsli: number }> {
  const kode = normalizeKode(kodeInput);
  if (!kode) throw new Error("Kode kupon kosong");

  const kupon = await db.kupon.findUnique({ where: { kode } });
  if (!kupon || !kupon.aktif) {
    throw new Error("Kode kupon tidak ditemukan atau tidak aktif.");
  }

  const now = new Date();
  if (kupon.mulaiBerlaku && kupon.mulaiBerlaku > now) {
    throw new Error("Kupon ini belum mulai berlaku.");
  }
  if (kupon.berakhirPada && kupon.berakhirPada < now) {
    throw new Error("Kupon sudah kedaluwarsa.");
  }
  if (kupon.batasPemakaian != null && kupon.jumlahTerpakai >= kupon.batasPemakaian) {
    throw new Error("Kupon sudah habis masa pemakaiannya.");
  }

  if (kupon.planId && kupon.planId !== plan.planId) {
    throw new Error("Kupon ini hanya berlaku untuk paket tertentu. Ganti paket dulu.");
  }

  const roleOk =
    kupon.untukRole === "*" ||
    kupon.untukRole === user.role ||
    user.role === "ADMIN" ||
    !!user.isFounder;
  if (!roleOk) {
    throw new Error("Kupon ini khusus untuk akun guru.");
  }

  const hargaDiskon = hitungHargaDiskon(kupon, plan.price);

  return {
    kupon: {
      id: kupon.id,
      kode: kupon.kode,
      nama: kupon.nama,
      hargaFixed: kupon.hargaFixed,
      diskonPersen: kupon.diskonPersen,
      hargaMinimal: kupon.hargaMinimal,
      planId: kupon.planId,
      untukRole: kupon.untukRole,
    },
    hargaDiskon,
    hargaAsli: plan.price,
  };
}
