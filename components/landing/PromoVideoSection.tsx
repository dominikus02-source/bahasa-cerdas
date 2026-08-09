import { getSetting, PROMO_VIDEO_KEY } from "@/lib/site-settings";
import { getActiveAnnouncements } from "@/data/landing-announcements";
import PromoVideoPlayer from "@/components/landing/PromoVideoPlayer";
import AnnouncementSlider from "@/components/landing/AnnouncementSlider";

// Video diatur dari /admin/pengaturan (bukan konstanta di kode), supaya bisa
// diganti kapan saja tanpa deploy — mis. mengikuti event yang sedang berjalan.
// Kolom kanan menampilkan "Kabar dari Ekosistem": carousel banner pengumuman
// (banner tampil utuh, geser pakai anak panah kiri/kanan atau swipe mobile,
// klik banner untuk diarahkan ke laman tujuan). Sumber:
// data/landing-announcements.ts — tanpa data baru, tanpa angka pabrikan.

export default async function PromoVideoSection() {
  const videoId = await getSetting(PROMO_VIDEO_KEY);
  const announcements = getActiveAnnouncements();

  return (
    <section
      className="relative py-14 lg:py-20 bg-white"
      aria-labelledby="promo-video-heading"
    >
      <div className="section-container">
        <div className={`grid gap-8 lg:gap-12 items-start ${announcements.length > 0 ? "lg:grid-cols-[11fr_9fr]" : ""}`}>
          {/* Kiri (≈55%) — video pengenalan */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
              <span className="text-xs font-semibold text-primary">Kenali BahasaCerdas</span>
            </div>
            <h2 id="promo-video-heading" className="heading-lg text-zinc-900">
              Lihat bagaimana <span className="text-primary">BahasaCerdas</span> bekerja.
            </h2>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed mt-4 max-w-xl">
              Satu ekosistem yang menghubungkan guru, murid, pembelajaran,
              latihan, karya, dan komunitas Bahasa Indonesia.
            </p>

            <div className="mt-8 rounded-2xl overflow-hidden border border-zinc-100 shadow-lg shadow-zinc-900/5">
              <PromoVideoPlayer videoId={videoId} />
            </div>
          </div>

          {/* Kanan (≈45%) — kabar dari ekosistem */}
          {announcements.length > 0 && (
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200/60 mb-5">
                <span className="text-xs font-semibold text-amber-700">Kabar dari Ekosistem</span>
              </div>
              <h3 className="heading-md text-zinc-900">
                Apa yang sedang berlangsung?
              </h3>

              <div className="mt-6">
                <AnnouncementSlider items={announcements} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}