import webpush from "web-push";
import { db } from "@/lib/db";

// Web Push, shared by the browser and the Arena APK — a TWA is Chrome, so one set
// of subscriptions serves both.
//
// Configured lazily rather than at module load: the keys are absent in local dev
// and in preview branches that predate them, and throwing at import time would
// take down every route that transitively imports this file.

let siap = false;

function konfigurasi(): boolean {
  if (siap) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:halo@bahasacerdas.com", publicKey, privateKey);
  siap = true;
  return true;
}

export type IsiNotifikasi = {
  title: string;
  body: string;
  /** Path in-app yang dibuka saat notifikasi diketuk. */
  url?: string;
  /** Notifikasi dengan tag sama saling menimpa, bukan menumpuk. */
  tag?: string;
};

/**
 * Kirim ke semua perangkat milik satu pengguna.
 *
 * Mengembalikan jumlah yang berhasil. Kegagalan TIDAK dilempar: notifikasi adalah
 * efek samping, dan sebuah langganan mati tidak boleh menggagalkan aksi yang
 * memicunya (mis. guru menerbitkan tugas).
 */
export async function kirimKeUser(userId: string, isi: IsiNotifikasi): Promise<number> {
  if (!konfigurasi()) return 0;

  const langganan = await db.pushSubscription.findMany({ where: { userId } });
  if (langganan.length === 0) return 0;

  const payload = JSON.stringify(isi);
  let berhasil = 0;
  const mati: string[] = [];

  await Promise.all(
    langganan.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        berhasil++;
      } catch (e: any) {
        // 404/410 = perangkat mencabut izin atau langganan kedaluwarsa. Barisnya
        // dibuang; kalau dibiarkan, tabel ini pelan-pelan penuh alamat mati dan
        // setiap pengiriman ikut melambat.
        if (e?.statusCode === 404 || e?.statusCode === 410) mati.push(s.endpoint);
        else console.warn("Push gagal:", e?.statusCode, e?.body ?? e?.message);
      }
    })
  );

  if (mati.length) {
    await db.pushSubscription.deleteMany({ where: { endpoint: { in: mati } } }).catch(() => {});
  }
  if (berhasil) {
    await db.pushSubscription
      .updateMany({ where: { userId, endpoint: { notIn: mati } }, data: { lastOkAt: new Date() } })
      .catch(() => {});
  }

  return berhasil;
}

/** Kirim ke banyak pengguna sekaligus. Dipakai saat guru menerbitkan tugas sekelas. */
export async function kirimKeBanyakUser(userIds: string[], isi: IsiNotifikasi): Promise<number> {
  const hasil = await Promise.all(userIds.map((id) => kirimKeUser(id, isi)));
  return hasil.reduce((a, b) => a + b, 0);
}

/**
 * Jendela kirim yang sopan untuk anak sekolah: 15.00–18.00 WIB.
 *
 * Di luar itu notifikasi menyela jam pelajaran atau waktu tidur — cara tercepat
 * membuat orang tua mematikan izin notifikasi untuk selamanya. Dipakai oleh
 * pengingat terjadwal; notifikasi yang dipicu aksi guru dikirim apa adanya.
 */
export function didalamJamSopan(sekarang = new Date()): boolean {
  // Server berjalan di UTC; WIB = UTC+7.
  const jamWib = (sekarang.getUTCHours() + 7) % 24;
  return jamWib >= 15 && jamWib < 18;
}
