export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "BahasaCerdas",
    url: "https://www.bahasacerdas.com",
    description:
      "Ekosistem belajar Bahasa Indonesia untuk guru dan murid: belajar, berlatih, bermain, berkarya, dan bertumbuh dalam satu platform.",
    foundingDate: "2025",
    email: "halo@bahasacerdas.com",
    areaServed: { "@type": "Country", name: "ID" },
    sameAs: [
      "https://www.instagram.com/bahasacerdas",
      "https://www.youtube.com/@bahasacerdas",
      "https://x.com/bahasacerdas",
    ],
    brand: {
      "@type": "Brand",
      name: "BahasaCerdas",
      description: "Ekosistem Belajar Bahasa Indonesia.",
    },
  };
}

export function softwareAppLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BahasaCerdas",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
      description: "Gratis untuk memulai. Guru Pro: Rp 49.000/bulan.",
    },
    author: {
      "@type": "Organization",
      name: "BahasaCerdas Team",
    },
  };
}

export function faqPageLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export function breadcrumbLd(items: { position: number; name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((i) => ({
      "@type": "ListItem",
      position: i.position,
      name: i.name,
      item: i.item,
    })),
  };
}

export function webSiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BahasaCerdas",
    url: "https://www.bahasacerdas.com",
    description:
      "Ekosistem belajar Bahasa Indonesia: belajar, berlatih, bermain, berkarya, dan bertumbuh dalam satu platform untuk guru dan murid.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.bahasacerdas.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}
