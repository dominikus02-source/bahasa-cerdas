import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server-side auth guard for the client-rendered Writing Studio.
export default async function AkuSastrawanStudioLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=%2Faku-sastrawan%2Fstudio");
  return children;
}
