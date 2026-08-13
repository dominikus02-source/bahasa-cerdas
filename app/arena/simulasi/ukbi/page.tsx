import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUKBIPackages } from "@/lib/kompetensi/get-simulation-packages";
import { UKBISimulationClient } from "@/app/(dashboard)/murid/simulasi/ukbi/client";

export const dynamic = "force-dynamic";

export default async function ArenaSimulasiUKBIPage() {
  const tracks = await getUKBIPackages();

  return (
    <div className="arena-page px-4 py-6 md:px-6">
      <Link
        href="/arena/simulasi"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-violet-600 dark:text-violet-400 transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Simulasi
      </Link>
      <UKBISimulationClient tracks={tracks} />
    </div>
  );
}
