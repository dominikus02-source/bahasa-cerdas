import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server-side auth guard for the client-rendered novel chapter manager.
export default async function AkuSastrawanNovelLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=%2Faku-sastrawan%2Fstudio");
  return children;
}
