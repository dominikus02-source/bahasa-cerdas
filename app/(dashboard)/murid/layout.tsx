import { getUser } from "@/lib/supabase/server";
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { redirect } from "next/navigation";
// Kerangka (sidebar · header [BackHome … UserAvatar, NotificationBell, ThemeToggle] · MuridMobileNav)
// ada di components/shell/MuridShellFrame.tsx.
import { MuridShellFrame } from "@/components/shell/MuridShellFrame";
export default async function MuridLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // 4.2.2 — Guru boleh mengintip Student Shell sebagai mode pratinjau
  // (role tetap GURU). Hanya selain Murid/Guru/Founder yang dipindahkan.
  if (user.role !== "MURID" && user.role !== "GURU" && !user.isFounder) {
    redirect("/guru/beranda");
  }

  if (user.role === "MURID" && !user.onboarded) {
    redirect("/onboarding");
  }

  // Rank resmi diturunkan dari XP — User.league sudah tidak ditulis lagi.
  const rank = rankFromLevel(levelFromXp(user.xp || 0))

  return (
    <MuridShellFrame user={{ fullName: user.fullName, avatar: user.avatar, role: user.role, isFounder: user.isFounder }} rank={rank}>
      {children}
    </MuridShellFrame>
  );
}
