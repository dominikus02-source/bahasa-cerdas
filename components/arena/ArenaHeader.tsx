import { BrandMark } from "@/components/shared/BrandMark";
import UserAvatar from "@/components/arena/UserAvatar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/** Arena has its own layout; keep its global header aligned with the student shell. */
export function ArenaHeader({ avatar, fullName, homeHref = "/murid/beranda" }: {
  avatar?: string | null;
  fullName?: string | null;
  homeHref?: string;
}) {
  return (
 <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 h-14 bg-bc-surface/95 border-b border-bc-line">
            <div className="flex min-w-0 flex-1 items-center"><BrandMark href={homeHref} /></div>
            <div className="flex items-center gap-1 md:gap-2">
              <UserAvatar
                size={36}
                avatar={avatar}
                initials={fullName?.charAt(0).toUpperCase() || "M"}
                gradient="from-violet-500 to-purple-600"
                textClassName="text-sm"
                className="hidden md:flex shadow-md"
              />
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
  );
}
