import KaryaFeed from "@/components/student-karya/KaryaFeed";

// Mirror feed karya dalam scope /arena — dipakai oleh APK (TWA di-scope ke
// /arena/*) dan preview guru (gate murid memblokir GURU ke /murid/karya).
// Implementasi feed TUNGGAL ada di KaryaFeed; halaman ini hanya mem-parameter
// kan tautannya agar tetap APK-safe. Route kanonik web: /murid/karya.
export default function FeedPage() {
  return (
    <KaryaFeed
      detailBase="/arena/feed"
      profileBase="/arena/profile"
      tulisHref="/arena/tulis"
      clearHref="/arena/feed"
    />
  );
}
