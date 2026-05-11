import Image from "next/image";
import HeroSection from "@/components/landing/HeroSection";
import SocialProof from "@/components/landing/SocialProof";
import CoreFeatures from "@/components/landing/CoreFeatures";
import AIFeatures from "@/components/landing/AIFeatures";
import CommunitySection from "@/components/landing/CommunitySection";
import MarketplaceSection from "@/components/landing/MarketplaceSection";
import PricingTable from "@/components/landing/PricingTable";
import Testimonials from "@/components/landing/Testimonials";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <SocialProof />
      <CoreFeatures />
      <AIFeatures />
      <CommunitySection />
      <MarketplaceSection />
      <PricingTable />
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
            <p>&copy; 2025 BahasaCerdas. Platform edukasi Bahasa Indonesia untuk bangsa.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}