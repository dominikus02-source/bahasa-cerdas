import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getExecutiveDashboardData } from "@/lib/admin/executive";
import { ExecutiveDashboardView } from "@/components/admin/ExecutiveDashboardView";

export const dynamic = "force-dynamic";

export default async function ExecutiveDashboard() {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");
  const data = await getExecutiveDashboardData();
  return <ExecutiveDashboardView data={data} />;
}
