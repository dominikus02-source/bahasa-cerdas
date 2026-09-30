/**
 * Audit statik fitur Guru → Keluarkan Murid dari Kelas.
 * Tanpa akses/penulisan database.
 */
import { readFileSync } from "fs";

const page = readFileSync("app/(dashboard)/guru/kelasku/page.tsx", "utf8");
const api = readFileSync("app/api/group/[id]/route.ts", "utf8");

const checks: Array<[string, boolean]> = [
  ["UI memakai ikon UserMinus", page.includes("UserMinus")],
  ["UI memiliki aksi Keluarkan dari kelas", page.includes("Keluarkan")],
  ["UI meminta konfirmasi sebelum tindakan", page.includes("Keluarkan \"{name}\" dari kelas?")],
  ["UI mengirim removeMemberUserId", page.includes("removeMemberUserId: removeMember.id")],
  ["UI menampilkan bahwa akun/progres tetap aman", page.includes("Akun, karya, progres belajar")],
  ["API menerima removeMemberUserId", api.includes("removeMemberUserId")],
  ["API mencari membership dengan groupId + userId", api.includes("groupId_userId")],
  ["API hanya menghapus GroupMember", api.includes("db.groupMember.delete")],
  ["API tidak menghapus User", !api.includes("db.user.delete({ where: { id: removeMemberUserId")],
  ["API menolak membership yang tidak ada", api.includes("MEMBER_NOT_FOUND")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? `✅ ${name}` : `❌ ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} pemeriksaan lulus`);
process.exit(failed ? 1 : 0);
