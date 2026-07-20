import { checkRateLimit, getClientIdentity } from "../lib/security";

const NAT = "114.10.5.20";      // one school gateway, IPv4
const NAT6 = "2404:6800:4003:c04::1a"; // and the IPv6 case that bit us

const req = (ip: string, token: string | null) => ({
  headers: new Headers({
    "x-forwarded-for": ip,
    ...(token ? { cookie: `sb-ibtl-auth-token=${token}; theme=dark` } : {}),
  }),
});

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

// --- identity ---------------------------------------------------------------
ok("2 murid login, 1 IP -> key beda",
  getClientIdentity(req(NAT, "a")).key !== getClientIdentity(req(NAT, "b")).key);
ok("murid login -> identified", getClientIdentity(req(NAT, "a")).identified);
ok("anonim IPv4 -> NOT identified", !getClientIdentity(req(NAT, null)).identified);
ok("anonim IPv6 -> NOT identified (regresi titik-dua)",
  !getClientIdentity(req(NAT6, null)).identified);
ok("murid sama -> key stabil",
  getClientIdentity(req(NAT, "a")).key === getClientIdentity(req(NAT, "a")).key);

// --- the incident: 20 logged-in students, one IP ----------------------------
let blocked = 0;
for (let s = 0; s < 20; s++) {
  const { key } = getClientIdentity(req(NAT, `murid-${s}`));
  for (let r = 0; r < 15; r++) if (!checkRateLimit(key, "api").allowed) blocked++;
}
ok(`20 murid login x15 req -> 0 diblokir (aktual ${blocked})`, blocked === 0);

// --- Monday: 200 students, one school IP ------------------------------------
// Anonymous arrival (login screen): governed by ipBurst alone.
let anonBlocked = 0;
for (let r = 0; r < 200 * 20; r++) if (!checkRateLimit(NAT, "ipBurst").allowed) anonBlocked++;
ok(`200 anak x20 req anonim -> 0 diblokir (aktual ${anonBlocked})`, anonBlocked === 0);

// Login itself: IP-keyed `auth`, ~3 requests each.
let authBlocked = 0;
for (let r = 0; r < 200 * 3; r++) if (!checkRateLimit(NAT, "auth").allowed) authBlocked++;
ok(`200 anak login serentak -> 0 diblokir (aktual ${authBlocked})`, authBlocked === 0);

// Then working in the app, each with a session.
let workBlocked = 0;
for (let s = 0; s < 200; s++) {
  const { key } = getClientIdentity(req(NAT, `senin-${s}`));
  for (let r = 0; r < 60; r++) if (!checkRateLimit(key, "api").allowed) workBlocked++;
}
ok(`200 anak x60 req bekerja -> 0 diblokir (aktual ${workBlocked})`, workBlocked === 0);

// --- abuse protection must survive all that loosening ------------------------
const hog = getClientIdentity(req("203.0.113.9", "penyerang")).key;
let hogBlocked = false;
for (let r = 0; r < 400; r++) if (!checkRateLimit(hog, "api").allowed) hogBlocked = true;
ok("1 sesi spam 400 req -> diblokir", hogBlocked);

let floodBlocked = false;
for (let r = 0; r < 25_000; r++) if (!checkRateLimit("198.51.100.7", "ipBurst").allowed) floodBlocked = true;
ok("1 IP banjir 25rb req -> diblokir", floodBlocked);

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
