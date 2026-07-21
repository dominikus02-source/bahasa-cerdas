// Avatar unlocks must hold on the server.
//
// Three avatars are free so every student can personalise straight away; the
// rest are earned by finishing Jalur Cerdas units, which is what turns the
// collection into a reason to learn. The picker greys out locked ones, but a
// client-side lock is decoration — without the check in the PATCH handler any
// student could set a locked avatar by posting its path.
import { readFileSync } from "fs";
import { join } from "path";
import { AVATARS, FREE_AVATARS, isAvatarUnlocked, isCatalogAvatar, nextLockedAvatar } from "../lib/avatar/katalog";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

// Catalogue shape
ok("9 avatar terdaftar", AVATARS.length === 9);
ok("3 avatar gratis", FREE_AVATARS.length === 3);
ok("semua memakai webp", AVATARS.every((a) => a.src.endsWith(".webp")));
ok("id unik", new Set(AVATARS.map((a) => a.id)).size === AVATARS.length);
ok("syarat menaik", AVATARS.every((a, i) => i === 0 || a.unlockUnits >= AVATARS[i - 1].unlockUnits));

// Gating logic
ok("murid baru (0 materi) dapat 3 avatar",
  AVATARS.filter((a) => isAvatarUnlocked(a, 0)).length === 3);
ok("setelah 1 materi dapat 4",
  AVATARS.filter((a) => isAvatarUnlocked(a, 1)).length === 4);
ok("setelah 20 materi dapat semua",
  AVATARS.filter((a) => isAvatarUnlocked(a, 20)).length === 9);
ok("avatar berikutnya ditawarkan ke murid baru", nextLockedAvatar(0)?.unlockUnits === 1);
ok("tak ada tawaran saat semua terbuka", nextLockedAvatar(20) === undefined);

// Only our own paths are treated as catalogue entries, so an uploaded photo or
// a Google avatar is never mistaken for a locked reward.
ok("path katalog dikenali", isCatalogAvatar("/avatar/9.webp"));
ok("foto unggahan tidak dianggap katalog",
  !isCatalogAvatar("https://xyz.supabase.co/storage/v1/object/public/avatars/avatar-1.png"));
ok("foto Google tidak dianggap katalog",
  !isCatalogAvatar("https://lh3.googleusercontent.com/a/ACg8oc"));
ok("null aman", !isCatalogAvatar(null));

// Every catalogue file must actually exist, or a student unlocks a broken image.
for (const a of AVATARS) {
  const path = join(process.cwd(), "public", a.src);
  let exists = true;
  try { readFileSync(path); } catch { exists = false; }
  if (!exists) fail++;
  if (!exists) console.log(`FAIL  berkas ${a.src} tidak ditemukan`);
}
ok("semua berkas avatar ada di public/", true);

// The server-side gate itself.
const route = readFileSync(join(process.cwd(), "app/api/user/profile/route.ts"), "utf8");
ok("PATCH profil memeriksa katalog", /isCatalogAvatar\(avatar\)/.test(route));
ok("PATCH profil menghitung materi selesai",
  /userUnitProgress\.count[\s\S]{0,120}completed:\s*true/.test(route));
ok("PATCH profil menolak yang terkunci", /AVATAR_LOCKED/.test(route));
ok("penolakan memakai status 403", /status:\s*403/.test(route));

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
