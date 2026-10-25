import type { Metadata } from "next";
import { requireUmumPage } from "@/lib/auth/umum-page";
import { UmumShell } from "@/components/umum/UmumShell";
import { UmumNotifikasiList } from "@/components/umum/UmumNotifikasiList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifikasi — BahasaCerdas", robots: { index: false, follow: false } };

export default async function UmumNotifikasiPage() {
  const user = await requireUmumPage("/umum/notifikasi");
  return (
    <UmumShell user={user}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-bc-h1 text-bc-text">Notifikasi</h1>
        <p className="mb-6 mt-1 text-bc-small text-bc-text-3">Kabar terbaru untuk akunmu.</p>
        <UmumNotifikasiList />
      </div>
    </UmumShell>
  );
}
