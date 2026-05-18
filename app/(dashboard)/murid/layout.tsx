import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { MuridSidebar } from "@/components/dashboard/MuridSidebar";
import AIFloatingButton from "@/components/shared/AIFloatingButton";

export default async function MuridLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MURID" && !user.isFounder) {
    redirect("/guru/beranda");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <MuridSidebar
        user={{
          id: user.id,
          fullName: user.fullName,
          avatar: user.avatar,
          isPremium: user.isPremium,
          isFounder: user.isFounder,
          xp: user.xp,
          level: user.level,
          streak: user.streak,
          league: user.league,
        }}
      />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
      <AIFloatingButton />
    </div>
  );
}
