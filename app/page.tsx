import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { organizationLd, webSiteLd, faqPageLd, breadcrumbLd } from "@/lib/json-ld";
import { withQueryTimeout as queryWithTimeout } from "@/lib/db/with-query-timeout";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import HeroSection from "@/components/landing/HeroSection";
import TrustBar from "@/components/landing/TrustBar";
import PromoVideoSection from "@/components/landing/PromoVideoSection";
import MengapaSection from "@/components/landing/MengapaSection";
import AIToolsSection from "@/components/landing/AIToolsSection";
import KaryaPopulerSection from "@/components/landing/KaryaPopulerSection";
import KomunitasSection from "@/components/landing/KomunitasSection";
import { getMgmpMedia } from "@/lib/site-settings";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import AnswerBlock from "@/components/aeo/AnswerBlock";
import JsonLd from "@/components/aeo/JsonLd";
import SafeMediaImage from "@/components/shared/safe-media-image";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "BahasaCerdas — Platform Edukasi Bahasa Indonesia untuk Guru & Siswa",
  description:
    "Platform edukasi Bahasa Indonesia lengkap: AI generator Rencana Pembelajaran Kurikulum Nasional, bank soal HOTS, kuis multiplayer, toko karya, dan komunitas MGMP aktif. Gratis untuk memulai.",
  openGraph: {
    title: "BahasaCerdas — Platform Edukasi Bahasa Indonesia",
    description:
      "MGMP + AI + Toko Karya dalam satu platform. Daftar gratis.",
  },
  alternates: {
    canonical: "https://www.bahasacerdas.com",
  },
};

async function getLatestArtikel() {
  try {
    return await queryWithTimeout(
      db.artikel.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          tags: true,
          createdAt: true,
          author: { select: { fullName: true } },
        },
      })
    );
  } catch {
    return [];
  }
}

