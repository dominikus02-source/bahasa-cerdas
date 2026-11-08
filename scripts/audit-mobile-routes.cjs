#!/usr/bin/env node
"use strict";

/**
 * Audit Android WebView destinations against Next.js page inventory.
 * Static mode: no network, safe for CI.
 * --live: read-only, rate-limited anonymous GET probes of literal destinations.
 * A 302 to login is expected for RBAC-protected pages, NOT proof of page UX.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const appDir = path.join(root, "app");
const catalogFile = path.join(root, "mobile/lib/core/constants/mobile_feature_catalog.dart");
const appRoutesFile = path.join(root, "mobile/lib/core/constants/app_routes.dart");

function findPages(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith("_") || ent.name.startsWith("@")) continue;
    const target = path.join(dir, ent.name);
    if (ent.isDirectory()) findPages(target, out);
    else if (ent.isFile() && ent.name === "page.tsx") {
      const segments = path.relative(appDir, path.dirname(target)).split(path.sep)
        .filter(s => s && !/^\(.*\)$/.test(s));
      out.push("/" + segments.join("/"));
    }
  }
  return out;
}
const pages = findPages(appDir);
function matchesRoute(dest, route) {
  const parts = (value) => value.split("/").filter(Boolean);
  const a = parts(dest), b = parts(route);
  if (a.length !== b.length) return false;
  return a.every((part, i) => part === b[i] || /^\[(?:\.{3})?[^\]]+\]$/.test(b[i]));
}

const features = fs.readFileSync(catalogFile, "utf8");
const routes = fs.readFileSync(appRoutesFile, "utf8");
const destinations = new Map();
for (const m of features.matchAll(/MobileFeature\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
  destinations.set(m[3].split(/[?#]/)[0], "feature: " + m[1]);
}
const localFlutterRoutes = new Set(["splash", "landing", "login", "signup", "forgot", "dashboard", "logout"]);
for (const m of routes.matchAll(/static const String\s+(\w+)\s*=\s*'([^']+)'/g)) {
  if (localFlutterRoutes.has(m[1]) || !m[2].startsWith("/")) continue;
  destinations.set(m[2].split(/[?#]/)[0], "app route: " + m[1]);
}
for (const [url, label] of [
  ["/login", "login and password recovery"], ["/register", "register"],
  ["/jumpa", "JUMPA"], ["/guru/beranda", "guru"], ["/murid/beranda", "murid"],
  ["/umum", "umum"], ["/admin", "admin"], ["/arena", "ARENA"],
]) destinations.set(url, label);

const missing = [...destinations].filter(([dest]) => !pages.some(page => matchesRoute(dest, page)));
console.log("Mobile route inventory:", JSON.stringify({
  appPages: pages.length, distinctMobileDestinations: destinations.size,
  missingLocalPages: missing.map(([route, feature]) => ({ route, feature })),
}, null, 2));
if (missing.length) process.exitCode = 1;

async function runLive() {
  const origin = process.env.BC_AUDIT_ORIGIN || "https://www.bahasacerdas.com";
  const requests = [...destinations.keys()].filter(Boolean).sort();
  const results = [];
  let next = 0;
  async function worker() {
    while (next < requests.length) {
      const current = requests[next++];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(origin + current, {
          redirect: "manual", signal: controller.signal,
          headers: { "User-Agent": "BahasaCerdas-mobile-audit/1.0", Accept: "text/html" },
        });
        const location = response.headers.get("location") || "";
        const locationPath = location ? (() => { try { return new URL(location, origin).pathname; } catch { return "?"; } })() : "";
        results.push({ route: current, status: response.status, redirect: locationPath || undefined });
      } catch (e) {
        results.push({ route: current, status: "NETWORK_ERROR", error: e.name });
      } finally { clearTimeout(timer); }
    }
  }
  await Promise.all([worker(), worker()]); // max 2 in flight
  results.sort((a, b) => a.route.localeCompare(b.route));
  const suspicious = results.filter(x => x.status === "NETWORK_ERROR" || x.status === 404 || (typeof x.status === "number" && x.status >= 500));
  console.log("Anonymous HTTP route probes:", JSON.stringify({
    origin, checked: results.length, issues: suspicious,
    results,
  }, null, 2));
  if (suspicious.length) process.exitCode = 1;
}

if (process.argv.includes('--live')) runLive().catch(e => { console.error(e); process.exitCode = 1; });
