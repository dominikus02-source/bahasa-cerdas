import { notFound } from "next/navigation";
import MuridKelaskuDetailPage from "@/app/(dashboard)/murid/kelasku/[id]/page";

export const dynamic = "force-dynamic";

/** Pratinjau lokal ruang kelas murid (tanpa auth). Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return (
    <div className="ui-app-bg min-h-screen">
      <MuridKelaskuDetailPage params={Promise.resolve({ id: "demo" })} />
    </div>
  );
}