async function getLatestVideos() {
  try {
    const seedUser = await db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } })
    const where: any = { isPublished: true }
    if (seedUser) where.creatorId = { not: seedUser.id }
    return await queryWithTimeout(
      db.video.findMany({
        where,
        orderBy: { views: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          duration: true,
          category: true,
          views: true,
          isPremium: true,
          grade: true,
        },
      })
    );
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [artikel, videos, mgmpMedia] = await Promise.all([
    getLatestArtikel(),
    getLatestVideos(),
    getMgmpMedia(),
  ]);

  const faqs = [
    { q: "Apa itu BahasaCerdas?", a: "BahasaCerdas adalah platform edukasi Bahasa Indonesia yang menyediakan AI generator Rencana Pembelajaran, bank soal HOTS, kuis multiplayer, toko karya guru, dan komunitas MGMP dalam satu platform. Dibangun oleh guru, untuk guru." },
    { q: "Apakah BahasaCerdas gratis?", a: "Ya, BahasaCerdas gratis untuk memulai. Guru bisa mencoba Guru Pro selama 30 hari tanpa komitmen. Setelah itu tersedia paket berbayar mulai Rp 49.000/bulan." },
    { q: "Fitur AI apa saja yang tersedia?", a: "BahasaCerdas memiliki AI generator Rencana Pembelajaran, generator soal HOTS, koreksi EYD otomatis, analisis teks, feedback karangan, dan asisten pembelajaran — semuanya untuk membantu guru Bahasa Indonesia." },
    { q: "Siapa yang bisa menggunakan BahasaCerdas?", a: "BahasaCerdas untuk guru Bahasa Indonesia di semua jenjang (SMP, SMA, SMK, MA) dan siswa yang ingin belajar Bahasa Indonesia secara interaktif." },
  ];

  return (
    <>
      <JsonLd data={breadcrumbLd([
        { position: 1, name: "Beranda", item: "https://www.bahasacerdas.com" },
        { position: 2, name: "Artikel", item: "https://www.bahasacerdas.com/artikel" },
        { position: 3, name: "Marketplace", item: "https://www.bahasacerdas.com/marketplace" },
        { position: 4, name: "Video Belajar", item: "https://www.bahasacerdas.com/video-belajar" },
      ])} />
      <JsonLd data={faqPageLd(faqs)} />

      <nav aria-label="Lompat ke konten" className="sr-only focus:not-sr-only">
        <a href="#main-content" className="skip-link">Langsung ke konten utama</a>
      </nav>

      <PageNavbar />

      <main id="main-content" className="min-h-screen">
        <HeroSection />
        <TrustBar />
        <PromoVideoSection />
        <MengapaSection />

        {/* Jawaban Singkat — AEO-optimized Q&A block */}
        <section className="relative py-20 lg:py-28 bg-white" aria-labelledby="jawaban-singkat-heading">
          <div className="section-container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
                <span className="text-xs font-semibold text-primary">Jawaban Singkat</span>
              </div>
              <h2 id="jawaban-singkat-heading" className="heading-lg text-zinc-900 mb-5">
                Apa Itu{" "}
                <span className="text-primary">BahasaCerdas</span>?
              </h2>
              <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
                Temukan jawaban singkat tentang platform kami.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <AnswerBlock question="Apa itu BahasaCerdas?">
                <p>
                  BahasaCerdas adalah platform edukasi Bahasa Indonesia yang menggabungkan kecerdasan buatan (AI), 
                  bank soal interaktif, kuis multiplayer, toko karya guru, dan komunitas MGMP dalam satu ekosistem.
                </p>
                <p className="mt-2">
                  Platform ini dirancang khusus untuk membantu guru Bahasa Indonesia di SMP, SMA, SMK, dan MA 
                  dalam menyusun perangkat ajar, mengevaluasi pembelajaran, dan mengembangkan karir.
                </p>
              </AnswerBlock>

              <AnswerBlock question="Fitur apa saja yang tersedia di BahasaCerdas?">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>AI Generator Rencana Pembelajaran</strong> — Buat Rencana Pembelajaran Kurikulum Nasional dalam 30 detik</li>
                  <li><strong>Generator Soal HOTS</strong> — Soal berbasis level kognitif C4-C6</li>
                  <li><strong>Koreksi EYD Otomatis</strong> — Periksa ejaan dan tata bahasa otomatis</li>
                  <li><strong>Kuis Multiplayer</strong> — Game edukasi interaktif untuk siswa</li>
                  <li><strong>Toko Karya Guru</strong> — Jual dan beli perangkat ajar</li>
                  <li><strong>Komunitas MGMP</strong> — Forum diskusi, webinar, dan kolaborasi guru</li>
                  <li><strong>Bank Soal</strong> — Soal siap pakai untuk asesmen</li>
                </ul>
              </AnswerBlock>

              <AnswerBlock question="Apakah BahasaCerdas gratis?">
                <p>
                  Ya, BahasaCerdas gratis untuk memulai. Guru dapat mendaftar dan langsung menggunakan fitur dasar 
                  tanpa biaya. Untuk akses penuh ke semua fitur AI dan premium, tersedia paket Guru Pro 
                  dengan uji coba 30 hari.
                </p>
              </AnswerBlock>

              <AnswerBlock question="Untuk siapa BahasaCerdas dibuat?">
                <p>
                  BahasaCerdas dibuat untuk <strong>guru Bahasa Indonesia</strong> di semua jenjang pendidikan 
                  dan <strong>siswa</strong> yang ingin belajar Bahasa Indonesia dengan cara yang lebih 
                  interaktif dan menyenangkan.
                </p>
              </AnswerBlock>
            </div>
          </div>
        </section>
        <AIToolsSection />
        <KaryaPopulerSection />

        <section className="relative py-20 lg:py-28 bg-white" id="artikel" aria-labelledby="media-heading">
          <div className="section-container">
            <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
                <span className="text-xs font-semibold text-primary">
                  Video & Artikel
                </span>
              </div>
              <h2 id="media-heading" className="heading-lg text-zinc-900 mb-5">
                Belajar dari{" "}
                <span className="text-primary">Video & Artikel</span>
              </h2>
              <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
                Tips mengajar, video pembelajaran, dan wawasan pendidikan dari
                para ahli.
              </p>
            </div>

            <div className="mb-14">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-zinc-900">
                  Video Pembelajaran
                </h3>
                <Link
                  href="/video-belajar"
                  className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors focus-ring rounded"
                >
                  Lihat Semua &rarr;
                </Link>
              </div>
              {videos.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {videos.map((v: any) => (
                    <Link
                      key={v.id}
                      href="/video-belajar"
                      className="group rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50/50 card-hover focus-ring"
                      aria-label={`Video: ${v.title}`}
                    >
                      <div className="aspect-video bg-zinc-100 relative overflow-hidden">
                        <SafeMediaImage
                          src={v.thumbnailUrl}
                          alt=""
                          fallbackType="video"
                          containerClassName="w-full h-full"
                          className="group-hover:scale-105 transition-transform duration-500"
                        />
                        {v.isPremium && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-amber-400 text-white text-[10px] font-bold">
                            PREMIUM
                          </span>
                        )}
                        {v.duration && (
                          <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">
                            {v.duration}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wider font-medium">
                          {v.category || v.grade || "Video"}
                        </p>
                        <h4 className="font-semibold text-zinc-900 text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {v.title}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1.5">
                          {v.views?.toLocaleString() || 0} ditonton
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <p className="text-zinc-400">
                    Video pembelajaran pilihan akan segera tersedia.
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-zinc-900">
                  Artikel & Tips
                </h3>
                <Link
                  href="/artikel"
                  className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors focus-ring rounded"
                >
                  Lihat Semua &rarr;
                </Link>
              </div>
              {artikel.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {artikel.map((a: any) => (
                    <Link
                      key={a.id}
                      href={`/artikel/${a.slug}`}
                      className="group rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50/50 card-hover focus-ring"
                      aria-label={`Artikel: ${a.title}`}
                    >
                      <div className="p-6">
                        {a.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {a.tags.slice(0, 2).map((t: string) => (
                              <span
                                key={t}
                                className="text-[10px] px-2.5 py-1 rounded-full bg-primary-light text-primary font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <h4 className="font-bold text-zinc-900 group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {a.title}
                        </h4>
                        {a.excerpt && (
                          <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                            {a.excerpt}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400 mt-4">
                          {a.author?.fullName} &middot;{" "}
                          {new Date(a.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <p className="text-zinc-400">
                    Belum ada artikel. Guru dapat menulis artikel setelah login.
                  </p>
                  <Link
                    href="/login"
                    className="mt-2 inline-block text-sm text-primary font-semibold hover:underline focus-ring rounded"
                  >
                    Login & Tulis Artikel &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <KomunitasSection mgmpMedia={mgmpMedia} />
        <FAQSection />
        <FinalCTA />
      </main>

      <PageFooter />
    </>
  );
}
