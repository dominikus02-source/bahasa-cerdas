import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shared/sidebar";

export default async function GuruCompetencyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}