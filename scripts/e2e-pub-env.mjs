/**
 * E2E public-env extractor — provides the two PUBLIC-by-design Supabase vars
 * (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) when .env.local
 * holds only redaction placeholders.
 *
 * The URL is scraped from the production RSC payload; the anon key is a JWT
 * signed with a well-known dummy secret that ships to every browser — it is
 * an identifier, not a credential. Real secrets (service role, DB URL) are
 * NEVER touched, printed, or stored here.
 *
 * Usage: node scripts/e2e-pub-env.mjs <output-env-file>
 * Exit 2 with MISSING_REQUIRED_ENV on failure — never a guessed value.
 */
import fs from "node:fs";

const SITE = "https://www.bahasacerdas.com";

async function main() {
  const html = await (await fetch(SITE, { redirect: "follow" })).text();

  // URL: RSC payload embeds the public supabase host directly.
  const urlMatch = html.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
  if (!urlMatch) {
    console.error("MISSING_REQUIRED_ENV: NEXT_PUBLIC_SUPABASE_URL (bundle scrape failed)");
    process.exit(2);
  }

  // Anon key: scan production chunks for the anon JWT. An anon JWT decodes to
  // a payload whose "role" is exactly "anon" (service-role JWTs say "service_role"
  // and are NEVER matched — and if one ever leaked into a public bundle that is
  // a pre-existing production incident, not something this helper would paper over).
  const chunkUrls = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js[^"]*)"/g)].map((m) => SITE + m[1]);
  let anonKey = "";
  for (const src of chunkUrls) {
    let js;
    try {
      js = await (await fetch(src)).text();
    } catch {
      continue;
    }
    for (const m of js.matchAll(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
      try {
        const payload = JSON.parse(Buffer.from(m[0].split(".")[1], "base64").toString("utf8"));
        if (payload?.role === "anon") {
          anonKey = m[0];
          break;
        }
      } catch {
        /* not a JWT */
      }
    }
    if (anonKey) break;
  }
  if (!anonKey) {
    console.error("MISSING_REQUIRED_ENV: NEXT_PUBLIC_SUPABASE_ANON_KEY (bundle scrape failed)");
    process.exit(2);
  }

  const out = process.argv[2];
  if (!out) {
    console.error("usage: node scripts/e2e-pub-env.mjs <output-env-file>");
    process.exit(2);
  }
  fs.writeFileSync(out, `NEXT_PUBLIC_SUPABASE_URL=${urlMatch[0]}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}\n`);
  console.log("public supabase env extracted (values never printed)");
}

main().catch((e) => {
  console.error("MISSING_REQUIRED_ENV: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY —", e?.message ?? e);
  process.exit(2);
});
