import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export default async function GuruCompetencyLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "GURU" && !user.isFounder) redirect("/murid/beranda");

  return <>{children}</>;
}
