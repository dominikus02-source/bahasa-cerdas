import { notFound } from "next/navigation";
import MuridKaryaPage from "@/app/(dashboard)/murid/karya/page";

export const dynamic = "force-dynamic";

/** Pratinjau lokal halaman Karya murid (tanpa auth). Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return (
    <div className="arena-theme ui-app-bg min-h-screen px-4 py-5 md:px-8">
      <MuridKaryaPage />
    </div>
  );
}
