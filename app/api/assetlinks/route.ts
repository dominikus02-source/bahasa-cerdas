import { NextResponse } from "next/server";

// Digital Asset Links — proves the Arena APK and this origin share an owner.
// Without a 200 here Chrome keeps its URL bar visible inside the app, which makes
// the APK look like a browser window instead of an app.
//
// Served through a rewrite from /.well-known/assetlinks.json (see next.config.ts)
// rather than a static file in public/, because the fingerprint is not knowable
// when this code is written: the signing key does not exist yet, and Play App
// Signing re-signs the upload with a DIFFERENT key, so the value changes again
// after the first Play Console upload. Reading it from an env var keeps both of
// those a dashboard edit instead of a code change plus redeploy.
//
// ANDROID_CERT_FINGERPRINTS accepts a comma-separated list so the local upload
// key and Play's signing key can both be trusted during rollout.

const PACKAGE_NAME = "com.bahasacerdas.arena";

export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  // Empty list until the key exists. Verification then fails honestly (URL bar
  // shows) instead of half-succeeding against a placeholder fingerprint.
  const statements = fingerprints.map((fingerprint) => ({
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: [fingerprint],
    },
  }));

  return NextResponse.json(statements, {
    headers: {
      // Chrome refetches this on install and on updates; a short TTL means a
      // fingerprint fix propagates in minutes rather than being pinned for a day.
      "Cache-Control": "public, max-age=300",
    },
  });
}
