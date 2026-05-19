import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export default async function MuridLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MURID" && !user.isFounder) {
    redirect("/guru/beranda");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {children}
    </div>
  );
}