// Guards against React hydration error #418 on the guru dashboard.
//
// A "use client" page is still server-rendered for the initial HTML. The server
// runs in UTC while readers are in WIB/WITA/WIT, so anything derived from the
// raw local clock during render produces different markup on each side. The
// greeting on /guru/beranda did exactly that: 15:09 WIB rendered as
// "Selamat pagi" on the server and "Selamat siang" in the browser, and React
// discarded the entire server render to redo it client-side.
//
// These assertions run the greeting logic under several process timezones. Any
// value that differs between them would reintroduce the mismatch.
import { readFileSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

// Mirrors the helpers in app/(dashboard)/guru/beranda/page.tsx.
function jakartaHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
}
function greetingForHour(h: number): string {
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

// The pinned hour must be identical no matter what TZ the process runs in —
// that equality is what makes server and client markup agree.
const zones = ["UTC", "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "America/New_York"];
const seen = new Set<string>();
for (const tz of zones) {
  process.env.TZ = tz;
  seen.add(greetingForHour(jakartaHour()));
}
ok(`sapaan sama di semua zona waktu (${[...seen].join(" / ")})`, seen.size === 1);

// Boundary behaviour should stay stable and total.
ok("jam 07 -> pagi", greetingForHour(7) === "Selamat pagi");
ok("jam 11 -> siang", greetingForHour(11) === "Selamat siang");
ok("jam 15 -> sore", greetingForHour(15) === "Selamat sore");
ok("jam 18 -> malam", greetingForHour(18) === "Selamat malam");
ok("semua jam 0-23 punya sapaan", Array.from({ length: 24 }, (_, h) => greetingForHour(h)).every(Boolean));

// The page itself must not read the raw clock while rendering. Reading it inside
// an effect is fine — that runs after hydration.
const page = readFileSync(
  join(process.cwd(), "app/(dashboard)/guru/beranda/page.tsx"),
  "utf8"
);
const inEffect = /useEffect\(\(\) => \{\s*setGreeting\(greetingForHour\(new Date\(\)\.getHours\(\)\)\)/.test(page);
const rawClockUses = (page.match(/new Date\(\)\.getHours\(\)/g) || []).length;
ok("beranda memakai jam Jakarta yang dipin", page.includes("timeZone: \"Asia/Jakarta\""));
ok("jam lokal mentah hanya dipakai di dalam useEffect", inEffect && rawClockUses === 1);

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
