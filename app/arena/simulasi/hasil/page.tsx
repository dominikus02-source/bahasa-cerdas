import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MuridDokumenLatihanPage from "@/app/(dashboard)/murid/dokumen-latihan/page";

export default function ArenaSimulasiHasilPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/arena/simulasi"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-violet-600 transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Simulasi
      </Link>
      <MuridDokumenLatihanPage />
    </div>
  );
}
