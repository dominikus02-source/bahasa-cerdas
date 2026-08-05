// Halaman daftar, dipasang di dalam /arena.
//
// Tautan "Daftar" di layar login Arena mengarah ke sini. Di /register ia jatuh
// di luar scope APK, jadi murid yang menekannya terlempar ke tab browser tepat
// pada langkah paling rapuh — mendaftar akun. Halamannya sendiri sudah
// mengarahkan murid ke /arena setelah berhasil, jadi alurnya menutup rapi.
export { default } from "@/app/(auth)/register/page";
