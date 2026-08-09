import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { faqPageLd, breadcrumbLd } from "@/lib/json-ld";
import { withQueryTimeout as queryWithTimeout } from "@/lib/db/with-query-timeout";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import HeroSection from "@/components/landing/HeroSection";
import SocialProof from "@/components/landing/SocialProof";
import PromoVideoSection from "@/components/landing/PromoVideoSection";
import EcosystemSection from "@/components/landing/EcosystemSection";
import LearningLoopSection from "@/components/landing/LearningLoopSection";
import TeacherSection from "@/components/landing/TeacherSection";
import StudentSection from "@/components/landing/StudentSection";
import AIToolsSection from "@/components/landing/AIToolsSection";
import KaryaPopulerSection from "@/components/landing/KaryaPopulerSection";
import BigtSection from "@/components/landing/BigtSection";
import KomunitasSection from "@/components/landing/KomunitasSection";
import AboutBridge from "@/components/landing/AboutBridge";
import { getMgmpMedia } from "@/lib/site-settings";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import { getSocialProofSnapshot } from "@/lib/social-proof";
// Jawaban Singkat (AnswerBlock) tidak lagi dirender di landing — jawaban
// hanya tersedia lewat satu blok FAQ: FAQSection ("Pertanyaan yang Sering Diajukan").
import JsonLd from "@/components/aeo/JsonLd";
import SafeMediaImage from "@/components/shared/safe-media-image";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "BahasaCerdas — Ekosistem Belajar Bahasa Indonesia",
  description:
    "BahasaCerdas adalah ekosistem pembelajaran Bahasa Indonesia untuk guru dan murid. Belajar, berlatih, bermain, berkarya, dan bertumbuh dalam satu platform.",
  openGraph: {
    title: "BahasaCerdas — Ekosistem Belajar Bahasa Indonesia",
    description:
      "Belajar, berlatih, bermain, berkarya, dan bertumbuh dalam satu ekosistem Bahasa Indonesia.",
    url: "https://www.bahasacerdas.com",
    type: "website",
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
  const [artikel, videos, mgmpMedia, socialProof] = await Promise.all([
    getLatestArtikel(),
    getLatestVideos(),
    getMgmpMedia(),
    getSocialProofSnapshot(),
  ]);

  const faqs = [
    { q: "Apa itu BahasaCerdas?", a: "BahasaCerdas adalah ekosistem belajar Bahasa Indonesia yang menghubungkan guru, murid, kelas, materi, latihan, permainan, karya, komunitas, dan asesmen dalam satu platform. Bukan sekadar tempat belajar atau alat AI — melainkan ekosistem yang dirancang mengelilingi perjalanan belajar Bahasa Indonesia." },
    { q: "Apakah BahasaCerdas gratis?", a: "Ya, BahasaCerdas gratis untuk memulai. Guru dapat mencoba Guru Pro selama 30 hari tanpa komitmen. Setelah itu tersedia paket Guru Pro mulai Rp 49.000/bulan." },
    { q: "Apa yang bisa dilakukan murid di BahasaCerdas?", a: "Murid bisa belajar di Jalur Cerdas, berlatih soal, bermain gim edukasi, menulis dan mempublikasikan karya, mengumpulkan XP dan lencana, naik peringkat di liga mingguan, serta mengikuti simulasi UKBI/TKA." },
    { q: "Apa yang bisa dilakukan guru?", a: "Guru bisa mengelola kelas, menyiapkan materi ajar, membuat dan membagikan latihan, menilai karya dan tugas, memantau buku nilai, menyusun perangkat ajar dengan bantuan AI, serta menjual karya di Toko Karya BahasaCerdas." },
    { q: "Bagaimana cara AI bekerja di BahasaCerdas?", a: "AI di BahasaCerdas membantu pekerjaan berulang — menyusun perangkat ajar, membuat soal, mengoreksi EYD, dan menilai karangan — agar guru memiliki lebih banyak waktu untuk membimbing murid. AI membantu, guru yang memutuskan." },
    { q: "Apakah tersedia untuk siswa?", a: "Ya. Siswa bisa bergabung melalui kode kelas dari guru, atau langsung belajar melalui Arena: Jalur Cerdas, gim, karya, simulasi, dan liga tersedia untuk semua murid." },
  ];

  return (
    <>
      <JsonLd data={breadcrumbLd([
        { position: 1, name: "Beranda", item: "https://www.bahasacerdas.com" },
        { position: 2, name: "Arena", item: "https://www.bahasacerdas.com/arena" },
        { position: 3, name: "Simulasi", item: "https://www.bahasacerdas.com/arena/simulasi" },
      ])} />
      <JsonLd data={faqPageLd(faqs)} />

      <nav aria-label="Lompat ke konten" className="sr-only focus:not-sr-only">
        <a href="#main-content" className="skip-link">Langsung ke konten utama</a>
      </nav>

      <PageNavbar />

      <main id="main-content" className="min-h-screen">
        {/* 1 · HERO — positioning: satu ekosistem untuk semua */}
        <HeroSection />

        {/* 2 · VIDEO + KABAR — video kiri (55%), pengumuman kanan (45%) */}
        <PromoVideoSection />

        {/* 3 · BUKTI SOSIAL — angka riil dari database */}
        <SocialProof initial={socialProof} />

        {/* 4 · EKOSISTEM — pilar BELAJAR/MENGAJAR/BERLATIH & BERMAIN/BERKARYA & BERTUMBUH */}
        <EcosystemSection />

        {/* 5 · GURU — ruang untuk mengajar */}
        <TeacherSection />

        {/* 6 · MURID — perjalanan untuk belajar */}
        <StudentSection />

        {/* 7 · LEARNING LOOP — belajar tidak berhenti ketika soal selesai */}
        <LearningLoopSection />

        {/* 8 · BIGT — dari belajar hingga mengukur kemampuan */}
        <BigtSection />

        {/* 9 · AI SUPPORT — AI membantu, guru memutuskan */}
        <AIToolsSection />

        {/* 10 · KARYA — belajar bersama, berkarya bersama */}
        <KaryaPopulerSection />

        {/* 11 · KOMUNITAS — tumbuh bersama, dengan foto kegiatan MGMP */}
        <KomunitasSection mgmpMedia={mgmpMedia} />

        {/* 12 · VIDEO & ARTIKEL — belajar tidak berhenti di dalam kelas */}
        <section className="relative py-14 lg:py-20 bg-white" id="artikel" aria-labelledby="media-heading">
          <div className="section-container">
            <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
                <span className="text-xs font-semibold text-primary">
                  Video & Artikel
                </span>
              </div>
              <h2 id="media-heading" className="heading-lg text-zinc-900 mb-4">
                Belajar tidak berhenti{" "}
                <span className="text-primary">di dalam kelas</span>
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/video-belajar"
                  className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors focus-ring rounded"
                >
                  Lihat Video Pembelajaran &rarr;
                </Link>
                <Link
                  href="/artikel"
                  className="text-sm font-semibold text-zinc-500 hover:text-primary transition-colors focus-ring rounded"
                >
                  Lihat Semua Artikel &rarr;
                </Link>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {artikel.length > 0 ? (
                artikel.slice(0, 3).map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/artikel/${a.slug}`}
                    className="group rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50/50 card-hover focus-ring"
                    aria-label={`Artikel: ${a.title}`}
                  >
                    <div className="p-5">
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
                      <p className="text-xs text-zinc-400 mt-3">
                        {a.author?.fullName} &middot;{" "}
                        {new Date(a.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-8 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <p className="text-zinc-400">
                    Artikel belajar akan segera tersedia.
                  </p>
                </div>
              )}

              {videos.length > 0 && (
                <Link
                  href="/video-belajar"
                  className="group rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-900 card-hover focus-ring"
                  aria-label={`Video pilihan: ${videos[0].title}`}
                >
                  <div className="relative">
                    <div className="aspect-video relative">
                      <SafeMediaImage
                        src={videos[0].thumbnailUrl}
                        alt=""
                        fallbackType="video"
                        containerClassName="w-full h-full"
                        className="opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                      />
                    </div>
                    {videos[0].duration && (
                      <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">
                        {videos[0].duration}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider mb-1.5">
                      Video Pembelajaran
                    </p>
                    <h4 className="font-semibold text-white text-sm leading-snug line-clamp-1">
                      {videos[0].title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1.5">
                      {videos[0].views?.toLocaleString() || 0} ditonton &middot; Klik untuk menonton
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>

{/* 13 · FAQ — SATU blok tanya jawab (jawaban singkat tidak lagi dirender terpisah) */}
        <FAQSection />

        {/* 14 · TENTANG — bridge ke narasi produk */}
        <AboutBridge />

        {/* 15 · FINAL CTA — bahasa Indonesia sedang bertumbuh */}
        <FinalCTA />
      </main>

      <PageFooter />
    </>
  );
}