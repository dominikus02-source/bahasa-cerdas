import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import JsonLd from "@/components/aeo/JsonLd";
import { breadcrumbLd } from "@/lib/json-ld";
import AboutHero from "@/components/tentang/AboutHero";
import AboutIdentity from "@/components/tentang/AboutIdentity";
import AboutEcosystem from "@/components/tentang/AboutEcosystem";
import BigtSection from "@/components/landing/BigtSection";
import AboutWhyTeam from "@/components/tentang/AboutWhyTeam";
import AboutTeam from "@/components/tentang/AboutTeam";
import AboutLegal from "@/components/tentang/AboutLegal";
import AboutJourney from "@/components/tentang/AboutJourney";
import AboutVision from "@/components/tentang/AboutVision";
import AboutTrust from "@/components/tentang/AboutTrust";
import AboutInvestorFaq from "@/components/tentang/AboutInvestorFaq";
import AboutFinalCta from "@/components/tentang/AboutFinalCta";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Tentang BahasaCerdas | Ekosistem Pembelajaran Bahasa Indonesia",
  description:
    "BahasaCerdas adalah ekosistem pembelajaran Bahasa Indonesia untuk guru, murid, dan sekolah — belajar, berlatih, berkarya, berinteraksi, dan berkompetisi dalam satu platform. Dikembangkan oleh CV Obah Mamah (Teras Kata), NIB 1217000151443.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/tentang",
  },
  openGraph: {
    title: "Tentang BahasaCerdas | Ekosistem Pembelajaran Bahasa Indonesia",
    description:
      "Satu ekosistem yang menghubungkan guru, murid, pembelajaran, latihan, karya, dan komunitas Bahasa Indonesia. Dikembangkan oleh CV Obah Mamah (Teras Kata).",
    url: "https://www.bahasacerdas.com/tentang",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CV Obah Mamah",
  alternateName: "Teras Kata",
  url: "https://www.bahasacerdas.com",
  email: "halo@bahasacerdas.com",
  identifier: "1217000151443",
  description:
    "Badan usaha pengembang BahasaCerdas — platform pembelajaran Bahasa Indonesia berbasis kecerdasan buatan.",
  brand: {
    "@type": "Brand",
    name: "BahasaCerdas",
    description:
      "Ekosistem belajar Bahasa Indonesia untuk guru dan murid: belajar, berlatih, bermain, berkarya, dan bertumbuh dalam satu platform.",
  },
};

export default function TentangPage() {
  return (
    <main className="min-h-screen">
      <JsonLd
        data={breadcrumbLd([
          { position: 1, name: "Beranda", item: "https://www.bahasacerdas.com" },
          { position: 2, name: "Tentang BahasaCerdas", item: "https://www.bahasacerdas.com/tentang" },
        ])}
      />
      <JsonLd data={organizationLd} />

      <PageNavbar />

      {/* 1 — Hero */}
      <AboutHero />

      {/* 2 — Siapa Kami */}
      <AboutIdentity />

      {/* 3 — Ekosistem (5 pilar) */}
      <AboutEcosystem />

      {/* 4 — BIGT */}
      <BigtSection />

      {/* 5 — Mengapa Tim Ini */}
      <AboutWhyTeam />

      {/* 6 — Tim Pendiri + Dewan Penasihat & Validator */}
      <AboutTeam />

      {/* 7 — Legalitas & Transparansi */}
      <AboutLegal />

      {/* 8 — Perjalanan (Timeline) */}
      <AboutJourney />

      {/* 9 — Visi & Misi */}
      <AboutVision />

      {/* 10 — Prinsip Kepercayaan */}
      <AboutTrust />

      {/* 11 — Kemitraan & FAQ */}
      <AboutInvestorFaq />

      {/* 12 — Final CTA */}
      <AboutFinalCta />

      <PageFooter />
    </main>
  );
}