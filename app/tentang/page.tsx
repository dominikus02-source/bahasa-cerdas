import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import JsonLd from "@/components/aeo/JsonLd";
import { breadcrumbLd, publicPeopleLd } from "@/lib/json-ld";
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
    "BahasaCerdas adalah ekosistem pembelajaran Bahasa Indonesia untuk masyarakat umum, murid, dan guru — belajar, berlatih, berkarya, berinteraksi, dan berkompetisi dalam satu platform. Dikembangkan oleh PT Bahasa Cerdas Indonesia, NIB 0911260094193.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/tentang",
  },
  openGraph: {
    title: "Tentang BahasaCerdas | Ekosistem Pembelajaran Bahasa Indonesia",
    description:
      "Satu ekosistem yang menghubungkan masyarakat umum, murid, dan guru dalam pembelajaran Bahasa Indonesia. Dikembangkan oleh PT Bahasa Cerdas Indonesia.",
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
  name: "PT Bahasa Cerdas Indonesia",
  legalName: "PT Bahasa Cerdas Indonesia",
  alternateName: "BahasaCerdas",
  url: "https://www.bahasacerdas.com",
  email: "halo@bahasacerdas.com",
  identifier: "0911260094193",
  foundingDate: "2026-11-05",
  address: {
    "@type": "PostalAddress",
    streetAddress: "CFX Tower, Jl. Gatot Subroto Kav. 35-36",
    addressLocality: "Jakarta Selatan",
    addressRegion: "DKI Jakarta",
    postalCode: "12950",
    addressCountry: "ID",
  },
  description:
    "Badan hukum pengembang BahasaCerdas — platform pembelajaran Bahasa Indonesia berbasis kecerdasan buatan.",
  brand: {
    "@type": "Brand",
    name: "BahasaCerdas",
    description:
      "Ekosistem belajar Bahasa Indonesia untuk masyarakat umum, murid, dan guru: belajar, berlatih, bermain, berkarya, dan bertumbuh dalam satu platform.",
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

      {/* 6 — Tim Pendiri + Advisor */}
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