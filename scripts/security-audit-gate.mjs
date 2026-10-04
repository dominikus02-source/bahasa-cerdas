import { spawnSync } from "node:child_process";

const acceptedAdvisories = new Set([
  "GHSA-vfj7-8cjw-p6xm", // braces: no patched release; reachable only through Tailwind build tooling
  "GHSA-5p2g-fcmc-qvqq", // image-size: patched release exists, but PptxGenJS 4.0.1 declares 1.x and does not import it
  "GHSA-w3rx-r6r6-pgpr", // image-size: same dead transitive dependency in PptxGenJS
]);

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["audit", "--omit=dev", "--audit-level=high", "--json"],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
);

if (!result.stdout) {
  process.stderr.write(result.stderr || "npm audit produced no JSON output.\n");
  process.exit(result.status || 1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  process.stderr.write("Could not parse npm audit JSON.\n");
  process.stderr.write(result.stdout.slice(0, 4000));
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};

function advisoryIdsFor(packageName, seen = new Set()) {
  if (seen.has(packageName)) return new Set();
  seen.add(packageName);
  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return new Set();

  const ids = new Set();
  for (const via of vulnerability.via || []) {
    if (typeof via === "string") {
      for (const id of advisoryIdsFor(via, seen)) ids.add(id);
      continue;
    }
    const match = String(via.url || "").match(/GHSA-[0-9a-z-]+/i);
    if (match) ids.add(match[0]);
  }
  return ids;
}

const blocking = [];
const accepted = [];

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if (!["high", "critical"].includes(vulnerability.severity)) continue;
  const ids = [...advisoryIdsFor(packageName)];
  const isAccepted = ids.length > 0 && ids.every((id) => acceptedAdvisories.has(id));
  (isAccepted ? accepted : blocking).push({
    packageName,
    severity: vulnerability.severity,
    advisories: ids,
    fixAvailable: vulnerability.fixAvailable,
  });
}

if (accepted.length) {
  console.log("Accepted temporary production-audit exceptions:");
  for (const item of accepted) {
    console.log(`- ${item.packageName}: ${item.advisories.join(", ")}`);
  }
  console.log("Rationale and removal triggers: docs/compliance/SECURITY_EXCEPTION_REGISTER.md");
}

if (blocking.length) {
  console.error("Blocking high/critical production dependency findings:");
  for (const item of blocking) {
    console.error(`- ${item.packageName}: ${item.severity}; ${item.advisories.join(", ") || "unidentified advisory"}`);
  }
  process.exit(1);
}

console.log("Production dependency security gate passed: no unaccepted high/critical advisories.");
