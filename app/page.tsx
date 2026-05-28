import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { db } from "@/lib/db";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import HeroSection from "@/components/landing/HeroSection";
import TrustBar from "@/components/landing/TrustBar";
import MengapaSection from "@/components/landing/MengapaSection";
import AIToolsSection from "@/components/landing/AIToolsSection";
import KaryaPopulerSection from "@/components/landing/KaryaPopulerSection";
import TestimoniSection from "@/components/landing/TestimoniSection";
import KomunitasSection from "@/components/landing/KomunitasSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BahasaCerdas — Platform Terlengkap Guru Bahasa Indonesia",
  description:
    "Platform all-in-one untuk guru Bahasa Indonesia: AI generator RPP, bank soal HOTS, kuis multiplayer, toko karya, dan komunitas MGMP terbesar. Gratis 14 hari.",
  openGraph: {
    title: "BahasaCerdas — Platform Terlengkap Guru Bahasa Indonesia",
    description:
      "MGMP + AI + Toko Karya. Platform all-in-one untuk guru Bahasa Indonesia.",
  },
};

async function queryWithTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("DB timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

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
          readCount: true,
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
    return await queryWithTimeout(
      db.video.findMany({
        where: { isPublished: true },
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
  const [artikel, videos] = await Promise.all([
    getLatestArtikel(),
    getLatestVideos(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BahasaCerdas",
    url: "https://bahasacerdas.com",
    description:
      "Platform all-in-one untuk guru Bahasa Indonesia: AI generator RPP, bank soal, kuis multiplayer, toko karya, dan komunitas MGMP.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://bahasacerdas.com/kamus?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "BahasaCerdas",
    url: "https://bahasacerdas.com",
    description:
      "Platform Terlengkap untuk Guru Bahasa Indonesia. MGMP + AI + Toko Karya.",
    offers: {
      "@type": "Offer",
      category: "Education",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: "https://bahasacerdas.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Artikel",
        item: "https://bahasacerdas.com/artikel",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Marketplace",
        item: "https://bahasacerdas.com/marketplace",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Video Belajar",
        item: "https://bahasacerdas.com/video-belajar",
      },
    ],
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <PageNavbar />
      <HeroSection />
      <TrustBar />

      {/* Mengapa Bahasa Cerdas */}
      <MengapaSection />

      {/* AI Tools Unggulan */}
      <AIToolsSection />

      {/* Karya Guru Populer */}
      <KaryaPopulerSection />

      {/* Testimoni */}
      <TestimoniSection />

      {/* Video & Artikel */}
      <section className="relative py-20 lg:py-28 bg-white" id="artikel">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
              <span className="text-xs font-semibold text-primary">
                Video & Artikel
              </span>
            </div>
            <h2 className="heading-lg text-zinc-900 mb-5">
              Belajar dari{" "}
              <span className="text-primary">Video & Artikel</span>
            </h2>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
              Tips mengajar, video pembelajaran, dan wawasan pendidikan dari
              para ahli.
            </p>
          </div>

          {/* Video Section */}
          <div className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900">
                Video Pembelajaran
              </h3>
              <Link
                href="/video-belajar"
                className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                Lihat Semua →
              </Link>
            </div>
            {videos.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {videos.map((v: any) => (
                  <Link
                    key={v.id}
                    href="/video-belajar"
                    className="group rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50/50 card-hover"
                  >
                    <div className="aspect-video bg-zinc-100 relative overflow-hidden">
                      {v.thumbnailUrl ? (
                        <Image
                          src={v.thumbnailUrl}
                          alt={v.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-200">
                          <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
                            <div className="w-0 h-0 border-t-8 border-b-8 border-l-12 border-t-transparent border-b-transparent border-l-zinc-600 ml-1" />
                          </div>
                        </div>
                      )}
                      {v.isPremium && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-gold-400 text-white text-[10px] font-bold">
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
                      <p className="text-xs text-zinc-400 mb-1.5 uppercase tracking-wider font-medium">
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
                  Belum ada video pembelajaran.
                </p>
              </div>
            )}
          </div>

          {/* Artikel Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900">
                Artikel & Tips
              </h3>
              <Link
                href="/artikel"
                className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                Lihat Semua →
              </Link>
            </div>
            {artikel.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {artikel.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/artikel/${a.slug}`}
                    className="group rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50/50 card-hover"
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
                        {a.author?.fullName} ·{" "}
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
                  className="mt-2 inline-block text-sm text-primary font-semibold hover:underline"
                >
                  Login & Tulis Artikel →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Komunitas MGMP */}
      <KomunitasSection />

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <FinalCTA />

      <PageFooter />
    </main>
  );
}
