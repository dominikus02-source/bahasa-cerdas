import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ════════════════════════════════════════════════════════════════════
// ADMIN ROOT — Redirect to Control Tower
//
// Control Tower (/admin/executive) is the canonical founder dashboard.
// This redirect preserves backward compatibility for bookmarks/links.
// ════════════════════════════════════════════════════════════════════

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");
  redirect("/admin/executive");
}
