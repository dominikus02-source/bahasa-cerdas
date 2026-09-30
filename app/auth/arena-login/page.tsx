// Legacy compatibility mount. Semua login sekarang menggunakan implementasi
// tunggal dari /login; route lama tetap dipertahankan agar link lama tidak rusak.
export { default } from "@/app/(auth)/login/page";
