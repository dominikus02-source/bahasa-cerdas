import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { ShellSidebarToggle } from "@/components/dashboard/ShellSidebarToggle";

/** Footer sidebar universal: Keluar + Collapse (expand selalu visible, reversibel). */
export function ShellSidebarFooter() {
  return (
    <div className="shell-sidebar-footer mt-auto border-t border-gray-100 dark:border-slate-800 p-3 flex items-center justify-between gap-2">
      <LogoutButton />
      <ShellSidebarToggle />
    </div>
  );
}