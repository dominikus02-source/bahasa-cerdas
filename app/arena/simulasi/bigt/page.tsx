import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BigtInfoPage } from "@/components/bigt/BigtInfoPage";

export default function ArenaSimulasiBigtPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/arena"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-violet-600 transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Beranda
      </Link>
      <BigtInfoPage role="murid" />
    </div>
  );
}
