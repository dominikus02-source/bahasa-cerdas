// Guards the infinite-scroll fix on the karya feeds.
//
// IntersectionObserver.observe() invokes its callback immediately with the
// current intersection state. So if the effect that creates the observer
// depends on paging state (page / cursor / loadingMore), every load tears the
// observer down and rebuilds it, and the fresh observer fires again while the
// sentinel is still on screen. That chain-loaded page after page unprompted:
// teachers and students reported the feed scrolling away under them while they
// were reading a student's work.
//
// The fix keeps paging state in refs so the observer is built once per filter.
// These assertions fail if anyone reintroduces the state into the deps array.
import { readFileSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const FEEDS = [
  {
    name: "guru/feed-karya",
    path: "app/(dashboard)/guru/feed-karya/page.tsx",
    banned: ["page", "totalPages", "loadingMore"],
  },
  {
    name: "murid/beranda",
    path: "app/(dashboard)/murid/beranda/page.tsx",
    banned: ["cursor", "hasMore", "loadingMore"],
  },
];

for (const feed of FEEDS) {
  const src = readFileSync(join(process.cwd(), feed.path), "utf8");

  // Isolate the effect that constructs the observer and read its deps array.
  const idx = src.indexOf("new IntersectionObserver");
  ok(`${feed.name}: observer ditemukan`, idx !== -1);
  if (idx === -1) continue;

  const after = src.slice(idx);
  const depsMatch = after.match(/\}, \[([^\]]*)\]\);/);
  ok(`${feed.name}: deps array terbaca`, !!depsMatch);
  if (!depsMatch) continue;

  const deps = depsMatch[1].split(",").map((d) => d.trim()).filter(Boolean);
  for (const bad of feed.banned) {
    ok(`${feed.name}: "${bad}" TIDAK ada di deps observer`, !deps.includes(bad));
  }

  // The guard has to be a ref, otherwise concurrent fires stack before React
  // state catches up.
  ok(`${feed.name}: pakai ref sebagai kunci`, /loadingMoreRef\.current/.test(after.slice(0, 900)));

  // Loading flags must always be released, or one failed request freezes the
  // feed for the rest of the session.
  ok(`${feed.name}: flag loading selalu dilepas`, /finally\s*\{/.test(src) || /\.finally\(/.test(src));
}

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
