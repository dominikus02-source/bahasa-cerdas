import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import PricingTable from "@/components/landing/PricingTable";

export const metadata: Metadata = {
  title: "Harga & Paket — BahasaCerdas",
  description: "Pilih paket langganan BahasaCerdas. Gratis selamanya atau upgrade ke Premium untuk akses fitur tanpa batas.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <PageNavbar />
      <div className="pt-8">
        <PricingTable />
      </div>
      <PageFooter />
    </main>
  );
}
