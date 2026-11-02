import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Menulis · AKU SASTRAWAN",
  description: "Tulis, simpan, dan unduh cerpen serta novelmu di Studio Menulis AKU SASTRAWAN.",
};

// Server-side auth guard for the client-rendered Studio Menulis.
export default async function AkuSastrawanStudioLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=%2Faku-sastrawan%2Fstudio");
  return children;
}
