import { notFound } from "next/navigation";
import MuridProfilePage from "@/app/(dashboard)/murid/profile/page";

export const dynamic = "force-dynamic";

/** Pratinjau lokal profil murid (tanpa auth). Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return (
    <div className="ui-app-bg min-h-screen">
      <MuridProfilePage />
    </div>
  );
}
