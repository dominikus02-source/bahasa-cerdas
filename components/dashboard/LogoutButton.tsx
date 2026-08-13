"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ACTION_ICON_CLASS } from "@/components/shell/icon-tokens";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear all Supabase cookies to prevent stale session on next visit
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-") || name.startsWith("supabase-")) {
        document.cookie = `${name}=; max-age=0; path=/; domain=.bahasacerdas.com`;
        document.cookie = `${name}=; max-age=0; path=/`;
      }
    });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
 className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors group dark:text-slate-400 :bg-slate-800 dark:hover:text-red-400"
    >
      <LogOut className={`${ACTION_ICON_CLASS}`} strokeWidth={2} />
      <span className="shell-label font-medium group-hover:text-red-600 dark:group-hover:text-red-400">Keluar</span>
    </button>
  );
}