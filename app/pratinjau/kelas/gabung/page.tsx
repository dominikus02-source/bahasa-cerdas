import { notFound } from "next/navigation";
import GabungKelasPage from "@/app/(dashboard)/murid/gabung-kelas/page";

export const dynamic = "force-dynamic";

/** Pratinjau lokal halaman gabung kelas (tanpa auth). Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return (
    <div className="ui-app-bg min-h-screen px-4 py-5">
      <GabungKelasPage />
    </div>
  );
}
