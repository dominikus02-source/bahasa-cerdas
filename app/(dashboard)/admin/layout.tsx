import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { BackHome } from "@/components/shared/BackHome";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ShellSidebarToggle } from "@/components/dashboard/ShellSidebarToggle";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user || (user.role !== "ADMIN" && !user.isFounder)) redirect("/login");

  return (
    <ShellLayout
      rootClassName="bg-slate-50 dark:bg-slate-950"
      mainClassName="bc-admin flex-1 px-4 md:px-6 py-6 pb-24 md:pb-8 mx-auto max-w-[1440px] w-full"
      sidebar={
        <>
          <AdminSidebar user={{ fullName: user.fullName, avatar: user.avatar }} />
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <ShellSidebarToggle />
          </div>
        </>
      }
      header={
        <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 h-14 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 dark:bg-slate-900/80 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <BackHome href="/admin" />
            <span className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold text-red-700 dark:text-red-400 truncate">
              <ShieldCheck className="w-4 h-4 shrink-0" /> Panel Admin
            </span>
          </div>
          <ThemeToggle />
        </header>
      }
      bottomNav={<AdminMobileNav />}
    >
      {children}
    </ShellLayout>
  );
}