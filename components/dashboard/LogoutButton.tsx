"use client";

import { leaveAccount } from "@/lib/auth/leave-account";
import { LogOut } from "lucide-react";
import { ACTION_ICON_CLASS } from "@/components/shell/icon-tokens";

export function LogoutButton() {
  const handleLogout = async () => {
    await leaveAccount("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-bc-sm text-sm text-bc-text-2 hover:bg-bc-danger-soft hover:text-bc-danger transition-colors group"
    >
      <LogOut className={`${ACTION_ICON_CLASS}`} strokeWidth={2} />
      <span className="shell-label font-medium">Keluar</span>
    </button>
  );
}
