import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";

/**
 * BC Agent P6 — route-level gate for the Founder Control Center.
 * Server-side authorization is mandatory and happens here (and again inside
 * every server action / API route): hiding UI elements is NOT authorization.
 */
export default async function AgentControlLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.isFounder && user.role !== "ADMIN") redirect("/admin");

  return <>{children}</>;
}
