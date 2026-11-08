/**
 * Sampel keamanan/RBAC berisiko tinggi untuk alur Android (perilaku, bukan
 * hanya pencarian teks): pilihan peran pendaftaran, pemilih peran Founder
 * (tampilan saja), dan moderasi JUMPA (termasuk identitas layar).
 */
import { parseRoleSelection } from "../lib/auth/role-intent";
import { canUseFounderDashboardSwitcher, FOUNDER_DASHBOARD_EMAILS } from "../lib/auth/founder-access";
import { canModerate } from "../lib/jumpa/permissions";
import { screenIdentityFor, screenIdentityOrNull } from "../lib/jumpa/screen-identity";

let passed = 0, failed = 0;
const check = (label: string, ok: boolean) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (ok) passed++; else failed++; };

// 1. Pendaftaran: hanya peran allowlist; tidak bisa memilih ADMIN/FOUNDER.
for (const bad of ["ADMIN", "FOUNDER", "admin", "guru", " GURU", "GURU ", "SUPERADMIN", null, undefined, 1, { role: "GURU" }]) {
  check(`pendaftaran menolak peran ${JSON.stringify(bad)}`, parseRoleSelection(bad, null) === null);
}
check("pendaftaran menerima GURU", parseRoleSelection("GURU", null)?.role === "GURU");
check("pendaftaran menerima MURID", parseRoleSelection("MURID", null)?.role === "MURID");

// 2. Pemilih peran Founder: wajib isFounder DAN email allowlist (UI saja; server tetap menjaga).
const founderEmail = FOUNDER_DASHBOARD_EMAILS[0];
check("switcher: isFounder tanpa email allowlist → tersembunyi", !canUseFounderDashboardSwitcher({ isFounder: true, email: "qa@example.invalid" }));
check("switcher: email allowlist tanpa isFounder → tersembunyi", !canUseFounderDashboardSwitcher({ isFounder: false, email: founderEmail }));
check("switcher: isFounder + allowlist (huruf besar/spasi) → tampil", canUseFounderDashboardSwitcher({ isFounder: true, email: ` ${founderEmail.toUpperCase()} ` }));
check("switcher: null → tersembunyi", !canUseFounderDashboardSwitcher(null));

// 3. Moderasi JUMPA.
const host = { userId: "h", roomRole: "HOST" as const, effective: "GURU" as const };
const member = { userId: "m", roomRole: "MEMBER" as const, effective: "MURID" as const };
check("JUMPA: peserta biasa tidak bisa mengeluarkan", !canModerate({ actor: member, action: "REMOVE", roomKind: "KELAS", target: { userId: "x", roomRole: "MEMBER", effective: "MURID" } }).ok);
check("JUMPA: pemandu bisa mengeluarkan peserta", canModerate({ actor: host, action: "REMOVE", roomKind: "KELAS", target: { userId: "x", roomRole: "MEMBER", effective: "MURID" } }).ok);
check("JUMPA: pemandu tidak bisa dikeluarkan", !canModerate({ actor: { ...host, userId: "c", roomRole: "COHOST" }, action: "REMOVE", roomKind: "KELAS", target: { userId: "h", roomRole: "HOST", effective: "GURU" } }).ok);
check("JUMPA: tidak bisa menindak diri sendiri", !canModerate({ actor: host, action: "REMOVE", roomKind: "KELAS", target: { userId: "h", roomRole: "MEMBER", effective: "GURU" } }).ok);

// 4. Identitas layar diturunkan server dari id pengguna, tidak bisa disusupkan.
check("identitas layar tidak bisa bersarang (screen:screen:x)", screenIdentityOrNull("screen:x") === null);
let threw = false; try { screenIdentityFor("a b"); } catch { threw = true; }
check("identitas layar menolak id tidak sah", threw);

console.log(`RESULT ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
