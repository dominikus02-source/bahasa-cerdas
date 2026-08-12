import Link from "next/link";
import { PenLine } from "lucide-react";
import KaryaFeed from "@/components/student-karya/KaryaFeed";

/**
 * Karya — route KANONIK produk Karya di Student Shell (murid).
 * Header produk + CTA "+ Buat Karya" + feed bersama (KaryaFeed) yang juga
 * dipakai mirror /arena/feed (APK + preview guru). Gate auth/onboarding
 * ditangani layout (murid).
 */
export default function MuridKaryaPage() {
  return (
    <KaryaFeed
      header={
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Karya</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Bagikan ide, tulisan, dan kreativitasmu.</p>
          </div>
          <Link
            href="/murid/karya/tulis"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-sm shrink-0"
          >
            <PenLine size={16} /> Buat Karya
          </Link>
        </div>
      }
    />
  );
}
