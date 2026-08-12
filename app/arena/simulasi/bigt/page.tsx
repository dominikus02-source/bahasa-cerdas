import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BigtInfoPage } from "@/components/bigt/BigtInfoPage";

export default function ArenaSimulasiBigtPage() {
  return (
    <div className="arena-page px-4 py-6 md:px-6">
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
