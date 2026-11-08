import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { FOUNDER_DASHBOARD_EMAILS } from "../lib/auth/founder-access";
import { FounderDashboardSwitcher } from "../components/shared/FounderDashboardSwitcher";

const founder = { email: FOUNDER_DASHBOARD_EMAILS[0], isFounder: true };
const html = renderToStaticMarkup(<FounderDashboardSwitcher user={founder} compact />);

for (const [path, label] of [
  ["/umum", "UMUM"],
  ["/guru/beranda", "GURU"],
  ["/murid/beranda", "MURID"],
  ["/admin", "FOUNDER"],
] as const) {
  const anchor = html.match(new RegExp('<a[^>]+href="' + path + '"[^>]*>([\\s\\S]*?)<\\/a>'));
  assert.ok(anchor, "Missing authorized switcher route " + path);
  const visibleLabel = anchor[1].replace(/<[^>]+>/g, "").trim();
  assert.equal(visibleLabel, label, "Unexpected role label for " + path);
  assert.doesNotMatch(visibleLabel, /Dasbor|Dashboard|Panel Admin/i);
}
assert.match(html, /Pilih peran: FOUNDER/);
assert.ok(!html.includes("Pindah Dasbor Founder"), "Header must use compact label");
assert.equal(renderToStaticMarkup(<FounderDashboardSwitcher user={{ isFounder:false, email:founder.email }} compact />), "");
assert.equal(renderToStaticMarkup(<FounderDashboardSwitcher user={{ isFounder:true, email:"not-founder@example.invalid" }} compact />), "");
console.log("PASS: compact Founder role switcher labels UMUM/GURU/MURID/FOUNDER, RBAC unchanged");
