import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
      mainClassName="flex-1 px-6 py-6 mx-auto max-w-[1440px] w-full"
      sidebar={
        <>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <Link href="/admin" className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm shrink-0">BC</div>
              <div className="min-w-0">
                <p className="shell-label font-bold text-slate-900 text-sm truncate dark:text-white">Panel Admin</p>
                <p className="shell-label text-[10px] text-slate-400">Founder</p>
              </div>
            </Link>
          </div>
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
    >
      {children}
    </ShellLayout>
  );
}