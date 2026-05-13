import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar user={{ fullName: user.fullName, avatar: user.avatar }} />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
