// "Gabung Kelas", mounted inside /arena.
//
// Arena links to this from its home screen; at /murid/gabung-kelas it would fall
// outside the APK's /arena scope and open a browser tab. The screen itself is
// unchanged and still serves the student dashboard at its original path — it asks
// useBerandaHref() where it is mounted and sends "back" to the matching home.
export { default } from "@/app/(dashboard)/murid/gabung-kelas/page";
