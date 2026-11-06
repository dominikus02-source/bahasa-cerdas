import type { Metadata } from "next";
import Image from "next/image";
import styles from "./demo.module.css";

export const metadata: Metadata = {
  title: "Demo Android Bahasa Cerdas",
  description: "Coba aplikasi Bahasa Cerdas di emulator Android melalui browser.",
  robots: { index: false, follow: false },
};

const buildId = process.env.NEXT_PUBLIC_APPETIZE_BUILD_ID?.trim() || "";
const isValidBuildId = /^[a-zA-Z0-9_-]{6,128}$/.test(buildId);

export default function AndroidDemoPage() {
  const embedUrl = isValidBuildId
    ? `https://appetize.io/embed/${buildId}?scale=auto&autoplay=false&centered=both`
    : null;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Image className={styles.brand} src="/icon-192.png" alt="Logo Bahasa Cerdas" width={58} height={58} priority />
          <div>
            <h1 className={styles.heading}>Demo Android Bahasa Cerdas</h1>
            <p className={styles.subheading}>Jalankan aplikasi di browser, tanpa perlu memasang APK.</p>
          </div>
        </header>

        <div className={styles.columns}>
          <section className={styles.panel} aria-label="Emulator Android Bahasa Cerdas">
            {embedUrl ? (
              <>
                <iframe
                  className={styles.emulator}
                  title="Emulator Android Bahasa Cerdas"
                  src={embedUrl}
                  allow="fullscreen; clipboard-read; clipboard-write"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                <p className={`${styles.copy} ${styles.note}`}>
                  Tekan Play untuk memulai sesi. Kuota streaming gratis digunakan bersama oleh seluruh pengunjung.
                </p>
              </>
            ) : (
              <div className={styles.placeholder}>
                <span className={styles.placeholderIcon} aria-hidden="true">▣</span>
                <h2 className={styles.sectionTitle}>Emulator belum diaktifkan</h2>
                <p className={styles.copy}>
                  Pengelola perlu mengunggah APK ke akun Appetize gratis, lalu mengatur
                  NEXT_PUBLIC_APPETIZE_BUILD_ID pada deployment. Halaman ini tidak
                  menjalankan emulator sebelum konfigurasi tersedia.
                </p>
                <a className={styles.button} href="https://appetize.io/upload" target="_blank" rel="noopener noreferrer">
                  Unggah APK ke Appetize
                </a>
              </div>
            )}
          </section>

          <aside className={styles.panel}>
            <h2 className={styles.sectionTitle}>Cara mencoba</h2>
            <ol className={styles.instructions}>
              <li>Buka tautan ini dari HP, tablet, laptop, atau desktop.</li>
              <li>Tekan Play untuk membuka Android virtual.</li>
              <li>Uji beranda, navigasi, dan akun demo resmi.</li>
              <li>Jangan masukkan kata sandi pribadi pada sesi emulator publik.</li>
            </ol>
            <h2 className={styles.sectionTitle}>Penting diketahui</h2>
            <p className={styles.copy}>
              Paket gratis memiliki batas waktu streaming bersama. Google Sign-In,
              kamera, dan mikrofon JUMPA tetap harus diuji pada perangkat Android
              fisik karena emulator cloud tidak selalu mendukung semua fitur.
            </p>
            <a className={styles.link} href="https://www.bahasacerdas.com/">
              Buka website Bahasa Cerdas
            </a>
          </aside>
        </div>
      </div>
    </main>
  );
}
