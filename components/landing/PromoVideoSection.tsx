import { getSetting, PROMO_VIDEO_KEY } from "@/lib/site-settings";
import PromoVideoPlayer from "@/components/landing/PromoVideoPlayer";

// Video diatur dari /admin/pengaturan (bukan konstanta di kode), supaya bisa
// diganti kapan saja tanpa deploy — mis. mengikuti event yang sedang berjalan.
export default async function PromoVideoSection() {
  const videoId = await getSetting(PROMO_VIDEO_KEY);

  return (
    <section className="relative py-16 lg:py-20 bg-white" aria-labelledby="promo-video-heading">
      <div className="section-container">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Kenali BahasaCerdas</span>
          </div>
          <h2 id="promo-video-heading" className="heading-lg text-zinc-900">
            Lihat <span className="text-primary">BahasaCerdas</span> Bekerja
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <PromoVideoPlayer videoId={videoId} />
        </div>
      </div>
    </section>
  );
}
