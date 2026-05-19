import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { GuruSidebar } from "@/components/dashboard/GuruSidebar";

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "GURU" && !user.isFounder) {
    redirect("/murid/beranda");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuruSidebar
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
    </div>
  );
}
