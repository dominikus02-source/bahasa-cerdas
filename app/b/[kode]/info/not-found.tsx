import Link from "next/link";
import { QrCode } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";

export default function QrCodeNotFound() {
  return (
    <main className="min-h-screen bg-bc-bg flex items-center justify-center px-4 py-10">
      <EmptyState
        className="w-full max-w-md"
        icon={<QrCode className="h-6 w-6" />}
        title="Kode tidak ditemukan"
        description="Periksa lagi kode di bukumu, lalu pindai atau ketik ulang."
        action={
          <Link href="/" className={buttonClass({ variant: "primary" })}>
            Ke Beranda
          </Link>
        }
      />
    </main>
  );
}
