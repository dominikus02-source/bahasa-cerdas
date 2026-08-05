// Profil murid lain, dipasang di dalam /arena.
//
// Arena menautkan ke sini dari kartu karya dan komentar. Di /profile/[id] ia
// jatuh di luar scope APK, jadi mengetuk avatar teman sekelas membuka tab
// browser berikut address bar — keluar dari aplikasi hanya untuk melihat siapa
// yang menulis sebuah karya.
//
// Layarnya tidak diduplikasi dan tetap melayani jalur lamanya. Segmen WAJIB
// bernama [id]: komponennya membaca useParams().id.
export { default } from "@/app/(dashboard)/profile/[id]/page";
