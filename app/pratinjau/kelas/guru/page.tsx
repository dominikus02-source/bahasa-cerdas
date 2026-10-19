import { notFound } from "next/navigation";
import GuruKelaskuPage from "@/app/(dashboard)/guru/kelasku/page";

export const dynamic = "force-dynamic";

/** Pratinjau lokal Kelasku guru (tanpa auth) dalam scope aksen guru. Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return (
    <div className="bc-guru-shell min-h-screen" style={{ background: "var(--clr-bg)" }}>
      <div className="bc-guru mx-auto max-w-6xl px-4 py-6">
        <GuruKelaskuPage />
      </div>
    </div>
  );
}
