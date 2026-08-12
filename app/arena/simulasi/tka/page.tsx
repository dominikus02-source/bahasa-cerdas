import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTKAPackages } from "@/lib/kompetensi/get-simulation-packages";
import { TKASimulationClient } from "@/app/(dashboard)/murid/simulasi/tka/client";

export const dynamic = "force-dynamic";

export default async function ArenaSimulasiTKAPage() {
  const tracks = await getTKAPackages();

  return (
    <div className="arena-page px-4 py-6 md:px-6">
      <Link
        href="/arena/simulasi"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-violet-600 transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Simulasi
      </Link>
      <TKASimulationClient tracks={tracks} />
    </div>
  );
}
