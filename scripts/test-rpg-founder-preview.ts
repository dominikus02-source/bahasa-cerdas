/**
 * P2.6B.1 — Controlled founder preview contract.
 *
 * This tests the server-only decision matrix without an auth provider or a
 * browser. Static checks pin the route to server-resolved identity and reject
 * client-controlled bypass inputs.
 */

import fs from "node:fs";
import path from "node:path";
import {
  canUseRpgFounderPreview,
  isAllowedRpgPreviewEnvironment,
  type RpgPreviewEnvironment,
} from "../lib/arena/rpg-founder-preview";
import { gameById } from "../lib/arena/game-registry";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const previewEnv: RpgPreviewEnvironment = {
  NODE_ENV: "production",
  VERCEL_ENV: "preview",
  RPG_FOUNDER_PREVIEW_ENABLED: "true",
};
const localEnv: RpgPreviewEnvironment = {
  NODE_ENV: "development",
  RPG_FOUNDER_PREVIEW_ENABLED: "true",
};
const founder = { id: "founder-db-id", role: "MURID", isFounder: true };
const nonFounder = { id: "student-db-id", role: "MURID", isFounder: false };

console.log("\n🔐 P2.6B.1 controlled founder preview");

console.log("\nEnvironment contract");
check("explicit flag is required", !isAllowedRpgPreviewEnvironment({ NODE_ENV: "development" }).allowed);
check("local development is allowed only with the explicit flag", isAllowedRpgPreviewEnvironment(localEnv).allowed);
check("Vercel preview is allowed only with the explicit flag", isAllowedRpgPreviewEnvironment(previewEnv).allowed);
check("production always denies", !isAllowedRpgPreviewEnvironment({ ...previewEnv, VERCEL_ENV: "production" }).allowed);
check("ambiguous environment fails closed", !isAllowedRpgPreviewEnvironment({
  NODE_ENV: "test",
  RPG_FOUNDER_PREVIEW_ENABLED: "true",
}).allowed);

console.log("\nAuthentication and authorization matrix");
check("1. unauthenticated preview request denies", !canUseRpgFounderPreview(null, previewEnv).allowed);
check("2. authenticated non-founder preview request denies", !canUseRpgFounderPreview(nonFounder, previewEnv).allowed);
check("3. authenticated founder preview request allows", canUseRpgFounderPreview(founder, previewEnv).allowed);
check("4. founder in production denies", !canUseRpgFounderPreview(founder, {
  ...previewEnv,
  VERCEL_ENV: "production",
}).allowed);
check("explicit server allowlist can authorize one internal developer", canUseRpgFounderPreview(nonFounder, {
  ...previewEnv,
  RPG_FOUNDER_PREVIEW_USER_IDS: "another-id, student-db-id",
}).allowed);

console.log("\nRoute and product guard static checks");
const root = process.cwd();
const previewRoute = fs.readFileSync(path.join(root, "app/arena/game/rpg/preview/page.tsx"), "utf8");
const publicRoute = fs.readFileSync(path.join(root, "app/arena/game/rpg/page.tsx"), "utf8");
const client = fs.readFileSync(path.join(root, "app/arena/game/rpg/RpgClient.tsx"), "utf8");

check("5. query-string bypass is absent", !previewRoute.includes("searchParams") && !previewRoute.includes("preview=true"));
check("6. client/localStorage bypass is absent", !previewRoute.includes("localStorage") && !previewRoute.includes("\"use client\""));
check("server session is required", previewRoute.includes("await getUser()"));
check("server environment and authorization gate are required", previewRoute.includes("canUseRpgFounderPreview") && previewRoute.includes("currentRpgPreviewEnvironment"));
check("preview fails closed if RPG becomes published", previewRoute.includes("!game || !game.unpublished"));
check("public route enforces premium play gate", publicRoute.includes("requireRpgPlayAccess()"));
check("7. registry published as premium-only (P2.8 launch)", gameById("rpg")?.premiumOnly === true && !gameById("rpg")?.unpublished);
check("8. preview does not inspect or bypass Premium", !previewRoute.includes("isPremium") && !previewRoute.includes("entitlement"));
check("existing runtime is reused with server-derived identity", client.includes("<RPGGame playerId={playerId} playerName={playerName} />") && !client.includes("player.local"));

console.log(`\n📊 Hasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed > 0 ? 1 : 0);
