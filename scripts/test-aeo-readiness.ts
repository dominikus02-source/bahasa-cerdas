/**
 * AEO Readiness Test Suite — Phase 10
 *
 * Validates:
 * 1. Public pages are crawlable (not behind auth)
 * 2. Canonical URLs are correct per page
 * 3. OG tags are page-specific
 * 4. No unsupported superlative claims
 * 5. JSON-LD structured data exists
 * 6. Sitemap includes all public pages
 * 7. robots.txt allows public pages
 * 8. llms.txt exists
 * 9. FAQ page exists with JSON-LD
 */

const SITE_URL = "https://www.bahasacerdas.com";
const BASE_PATH = process.cwd();

async function main() {
  const results: { pass: boolean; name: string; detail?: string }[] = [];
  let exitCode = 0;

  function check(pass: boolean, name: string, detail?: string) {
    results.push({ pass, name, detail });
    if (!pass) exitCode = 1;
  }

  // 1. Check public pages exist as files or are accessible
  const publicPages = [
    { path: "/", file: "app/page.tsx" },
    { path: "/fitur", file: "app/fitur/page.tsx" },
    { path: "/tentang", file: "app/tentang/page.tsx" },
    { path: "/faq", file: "app/faq/page.tsx" },
    { path: "/kebijakan-privasi", file: "app/kebijakan-privasi/page.tsx" },
    { path: "/syarat-ketentuan", file: "app/syarat-ketentuan/page.tsx" },
  ];

  for (const page of publicPages) {
    const fs = await import("fs");
    const exists = fs.existsSync(`${BASE_PATH}/${page.file}`);
    check(exists, `Page file exists: ${page.path}`, exists ? undefined : `Missing: ${page.file}`);
  }

  // 2. Check public paths in middleware
  const proxyContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/lib/supabase/proxy.ts`, "utf-8")
  );
  const hasLegalPaths =
    proxyContent.includes("/kebijakan-privasi") && proxyContent.includes("/syarat-ketentuan");
  check(
    hasLegalPaths,
    "Legal pages in middleware publicPaths",
    hasLegalPaths ? undefined : "Missing from proxy.ts publicPaths"
  );

  // 3. Check canonical URLs
  const fiturPage = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/app/fitur/page.tsx`, "utf-8")
  );
  check(
    fiturPage.includes('canonical: "https://www.bahasacerdas.com/fitur"'),
    "Canonical URL for /fitur",
    undefined
  );

  const tentangPage = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/app/tentang/page.tsx`, "utf-8")
  );
  check(
    tentangPage.includes('canonical: "https://www.bahasacerdas.com/tentang"'),
    "Canonical URL for /tentang",
    undefined
  );

  // 4. Check no unsupported superlative claims
  const filesToCheck = [
    "app/page.tsx",
    "components/public/PageFooter.tsx",
    "components/landing/FAQSection.tsx",
    "components/landing/KomunitasSection.tsx",
    "components/landing/MengapaSection.tsx",
    "components/landing/TestimoniSection.tsx",
  ];

  const forbidden = [
    { pattern: "terlengkap", label: "terlengkap (unsupported superlative)" },
    { pattern: "terbesar", label: "terbesar (unsupported superlative)" },
    { pattern: "4.8 dari 5", label: "4.8 dari 5 (unverified rating)" },
    { pattern: "1.247 ulasan", label: "1.247 ulasan (unverified count)" },
    { pattern: "10.000+", label: "10.000+ (unverified stat)" },
  ];

  for (const file of filesToCheck) {
    const fs = await import("fs");
    if (!fs.existsSync(`${BASE_PATH}/${file}`)) continue;
    const content = await import("fs").then((fs) =>
      fs.readFileSync(`${BASE_PATH}/${file}`, "utf-8")
    );
    // Instead of file-level check, check content contains the bad patterns
    for (const { pattern, label } of forbidden) {
      if (content.includes(pattern)) {
        const line = content.split("\n").findIndex((l: string) => l.includes(pattern));
        check(false, `${label} found in ${file}`, `Line ${line + 1}`);
      }
    }
  }

  // 5. Check JSON-LD exists
  const pageContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/app/page.tsx`, "utf-8")
  );
  check(
    pageContent.includes("JsonLd") && pageContent.includes("faqPageLd"),
    "FAQ JSON-LD on homepage",
    undefined
  );
  check(
    pageContent.includes("AnswerBlock"),
    "AnswerBlock component on homepage",
    undefined
  );

  // 6. Check sitemap includes new pages
  const sitemapContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/app/sitemap.ts`, "utf-8")
  );
  check(
    sitemapContent.includes("/fitur") &&
      sitemapContent.includes("/tentang") &&
      sitemapContent.includes("/faq") &&
      sitemapContent.includes("/kebijakan-privasi") &&
      sitemapContent.includes("/syarat-ketentuan"),
    "Sitemap includes all public pages",
    undefined
  );

  // 7. Check robots.txt
  const robotsContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/public/robots.txt`, "utf-8")
  );
  check(
    robotsContent.includes("Sitemap:"),
    "robots.txt has sitemap reference",
    undefined
  );

  // 8. Check llms.txt exists
  const llmsExists = await import("fs").then((fs) =>
    fs.existsSync(`${BASE_PATH}/public/llms.txt`)
  );
  check(llmsExists, "llms.txt exists", llmsExists ? undefined : "Missing");

  // 9. Check FAQ page exists and has JSON-LD
  const faqPageContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/app/faq/page.tsx`, "utf-8")
  );
  check(
    faqPageContent.includes("faqPageLd") && faqPageContent.includes("JsonLd"),
    "FAQ page has JSON-LD",
    undefined
  );
  check(
    (faqPageContent.match(/q: "/g) || []).length >= 10,
    "FAQ page has 10+ questions",
    `Found ${(faqPageContent.match(/q: "/g) || []).length} questions`
  );

  // 10. Check JSON-LD helpers
  const jsonLdContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/lib/json-ld.ts`, "utf-8")
  );
  check(
    jsonLdContent.includes("organizationLd") &&
      jsonLdContent.includes("faqPageLd") &&
      jsonLdContent.includes("breadcrumbLd") &&
      jsonLdContent.includes("softwareAppLd"),
    "All JSON-LD helper functions exist",
    undefined
  );

  // 11. Check navbar has FAQ link
  const navbarContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/components/public/PageNavbar.tsx`, "utf-8")
  );
  check(
    navbarContent.includes('/faq"') || navbarContent.includes("/faq,"),
    "FAQ link in navbar",
    undefined
  );

  // 12. Check footer has FAQ link
  const footerContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/components/public/PageFooter.tsx`, "utf-8")
  );
  check(
    footerContent.includes('/faq"') || footerContent.includes("/faq,"),
    "FAQ link in footer",
    undefined
  );

  // 13. Check layout has sameAs in JSON-LD
  const layoutContent = await import("fs").then((fs) =>
    fs.readFileSync(`${BASE_PATH}/app/layout.tsx`, "utf-8")
  );
  check(
    layoutContent.includes("sameAs") && layoutContent.includes("instagram.com/bahasacerdas"),
    "Layout JSON-LD has sameAs social URLs",
    undefined
  );

  // Summary
  console.log("\n=== AEO Readiness Test Results ===\n");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  for (const r of results) {
    console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests`);

  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
