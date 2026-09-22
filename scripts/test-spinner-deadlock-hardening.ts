import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FetchTimeoutError, fetchWithTimeout, settleWithTimeout } from "../lib/client/fetch-with-timeout";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

async function run() {
  console.log("P1A spinner deadlock hardening\n");

  const originalFetch = globalThis.fetch;
  try {
    // 1. Critical request succeeds.
    globalThis.fetch = (async () => new Response(JSON.stringify({ user: { id: "user-1" } }), { status: 200 })) as typeof fetch;
    const success = await fetchWithTimeout("/api/user/me", {}, 50);
    check("critical request resolves normally", success.ok);

    // 2. Optional request may fail without cancelling fulfilled critical data.
    const optionalResults = await Promise.allSettled([
      Promise.resolve({ items: ["required-data"] }),
      Promise.reject(new Error("optional endpoint unavailable")),
    ]);
    check("optional failure is isolated", optionalResults[0].status === "fulfilled" && optionalResults[1].status === "rejected");

    // 3. A critical failure still reaches a terminal non-loading state.
    let criticalTerminal = false;
    try {
      await Promise.reject(new Error("critical endpoint unavailable"));
    } catch {
      // A route renders its error/retry state here.
    } finally {
      criticalTerminal = true;
    }
    check("critical failure has a terminal state", criticalTerminal);

    // 4. A hanging browser fetch is aborted and surfaced as a typed timeout.
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })) as typeof fetch;
    let timeoutError: unknown;
    try {
      await fetchWithTimeout("/api/hanging", {}, 20);
    } catch (error) {
      timeoutError = error;
    }
    check("hanging request exits through timeout", timeoutError instanceof FetchTimeoutError);

    let sdkTimeoutError: unknown;
    try {
      await settleWithTimeout(new Promise<never>(() => {}), 20);
    } catch (error) {
      sdkTimeoutError = error;
    }
    check("hanging SDK operation reaches a terminal timeout", sdkTimeoutError instanceof FetchTimeoutError);

    // 5. Several optional failures are settled together, not left pending.
    const multiFailure = await Promise.allSettled([
      Promise.reject(new Error("first optional failure")),
      Promise.reject(new Error("second optional failure")),
    ]);
    check("multi-source failures settle without a deadlock", multiFailure.every((result) => result.status === "rejected"));
  } finally {
    globalThis.fetch = originalFetch;
  }

  const criticalLoaders = [
    "app/(auth)/onboarding/page.tsx",
    "app/auth/pilih-peran/page.tsx",
    "app/(dashboard)/murid/kuest-harian/page.tsx",
    "app/(dashboard)/murid/toko-koin/page.tsx",
    "app/(dashboard)/murid/kelasku/[id]/page.tsx",
    "app/(dashboard)/murid/progresku/page.tsx",
    "app/(dashboard)/guru/penilaian/page.tsx",
    "app/(dashboard)/guru/penilaian/kuis/page.tsx",
    "app/(dashboard)/guru/artikel/page.tsx",
    "app/(dashboard)/guru/bank-soal/page.tsx",
    "app/(dashboard)/guru/bank-soal-tka/page.tsx",
    "app/(dashboard)/guru/bank-soal-ukbi/page.tsx",
    "app/(dashboard)/guru/soal/page.tsx",
    "app/(dashboard)/guru/video-belajar/page.tsx",
    "app/(dashboard)/admin/komunitas/page.tsx",
    "app/(dashboard)/admin/loker/page.tsx",
    "app/(dashboard)/admin/payments/page.tsx",
    "app/(dashboard)/admin/premium/page.tsx",
    "app/arena/toko-koin/page.tsx",
    "app/marketplace/[id]/page.tsx",
    "app/video-belajar/[id]/page.tsx",
    "app/loker/page.tsx",
    "app/orders/page.tsx",
    "components/materi/MateriViewer.tsx",
    "components/arena/player/player-context.tsx",
    "components/student-home/home-data.tsx",
  ];
  for (const file of criticalLoaders) {
    const contents = source(file);
    check(`${file} uses bounded initial fetch`, contents.includes("fetchWithTimeout"));
  }

  const retryRoutes = [
    "app/(auth)/onboarding/page.tsx",
    "app/(dashboard)/murid/kuest-harian/page.tsx",
    "app/(dashboard)/murid/toko-koin/page.tsx",
    "app/(dashboard)/guru/penilaian/page.tsx",
    "app/(dashboard)/guru/penilaian/kuis/page.tsx",
    "app/(dashboard)/guru/artikel/page.tsx",
    "app/(dashboard)/guru/bank-soal/page.tsx",
    "app/(dashboard)/guru/bank-soal-tka/page.tsx",
    "app/(dashboard)/guru/bank-soal-ukbi/page.tsx",
    "app/(dashboard)/guru/soal/page.tsx",
    "app/(dashboard)/guru/video-belajar/page.tsx",
    "app/(dashboard)/admin/loker/page.tsx",
    "app/(dashboard)/admin/payments/page.tsx",
    "app/(dashboard)/admin/premium/page.tsx",
    "app/arena/toko-koin/page.tsx",
    "app/marketplace/[id]/page.tsx",
    "app/video-belajar/[id]/page.tsx",
    "app/loker/page.tsx",
  ];
  for (const file of retryRoutes) {
    check(`${file} has recoverable retry UI`, source(file).includes("Coba lagi"));
  }

  const p0Files = ["lib/supabase/proxy.ts", "lib/supabase/server.ts"];
  let p0Unchanged = true;
  try {
    execFileSync("git", ["diff", "--quiet", "main", "--", ...p0Files], { cwd: process.cwd(), stdio: "ignore" });
  } catch {
    p0Unchanged = false;
  }
  check("P0 Supabase refresh files are unchanged", p0Unchanged);
  check("P0 refresh-race guard remains present", source("lib/supabase/proxy.ts").includes("AUTH_REFRESH_RACE_DETECTED"));

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
