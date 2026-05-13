import Image from "next/image";
import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";
import SocialProof from "@/components/landing/SocialProof";
import CoreFeatures from "@/components/landing/CoreFeatures";
import AIFeatures from "@/components/landing/AIFeatures";
import CommunitySection from "@/components/landing/CommunitySection";
import MarketplaceSection from "@/components/landing/MarketplaceSection";
import Testimonials from "@/components/landing/Testimonials";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import PublicNavbar from "@/components/public/PublicNavbar";
import { db } from "@/lib/db";

async function getLatestArtikel() {
  try {
    return await db.artikel.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        coverImage: true, tags: true, readCount: true, createdAt: true,
        author: { select: { fullName: true } },
      },
    });
  } catch { return []; }
}

async function getMarketplaceItems() {
  try {
    return await db.karya.findMany({
      where: { isPublished: true },
      orderBy: { downloads: "desc" },
      take: 3,
      include: {
        seller: { select: { fullName: true } },
        _count: { select: { purchases: true } },
      },
    });
  } catch { return []; }
}

async function getLatestVideos() {
  try {
    return await db.video.findMany({
      where: { isPublished: true },
      orderBy: { views: "desc" },
      take: 3,
      select: {
        id: true, title: true, description: true, thumbnailUrl: true,
        duration: true, category: true, views: true, isPremium: true, grade: true,
      },
    });
  } catch { return []; }
}

export default async function HomePage() {
  const [artikel, karya, videos] = await Promise.all([
    getLatestArtikel(),
    getMarketplaceItems(),
    getLatestVideos(),
  ]);

  return (
    <main className="min-h-screen">
      <PublicNavbar />
      <HeroSection />
      <SocialProof />
      <CoreFeatures />
      <AIFeatures />

      {/* Artikel Terbaru */}
      <section className="py-20 bg-white" id="artikel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-4">
              Artikel & Tips
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">Dari Guru untuk Guru</h2>
            <p className="mt-3 text-slate-600">Tips mengajar, sharing pengalaman, dan wawasan pendidikan</p>
          </div>
          {artikel.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {artikel.map((a: any) => (
              <Link key={a.id} href={`/artikel/${a.slug}`} className="group">
                <article className="bg-slate-50 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col border border-slate-100">
                  <div className="p-5 flex-1 flex flex-col">
                    {a.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {a.tags.slice(0, 2).map((t: string) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                    <h3 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">{a.title}</h3>
                    {a.excerpt && <p className="text-sm text-slate-500 mt-2 line-clamp-2 flex-1">{a.excerpt}</p>}
                    <p className="text-xs text-slate-400 mt-3">{a.author?.fullName} • {new Date(a.createdAt).toLocaleDateString("id")}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
          ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">Belum ada artikel. Guru dapat menulis artikel setelah login.</p>
            <Link href="/login" className="mt-2 inline-block text-sm text-red-600 font-semibold hover:underline">Login & Tulis Artikel →</Link>
          </div>
          )}
          <div className="text-center mt-8">
            <Link href="/artikel" className="inline-flex items-center gap-1 text-red-600 font-semibold hover:underline">
              Lihat semua artikel →
            </Link>
          </div>
        </div>
      </section>

      {/* Karya Terbaru */}
      <section className="py-20 bg-slate-50" id="karya">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
              Toko Karya
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">Karya Populer</h2>
            <p className="mt-3 text-slate-600">RPP, modul, dan soal terbaik dari guru Bahasa Indonesia</p>
          </div>
          {karya.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {karya.map((k: any) => (
              <div key={k.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
                <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">{k.type}</span>
                <h3 className="font-bold text-slate-900 mt-3 line-clamp-2">{k.title}</h3>
                <p className="text-xs text-slate-500 mt-1">oleh {k.seller?.fullName}</p>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{k.description}</p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-600">
                    {k.price > 0 ? `Rp ${k.price.toLocaleString("id")}` : "Gratis"}
                  </span>
                  <span className="text-xs text-slate-400">{k._count?.purchases || 0} terjual</span>
                </div>
              </div>
            ))}
          </div>
          ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">Belum ada karya. Guru dapat upload karya setelah login.</p>
            <Link href="/login" className="mt-2 inline-block text-sm text-emerald-600 font-semibold hover:underline">Login & Mulai Jual →</Link>
          </div>
          )}
          <div className="text-center mt-8">
            <Link href="/marketplace" className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline">
              Lihat semua karya →
            </Link>
          </div>
        </div>
      </section>

      {/* Video Pembelajaran */}
      <section className="py-20 bg-white" id="video">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              Video Pembelajaran
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">Belajar dari Video</h2>
            <p className="mt-3 text-slate-600">Tonton video pembelajaran Bahasa Indonesia gratis</p>
          </div>
          {videos.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {videos.map((v: any) => (
              <Link key={v.id} href="/video-belajar" className="group">
                <div className="bg-slate-50 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow border border-slate-100">
                  <div className="aspect-video bg-slate-200 relative">
                    {v.thumbnailUrl && <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />}
                    {v.isPremium && (
                      <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">PREMIUM</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{v.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{v.description}</p>
                    <div className="text-xs text-slate-400 mt-2">{v.views} ditonton</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">Belum ada video pembelajaran.</p>
            <Link href="/video-belajar" className="mt-2 inline-block text-sm text-blue-600 font-semibold hover:underline">Lihat halaman video →</Link>
          </div>
          )}
          <div className="text-center mt-8">
            <Link href="/video-belajar" className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline">
              Lihat semua video →
            </Link>
          </div>
        </div>
      </section>

      <CommunitySection />
      <MarketplaceSection />
      <Testimonials />
      <FAQSection />
      <FinalCTA />
      
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 shadow-lg overflow-hidden">
                  <Image src="/logo.png" alt="BC" width={40} height={40} className="object-contain" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">BahasaCerdas</span>
                  <p className="text-xs text-slate-500">Platform Edukasi Bahasa Indonesia</p>
                </div>
              </div>
              <p className="text-sm">Platform All-in-One untuk Guru Bahasa Indonesia. MGMP + AI + Marketplace.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href="/artikel" className="text-xs text-slate-500 hover:text-white transition-colors">Artikel</Link>
                <span className="text-slate-700">•</span>
                <Link href="/kamus" className="text-xs text-slate-500 hover:text-white transition-colors">Kamus</Link>
                <span className="text-slate-700">•</span>
                <Link href="/marketplace" className="text-xs text-slate-500 hover:text-white transition-colors">Toko Karya</Link>
                <span className="text-slate-700">•</span>
                <Link href="/video-belajar" className="text-xs text-slate-500 hover:text-white transition-colors">Video</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Fitur</h4>
              <ul className="space-y-2 text-sm">
                <li>AI Generator RPP</li>
                <li>Bank Soal HOTS</li>
                <li>Kuis Multiplayer</li>
                <li>Toko Karya</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Komunitas</h4>
              <ul className="space-y-2 text-sm">
                <li>Forum Diskusi</li>
                <li>Webinar</li>
                <li>Mentoring</li>
                <li>RPP Sharing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Tentang</h4>
              <ul className="space-y-2 text-sm">
                <li>Tentang Kami</li>
                <li>Kebijakan Privasi</li>
                <li>Syarat & Ketentuan</li>
                <li>Hubungi Kami</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2026 BahasaCerdas. Platform edukasi Bahasa Indonesia untuk bangsa.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
