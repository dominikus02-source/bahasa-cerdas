/* Regression: founder Guru navbar tidak overlap, label peran, logout di Profil/Pengaturan,
   dan layar JUMPA yang diterima tetap jadi kanvas utama di landscape Android. */
import { readFileSync } from "node:fs";
let passed = 0, failed = 0;
const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; console.log(`${ok ? "PASS" : "FAIL"} ${n}`); };
const src = (p: string) => readFileSync(p, "utf8");

const sw = src("components/shared/FounderDashboardSwitcher.tsx");
const labels = [...sw.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
check("label peran tepat GURU/UMUM/MURID/FOUNDER", JSON.stringify([...labels].sort()) === JSON.stringify(["FOUNDER", "GURU", "MURID", "UMUM"]));
check("tidak ada kata 'Dasbor' pada switcher", !/Dasbor/.test(sw));
check("menu switcher tidak melewati lebar layar 360px", sw.includes("max-w-[calc(100vw-2rem)]"));

const guru = src("app/(dashboard)/guru/layout.tsx");
const header = guru.slice(guru.indexOf("header={"), guru.indexOf("bottomNav="));
check("navbar Guru tidak lagi memuat tombol Keluar", !/LogoutButton/.test(header));
check("founder: profil & NARA di navbar hanya di layar lebar; akun reguler tidak berubah", header.includes('user.isFounder ? "hidden lg:flex" : "flex"') && header.includes('<div className="hidden lg:flex"><NaraHeaderLink /></div>'));
check("Profil tetap di bottom nav mobile Guru", src("components/dashboard/GuruNav.tsx").includes('{ label: "Profil", href: "/guru/profile"'));
check("Keluar ada di Pengaturan Guru", src("app/(dashboard)/guru/pengaturan/page.tsx").includes('<ArenaLogoutButton variant="settings" to="/login" />'));
check("Keluar ada di Profil Guru", src("app/(dashboard)/guru/profile/page.tsx").includes('<ArenaLogoutButton variant="settings" to="/login" />'));
const lb = src("components/arena/LogoutButton.tsx");
const settings = lb.slice(lb.indexOf('variant === "settings"'), lb.indexOf('variant === "icon"'));
check("tombol Keluar Pengaturan bukan merah (merah hanya untuk error)", settings.length > 0 && !/rose-|red-/.test(settings) && settings.includes("Keluar dari akun"));

const view = src("components/jumpa/JumpaRoomView.tsx");
check("stage layar menandai data-screen-sharing", view.includes('className="jumpa-screen-stage') && view.includes('data-screen-sharing="true"'));
check("tombol perbesar layar menyembunyikan strip peserta", view.includes("{!screenFocus && <Strip") && view.includes('aria-label={screenFocus ? "Tampilkan peserta" : "Perbesar layar yang dibagikan"}'));
check("tombol berbagi layar hanya tampil bila getDisplayMedia ada (tanpa tombol mati di WebView)", view.includes('"getDisplayMedia" in navigator.mediaDevices'));
const css = src("components/jumpa/jumpa.css");
const land = css.slice(css.indexOf("@media (orientation: landscape) and (max-height: 600px) and (pointer: coarse)"));
check("landscape HP: strip jadi rel vertikal, layar mengisi sisa", land.includes("flex-direction: row") && land.includes(".jumpa-screen-stage .jumpa-strip"));
check("layar dibagikan pakai object-fit: contain (slide tidak terpotong)", /\[data-screen="true"\] video \{[^}]*object-fit: contain/.test(css));
check("dock landscape menghormati safe-area bawah", land.includes("env(safe-area-inset-bottom)"));
check("tombol fokus menghormati safe-area & target 40-44px", css.includes(".jumpa-screen-focus-btn") && css.includes("env(safe-area-inset-right)") && /width: 44px/.test(css));
console.log(`RESULT ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
