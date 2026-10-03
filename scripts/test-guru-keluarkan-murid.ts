/**
 * Audit statik fitur Guru → Keluarkan Murid dari Kelas.
 * Tanpa akses/penulisan database.
 */
import { readFileSync } from "fs";

const page = readFileSync("app/(dashboard)/guru/kelasku/page.tsx", "utf8");
const api = readFileSync("app/api/guru/kelasku/[id]/route.ts", "utf8");

const checks: Array<[string, boolean]> = [
  ["UI memakai ikon UserMinus", page.includes("UserMinus")],
  ["UI memiliki aksi Keluarkan dari kelas", page.includes("Keluarkan")],
  ["UI meminta konfirmasi sebelum tindakan", page.includes("Keluarkan \"{name}\" dari kelas?")],
  ["UI memanggil endpoint DELETE khusus kelas", page.includes("method: \"DELETE\"") && page.includes("/api/guru/kelasku/${activeGroup.id}")],
  ["UI menampilkan bahwa akun/progres tetap aman", page.includes("Akun, karya, progres belajar")],
  ["API khusus kelas memiliki DELETE", api.includes("export async function DELETE(")],
  ["API mencari membership dengan groupId + userId", api.includes("db.groupMember.findFirst") && api.includes("where: { groupId: id, userId }")],
  ["API hanya menghapus GroupMember", api.includes("db.groupMember.deleteMany")],
  ["API tidak menghapus User", !api.includes("db.user.delete") && !api.includes("db.user.update")],
  ["API menolak membership yang tidak ada", api.includes("MEMBER_NOT_FOUND")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? `✅ ${name}` : `❌ ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} pemeriksaan lulus`);
process.exit(failed ? 1 : 0);
